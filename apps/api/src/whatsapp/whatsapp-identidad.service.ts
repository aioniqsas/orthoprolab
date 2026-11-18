import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { hashTelefono, normalizeTelefono } from './normalize-telefono.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import type { WhatsappContactoEstado } from './whatsapp-contacto.entity.js';

export type ResolverContactoMotivo =
  | 'telefono_invalido'
  | 'no_autorizado'
  | 'no_verificado';

/** Discriminated result: `ok` decides whether `contacto` exists. */
export type ResolverContactoResultado =
  | {
      ok: true;
      contacto: {
        id: string;
        clinicaId: string;
        doctorId: string | null;
        estado: WhatsappContactoEstado;
      };
    }
  | { ok: false; motivo: ResolverContactoMotivo };

export interface RegistrarContactoInput {
  telefono: string;
  clinicaId: string;
  doctorId?: string | null;
  notas?: string;
  /** 'pendiente' unless the caller explicitly verifies (S1). */
  estado?: WhatsappContactoEstado;
}

/**
 * Unique violation on `telefono_hash` as a typed error: T3 answers 409 with
 * this code, never the raw Postgres message (T1 adversarial round).
 */
export class ContactoDuplicadoError extends ConflictException {
  readonly code = 'contacto_duplicado';

  constructor() {
    super('Ese número ya está registrado como contacto de WhatsApp.');
  }
}

const UNIQUE_VIOLATION = '23505';
// Only this index means "same phone twice": any other unique violation on
// whatsapp_contacto must reach the caller untouched.
const INDICE_TELEFONO_HASH = 'uq_whatsapp_contacto_telefono_hash';

type ErrorPostgres = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
  driverError?: ErrorPostgres;
};

const esDuplicadoTelefonoHash = (e: unknown): boolean => {
  const error = e as ErrorPostgres | null;
  if (!error) return false;
  const fuentes = [error, error.driverError];
  if (!fuentes.some((f) => f?.code === UNIQUE_VIOLATION)) return false;
  // TypeORM puts constraint on the driver error; some paths only carry the
  // index name inside detail (or the message that quotes it).
  return fuentes.some((f) =>
    [f?.constraint, f?.detail, f?.message].some(
      (texto) =>
        typeof texto === 'string' && texto.includes(INDICE_TELEFONO_HASH),
    ),
  );
};

/**
 * The bot's identity question (S1/S2/S3): given a raw number, is it a
 * verified contact, and which clinic/doctor does it represent?
 */
@Injectable()
export class WhatsappIdentidadService {
  constructor(
    @InjectRepository(WhatsappContacto)
    private readonly contactos: Repository<WhatsappContacto>,
    @InjectRepository(Clinica)
    private readonly clinicas: Repository<Clinica>,
    @InjectRepository(Doctor)
    private readonly doctores: Repository<Doctor>,
  ) {}

  /**
   * Never throws for bad input: a bot message always gets a `motivo`.
   * Failures carry no clinic/doctor data at all, so the caller cannot leak
   * another clinic's scope (S3).
   */
  async resolverContacto(
    telefonoCrudo: string,
  ): Promise<ResolverContactoResultado> {
    let canonical: string;
    try {
      canonical = normalizeTelefono(telefonoCrudo);
    } catch {
      return { ok: false, motivo: 'telefono_invalido' };
    }

    // One canonical hash for all nine input formats, same value the entity
    // hook writes on save.
    const contacto = await this.contactos.findOneBy({
      telefonoHash: hashTelefono(canonical),
    });
    if (!contacto) {
      // Blocked and unknown answer identically: no enumeration of the
      // allowlist from outside (S1/S3).
      return { ok: false, motivo: 'no_autorizado' };
    }
    switch (contacto.estado) {
      case 'verificado':
        return {
          ok: true,
          contacto: {
            id: contacto.id,
            clinicaId: contacto.clinicaId,
            doctorId: contacto.doctorId,
            estado: contacto.estado,
          },
        };
      case 'pendiente':
        // NOT authorized, but the OTP flow must still tell this user their
        // number is registered and awaiting verification (S1).
        return { ok: false, motivo: 'no_verificado' };
      default:
        // estado has no CHECK in the DB: only the exact 'verificado'
        // authorizes; 'Verificado', trailing spaces, NULL or any unknown
        // string fall through to no_autorizado.
        return { ok: false, motivo: 'no_autorizado' };
    }
  }

  /**
   * Pre-registration by someone with authority (S1). The phone changes only
   * through save(): Repository.update() would skip the hooks and leave a
   * stale telefono_hash (T1 adversarial round).
   */
  async registrarContacto(input: RegistrarContactoInput): Promise<WhatsappContacto> {
    const canonical = normalizeTelefono(input.telefono);

    const clinica = await this.clinicas.findOneBy({ id: input.clinicaId });
    if (!clinica) {
      // Ids stay out of the message: it may be echoed back to the caller.
      throw new NotFoundException('Clínica no encontrada.');
    }

    if (input.doctorId != null) {
      // Scoped query: a doctor of ANOTHER clinic answers "not found", its
      // existence is never disclosed (S3).
      const doctor = await this.doctores.findOneBy({
        id: input.doctorId,
        clinicaId: input.clinicaId,
      });
      if (!doctor) {
        throw new NotFoundException('Doctor no encontrado.');
      }
    }

    const estado = input.estado ?? 'pendiente';
    const contacto = this.contactos.create({
      telefonoCifrado: canonical,
      clinicaId: input.clinicaId,
      doctorId: input.doctorId ?? null,
      estado,
      verificadoEn: estado === 'verificado' ? new Date() : null,
      notas: input.notas ?? null,
    });

    try {
      // save() runs the hooks: canonical hash + column encryption.
      return await this.contactos.save(contacto);
    } catch (e) {
      if (esDuplicadoTelefonoHash(e)) {
        throw new ContactoDuplicadoError();
      }
      throw e;
    }
  }
}
