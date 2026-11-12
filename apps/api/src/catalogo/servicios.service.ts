import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { Redis } from 'ioredis';
import { CatalogoEventosService } from './catalogo-eventos.service.js';
import type {
  CreateServicioDto,
  UpdateServicioDto,
} from './dto/servicio.dto.js';
import { detectImageType } from './image-validation.js';
import {
  IMAGE_STORAGE,
  ImageStorageNotConfiguredError,
  isCloudinaryUrl,
  type ImageStorage,
} from './image-storage.js';
import { Servicio } from './servicio.entity.js';
import { slugify, uniqueSlug } from './slug.js';
import { PDF_REDIS, invalidatePdfCache } from './pdf-cache.js';
import { patronBusqueda, sinAcentosSql } from '../common/busqueda.js';

/** The ONLY fields the public catalog exposes: never price, state or internals. */
export interface ServicioPublico {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
}

/** ServicioPublico plus price, used internally by PdfService only (never sent over HTTP in plain text). */
export type ServicioParaPdf = ServicioPublico & { precio: string };

/** Admin representation: everything except the internal Cloudinary asset id. */
export interface ServicioAdmin extends ServicioPublico {
  precio: string;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export type RemoveResult =
  { kind: 'deleted' } | { kind: 'deactivated'; servicio: ServicioAdmin };

export const toPublico = (s: Servicio): ServicioPublico => ({
  id: s.id,
  slug: s.slug,
  nombre: s.nombre,
  descripcion: s.descripcion,
  imagenUrl: s.imagenUrl,
});

export const toParaPdf = (s: Servicio): ServicioParaPdf => ({
  ...toPublico(s),
  precio: s.precio,
});

export const toAdmin = (s: Servicio): ServicioAdmin => ({
  ...toPublico(s),
  precio: s.precio,
  activo: s.activo,
  fechaCreacion: s.fechaCreacion,
  fechaActualizacion: s.fechaActualizacion,
});

const UNIQUE_VIOLATION = '23505';
const isUniqueViolation = (e: unknown): boolean =>
  (e as { driverError?: { code?: string } } | null)?.driverError?.code ===
  UNIQUE_VIOLATION;

@Injectable()
export class ServiciosService {
  private readonly logger = new Logger(ServiciosService.name);

  constructor(
    @InjectRepository(Servicio)
    private readonly servicios: Repository<Servicio>,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
    @Optional() @Inject(PDF_REDIS) private readonly pdfRedis: Redis | null,
    private readonly eventos: CatalogoEventosService,
  ) {}

  // --- public ---------------------------------------------------------------

  async listPublic(): Promise<ServicioPublico[]> {
    const rows = await this.servicios.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    return rows.map(toPublico);
  }

  async findPublicBySlug(slug: string): Promise<ServicioPublico> {
    const row = await this.servicios.findOneBy({ slug, activo: true });
    if (!row) throw new NotFoundException('Servicio no encontrado.');
    return toPublico(row);
  }

  /** Internal: all active services WITH precio. Used by PdfService only. */
  async findAllForPdf(): Promise<ServicioParaPdf[]> {
    const rows = await this.servicios.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    return rows.map(toParaPdf);
  }

  // --- admin ----------------------------------------------------------------

  async listAdmin(q?: string): Promise<ServicioAdmin[]> {
    const qb = this.servicios.createQueryBuilder('s').orderBy('s.nombre', 'ASC');
    const patron = patronBusqueda(q);
    if (patron) {
      qb.andWhere(
        `(${sinAcentosSql('s.nombre')} LIKE :patron ESCAPE '\\' OR ${sinAcentosSql('s.descripcion')} LIKE :patron ESCAPE '\\')`,
        { patron },
      );
    }
    const rows = await qb.getMany();
    return rows.map(toAdmin);
  }

  async getAdmin(id: string): Promise<ServicioAdmin> {
    return toAdmin(await this.getOrFail(id));
  }

  async create(dto: CreateServicioDto): Promise<ServicioAdmin> {
    // The slug is generated once and never changes (stable public URLs).
    const slug = await uniqueSlug(slugify(dto.nombre), (s) =>
      this.servicios.existsBy({ slug: s }),
    );
    const entity = this.servicios.create({
      slug,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      precio: dto.precio,
      activo: dto.activo ?? true,
    });
    const result = toAdmin(await this.saveOrConflict(entity));
    await this.invalidatePdf();
    this.eventos.emitir('creado');
    return result;
  }

  async update(id: string, dto: UpdateServicioDto): Promise<ServicioAdmin> {
    const row = await this.getOrFail(id);
    if (dto.nombre !== undefined) row.nombre = dto.nombre;
    if (dto.descripcion !== undefined) row.descripcion = dto.descripcion;
    if (dto.precio !== undefined) row.precio = dto.precio;
    if (dto.activo !== undefined) row.activo = dto.activo;
    const result = toAdmin(await this.saveOrConflict(row));
    await this.invalidatePdf();
    this.eventos.emitir('actualizado');
    return result;
  }

  /**
   * Delete rule: a service referenced by any detalle_orden row is only
   * deactivated (activo = false, the row and its history stay); otherwise it
   * is physically deleted and its Cloudinary image removed (best effort).
   */
  async remove(id: string): Promise<RemoveResult> {
    const row = await this.getOrFail(id);
    // Order lines store the work as free text, so nothing references the
    // catalog anymore: deleting never leaves dangling history.
    await this.servicios.remove(row);
    await this.deleteAssetQuietly(row.imagenPublicId);
    await this.invalidatePdf();
    this.eventos.emitir('eliminado');
    return { kind: 'deleted' };
  }

  async setImage(id: string, buffer: Buffer): Promise<ServicioAdmin> {
    const row = await this.getOrFail(id);
    if (buffer.length === 0) {
      throw new BadRequestException('La imagen esta vacia.');
    }
    if (detectImageType(buffer) === null) {
      throw new BadRequestException('La imagen debe ser JPEG, PNG o WebP.');
    }
    let uploaded: { url: string; publicId: string };
    try {
      uploaded = await this.storage.upload(buffer, { publicIdHint: row.slug });
    } catch (e) {
      if (!(e instanceof ImageStorageNotConfiguredError)) {
        this.logger.error(
          `Image upload failed (${e instanceof Error ? e.name : 'unknown'})`,
        );
      }
      throw new ServiceUnavailableException(
        e instanceof ImageStorageNotConfiguredError
          ? 'La carga de imagenes no esta configurada.'
          : 'No pudimos guardar la imagen. Intentalo de nuevo mas tarde.',
      );
    }
    if (!isCloudinaryUrl(uploaded.url)) {
      await this.deleteAssetQuietly(uploaded.publicId);
      throw new ServiceUnavailableException(
        'No pudimos guardar la imagen. Intentalo de nuevo mas tarde.',
      );
    }
    const previous = row.imagenPublicId;
    row.imagenUrl = uploaded.url;
    row.imagenPublicId = uploaded.publicId;
    const saved = await this.servicios.save(row);
    await this.deleteAssetQuietly(previous);
    await this.invalidatePdf();
    this.eventos.emitir('imagen');
    return toAdmin(saved);
  }

  // --- helpers --------------------------------------------------------------

  private async getOrFail(id: string): Promise<Servicio> {
    const row = await this.servicios.findOneBy({ id });
    if (!row) throw new NotFoundException('Servicio no encontrado.');
    return row;
  }

  private async saveOrConflict(entity: Servicio): Promise<Servicio> {
    try {
      return await this.servicios.save(entity);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('Ya existe un servicio con ese nombre.');
      }
      throw e;
    }
  }

  /** Best effort: a failed cleanup is logged and never fails the request. */
  private async deleteAssetQuietly(publicId: string | null): Promise<void> {
    if (!publicId) return;
    try {
      await this.storage.delete(publicId);
    } catch (e) {
      this.logger.warn(
        `Could not delete image asset (${e instanceof Error ? e.name : 'unknown'})`,
      );
    }
  }

  /** Best effort PDF cache invalidation — never fails the calling mutation. */
  private async invalidatePdf(): Promise<void> {
    if (!this.pdfRedis) return;
    await invalidatePdfCache(this.pdfRedis).catch(() => {});
  }
}
