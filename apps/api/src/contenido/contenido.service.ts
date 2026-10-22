import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CatalogoEventosService } from '../catalogo/catalogo-eventos.service.js';
import { ContenidoWeb } from './contenido.entity.js';
import {
  CONTENIDO_CAMPOS,
  CONTENIDO_GRUPOS,
  IMAGENES_DISPONIBLES,
  MAX_PARRAFO,
  MAX_TEXTO,
  type ContenidoCampo,
} from './contenido.schema.js';

/** A schema field plus the stored value; `null` means "the site's default applies". */
export type ContenidoCampoAdmin = ContenidoCampo & { valor: string | null };

export interface ContenidoGrupoAdmin {
  grupo: string;
  campos: ContenidoCampoAdmin[];
}

/** The single shape returned by both admin endpoints. */
export interface ContenidoAdmin {
  grupos: ContenidoGrupoAdmin[];
  /** Allowed values for the `imagen` fields, for the admin's image selector. */
  imagenes: string[];
}

@Injectable()
export class ContenidoService {
  constructor(
    @InjectRepository(ContenidoWeb)
    private readonly contenido: Repository<ContenidoWeb>,
    private readonly eventos: CatalogoEventosService,
  ) {}

  // --- public ---------------------------------------------------------------

  /** Only the keys actually saved: the site keeps its own literal for the rest. */
  async mapaPublico(): Promise<Record<string, string>> {
    const rows = await this.contenido.find();
    return Object.fromEntries(rows.map((row) => [row.clave, row.valor]));
  }

  // --- admin ----------------------------------------------------------------

  async listAdmin(): Promise<ContenidoAdmin> {
    const rows = await this.contenido.find();
    const guardados = new Map(rows.map((row) => [row.clave, row.valor]));
    return {
      grupos: CONTENIDO_GRUPOS.map((grupo) => ({
        grupo: grupo.grupo,
        campos: grupo.campos.map((campo) => ({
          ...campo,
          valor: guardados.get(campo.clave) ?? null,
        })),
      })),
      imagenes: IMAGENES_DISPONIBLES,
    };
  }

  /**
   * Saves a batch: an empty value deletes the row (back to the site's default).
   * The whole batch is validated before writing, so a rejected value leaves the
   * stored content untouched.
   */
  async guardar(valores: Record<string, string>): Promise<ContenidoAdmin> {
    const campos = new Map<string, ContenidoCampo>(
      CONTENIDO_CAMPOS.map((campo) => [campo.clave, campo]),
    );
    const entradas = Object.entries(valores);

    const desconocidas = entradas
      .map(([clave]) => clave)
      .filter((clave) => !campos.has(clave));
    if (desconocidas.length > 0) {
      throw new BadRequestException(
        `Claves de contenido desconocidas: ${desconocidas.join(', ')}.`,
      );
    }
    for (const [clave, valor] of entradas) {
      const campo = campos.get(clave);
      if (campo) this.validar(campo, valor);
    }

    const borrar = entradas
      .filter(([, valor]) => valor === '')
      .map(([clave]) => clave);
    const guardar = entradas
      .filter(([, valor]) => valor !== '')
      .map(([clave, valor]) => this.contenido.create({ clave, valor }));

    if (borrar.length > 0) await this.contenido.delete(borrar);
    if (guardar.length > 0) await this.contenido.save(guardar);

    this.eventos.emitir('contenido');
    return this.listAdmin();
  }

  // --- helpers --------------------------------------------------------------

  /** Contract checks for one value: length by tipo and the image allow list. */
  private validar(campo: ContenidoCampo, valor: string): void {
    if (valor === '') return;
    if (campo.tipo === 'texto' && valor.length > MAX_TEXTO) {
      throw new BadRequestException(
        `"${campo.etiqueta}" no puede superar los ${MAX_TEXTO} caracteres.`,
      );
    }
    if (campo.tipo === 'parrafo' && valor.length > MAX_PARRAFO) {
      throw new BadRequestException(
        `"${campo.etiqueta}" no puede superar los ${MAX_PARRAFO} caracteres.`,
      );
    }
    if (campo.tipo === 'imagen' && !IMAGENES_DISPONIBLES.includes(valor)) {
      throw new BadRequestException(
        `"${campo.etiqueta}" debe ser una de las imágenes disponibles.`,
      );
    }
  }
}
