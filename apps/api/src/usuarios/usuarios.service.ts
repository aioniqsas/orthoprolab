import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { cedulaHash } from '../crypto/cedula.js';
import { PasswordService } from '../crypto/password.service.js';
import { MailerAuthService } from '../auth/mailer-auth.service.js';
import { Clinica } from './clinica.entity.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { Rol } from './rol.entity.js';
import { Usuario } from './usuario.entity.js';
import { patronBusqueda, sinAcentosSql } from '../common/busqueda.js';

const PASSWORD_CHARS =
  'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';

function generatePassword(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length])
    .join('');
}

export interface UsuarioPublico {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  activo: boolean;
  fechaCreacion: Date;
  rol: { id: string; nombre: string };
  clinica: { id: string; nombre: string } | null;
  cedulaEnmascarada?: string;
}

function maskCedula(cedula: string): string {
  const digits = cedula.replace(/\D/g, '');
  if (digits.length <= 3) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 3) + digits.slice(-3);
}

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    private readonly passwordService: PasswordService,
    private readonly mailerAuth: MailerAuthService,
  ) {}

  async findAll(q?: string): Promise<UsuarioPublico[]> {
    const qb = this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.rol', 'rol')
      .leftJoinAndSelect('u.clinica', 'clinica')
      .select([
        'u.id',
        'u.nombres',
        'u.apellidos',
        'u.correo',
        'u.activo',
        'u.fechaCreacion',
        'rol.id',
        'rol.nombre',
        'clinica.id',
        'clinica.nombre',
      ])
      .orderBy('u.apellidos', 'ASC')
      .addOrderBy('u.nombres', 'ASC');
    const patron = patronBusqueda(q);
    if (patron) {
      qb.andWhere(
        `(${sinAcentosSql("u.nombres || ' ' || u.apellidos")} LIKE :patron ESCAPE '\\' OR ${sinAcentosSql('u.correo')} LIKE :patron ESCAPE '\\')`,
        { patron },
      );
    }
    const usuarios = await qb.getMany();

    return usuarios.map((u) => ({
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
        correo: u.correo,
        activo: u.activo,
        fechaCreacion: u.fechaCreacion,
        rol: { id: u.rol.id, nombre: u.rol.nombre },
        clinica: u.clinica ? { id: u.clinica.id, nombre: u.clinica.nombre } : null,
      }));
  }

  async findOne(id: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.rol', 'rol')
      .leftJoinAndSelect('u.clinica', 'clinica')
      .select([
        'u.id',
        'u.nombres',
        'u.apellidos',
        'u.correo',
        'u.cedula',
        'u.activo',
        'u.fechaCreacion',
        'rol.id',
        'rol.nombre',
        'clinica.id',
        'clinica.nombre',
      ])
      .where('u.id = :id', { id })
      .getOne();

    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    return {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      activo: usuario.activo,
      fechaCreacion: usuario.fechaCreacion,
      rol: { id: usuario.rol.id, nombre: usuario.rol.nombre },
      clinica: usuario.clinica
        ? { id: usuario.clinica.id, nombre: usuario.clinica.nombre }
        : null,
      cedulaEnmascarada: maskCedula(usuario.cedula ?? ''),
    };
  }

  async create(dto: CreateUsuarioDto): Promise<UsuarioPublico> {
    const rol = await this.rolRepo.findOneBy({ nombre: dto.rol });
    if (!rol) {
      throw new BadRequestException(`Rol '${dto.rol}' no encontrado`);
    }

    const rawPassword = generatePassword();
    const passwordHash = await this.passwordService.hash(rawPassword);
    const hash = cedulaHash(dto.cedula);

    const exists = await this.usuarioRepo
      .createQueryBuilder('u')
      .where('lower(u.correo) = :correo', {
        correo: dto.correo.toLowerCase(),
      })
      .orWhere('u.cedulaHash = :hash', { hash })
      .getExists();

    if (exists) {
      throw new ConflictException('El correo o la cédula ya está en uso');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const clinicaId =
        dto.rol === 'clinica' && dto.clinicaId !== undefined
          ? String(dto.clinicaId)
          : null;

      const usuario = await manager.save(
        manager.create(Usuario, {
          cedula: dto.cedula,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo,
          passwordHash,
          rolId: rol.id,
          clinicaId,
          activo: true,
        }),
      );

      let clinica: { id: string; nombre: string } | null = null;
      if (clinicaId) {
        const cli = await manager.findOneBy(Clinica, { id: clinicaId });
        clinica = cli ? { id: cli.id, nombre: cli.nombre } : null;
      }

      return {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        activo: usuario.activo,
        fechaCreacion: usuario.fechaCreacion,
        rol: { id: rol.id, nombre: rol.nombre },
        clinica,
      };
    });

    const { sent, error } = await this.mailerAuth.sendWelcome(
      dto.correo,
      `${dto.nombres} ${dto.apellidos}`,
      dto.correo,
      rawPassword,
    );
    if (!sent) {
      this.logger.warn(
        `Welcome email not sent for user ${result.id}: ${error ?? 'unknown'}`,
      );
    }

    return result;
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    if (dto.nombres !== undefined) usuario.nombres = dto.nombres;
    if (dto.apellidos !== undefined) usuario.apellidos = dto.apellidos;
    if (dto.activo !== undefined) usuario.activo = dto.activo;

    if (dto.correo !== undefined) {
      const taken = await this.usuarioRepo
        .createQueryBuilder('u')
        .where('lower(u.correo) = :correo AND u.id != :id', {
          correo: dto.correo.toLowerCase(),
          id,
        })
        .getExists();
      if (taken) throw new ConflictException('El correo ya está en uso');
      usuario.correo = dto.correo;
    }

    if ('clinicaId' in dto) {
      usuario.clinicaId =
        dto.clinicaId != null ? String(dto.clinicaId) : null;
    }

    await this.usuarioRepo.save(usuario);
    return this.findOne(id);
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
  ): Promise<{ ok: true }> {
    const usuario = await this.usuarioRepo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    usuario.passwordHash = await this.passwordService.hash(dto.nuevaPassword);
    await this.usuarioRepo.save(usuario);
    return { ok: true };
  }

  /** Generates a new random password, stores its hash, and sends a welcome email. */
  async regenerarCredenciales(id: string): Promise<{ ok: true }> {
    const usuario = await this.usuarioRepo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    const rawPassword = generatePassword();
    usuario.passwordHash = await this.passwordService.hash(rawPassword);
    await this.usuarioRepo.save(usuario);

    const { sent, error } = await this.mailerAuth.sendWelcome(
      usuario.correo,
      `${usuario.nombres} ${usuario.apellidos}`,
      usuario.correo,
      rawPassword,
    );
    if (!sent) {
      this.logger.warn(
        `Credentials email not sent for user ${id}: ${error ?? 'unknown'}`,
      );
    }

    return { ok: true };
  }
}
