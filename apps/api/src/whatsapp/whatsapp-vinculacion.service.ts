import { createHash, randomInt } from 'node:crypto';
import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import type { Repository } from 'typeorm';
import type { EnvConfig } from '../config/env.validation.js';
import { THROTTLER_REDIS } from '../security/redis-throttler.storage.js';
import { hashTelefono, normalizeTelefono } from './normalize-telefono.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import { WhatsappSesionAuditoria } from './whatsapp-sesion-auditoria.entity.js';
import { verificarFirma } from './whatsapp-firma.js';
import { WhatsappIdentidadService } from './whatsapp-identidad.service.js';

/** Vida del código de vinculación (T8): 10 minutos. */
export const CODIGO_TTL_SEGUNDOS = 600;
/** Canjes errados tolerados por teléfono dentro de la ventana antes de bloquear. */
export const MAX_INTENTOS = 5;
const VENTANA_INTENTOS = CODIGO_TTL_SEGUNDOS;

/** Contrato de respuesta al portal (T8): el código se muestra una sola vez. */
export interface CodigoVinculacion {
  codigo: string;
  expiraEnSegundos: number;
}

/** Resultado del canje: el bot responde lo mismo ante cualquier `ok: false`. */
export type ResultadoVinculacion =
  | { ok: true; clinicaId: string; contactoId: string }
  | { ok: false; motivo: 'codigo_invalido' | 'limitada' | 'rechazado' };

const sha256 = (texto: string): string =>
  createHash('sha256').update(texto).digest('hex');

/**
 * OTP de vinculación número ↔ clínica (T8, S1). El portal emite; el bot canjea
 * con las mismas cabeceras blindadas del resto de endpoints internos (S10).
 * Solo Redis: el código se guarda como hash SHA-256 con TTL, nunca en claro ni
 * en la base; emitir un código nuevo invalida el anterior de la clínica.
 * La auditoría registra intención y resultado, jamás el código o el teléfono.
 */
@Injectable()
export class WhatsappVinculacionService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    @InjectRepository(WhatsappContacto)
    private readonly contactos: Repository<WhatsappContacto>,
    @InjectRepository(WhatsappSesionAuditoria)
    private readonly auditoria: Repository<WhatsappSesionAuditoria>,
    @Inject(THROTTLER_REDIS)
    @Optional()
    private readonly redis: Redis = undefined as never,
    private readonly identidad: WhatsappIdentidadService,
  ) {}

  /** Emisión desde el portal autenticado: la clínica viene de la sesión (S1). */
  async emitirCodigo(clinicaId: string): Promise<CodigoVinculacion> {
    if (!this.redis) {
      throw new ServiceUnavailableException(
        'La vinculación de WhatsApp no está disponible en este momento.',
      );
    }
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const hashCodigo = sha256(codigo);

    // Un código canjeable por clínica: el nuevo invalida el anterior.
    const previo = await this.redis.get(`whatsapp:otp:clinica:${clinicaId}`);
    if (previo) await this.redis.del(`whatsapp:otp:codigo:${previo}`);
    await this.redis.set(
      `whatsapp:otp:codigo:${hashCodigo}`,
      clinicaId,
      'EX',
      CODIGO_TTL_SEGUNDOS,
    );
    await this.redis.set(
      `whatsapp:otp:clinica:${clinicaId}`,
      hashCodigo,
      'EX',
      CODIGO_TTL_SEGUNDOS,
    );
    await this.auditar('codigo_emitido', clinicaId, null);
    return { codigo, expiraEnSegundos: CODIGO_TTL_SEGUNDOS };
  }

  /** Canje desde el bot: token de servicio + HMAC por solicitud (S10). */
  async vincular(
    telefono: unknown,
    token: string | undefined,
    firma: { timestamp?: string; nonce?: string; signature?: string },
    codigo: string,
  ): Promise<ResultadoVinculacion> {
    const service = this.config.get('WHATSAPP_SERVICE_TOKEN', { infer: true });
    const hmacSecret = this.config.get('WHATSAPP_HMAC_SECRET', { infer: true });
    if (!service || !hmacSecret || !this.redis) {
      throw new ServiceUnavailableException(
        'La vinculación de WhatsApp no está disponible en este momento.',
      );
    }
    // Misma capa 2 que sesión/llamada/auditoría: sin firma válida no se toca nada.
    await verificarFirma(
      { telefono, token, ...firma },
      service,
      hmacSecret,
      this.redis,
    );
    return this.canjear(typeof telefono === 'string' ? telefono : '', codigo);
  }

  /** Lógica de canje, separada de la firma para poder probarla con fakes. */
  private async canjear(
    telefonoCrudo: string,
    codigo: string,
  ): Promise<ResultadoVinculacion> {
    let canonical: string | null = null;
    try {
      canonical = normalizeTelefono(telefonoCrudo);
    } catch {
      canonical = null;
    }
    // Ventana de intentos ANTES de validar el teléfono (ronda adversarial de
    // T8): un teléfono malformado no puede sondear códigos sin quemar
    // intentos. Clave canónica cuando el teléfono se puede normalizar; sobre
    // la entrada cruda (sha256) si no, para que ninguna ruta escape el límite.
    const claveIntentos = canonical
      ? `whatsapp:otp:intentos:${hashTelefono(canonical)}`
      : `whatsapp:otp:intentos:cruda:${sha256(telefonoCrudo)}`;
    const intentos = await this.redis.incr(claveIntentos);
    if (intentos === 1)
      await this.redis.expire(claveIntentos, VENTANA_INTENTOS);
    if (intentos > MAX_INTENTOS) {
      await this.auditar('limitada', null, null);
      return { ok: false, motivo: 'limitada' };
    }
    if (!canonical) {
      await this.auditar('rechazado', null, null);
      return { ok: false, motivo: 'codigo_invalido' };
    }
    const telefonoHash = hashTelefono(canonical);

    // PTTL + GETDEL: el código es de un solo uso incluso ante canjes
    // concurrentes, pero conservamos el TTL restante para restaurarlo si la
    // escritura del vínculo falla: un fallo técnico no quema el código.
    const hashCodigo = sha256(String(codigo ?? ''));
    const claveCodigo = `whatsapp:otp:codigo:${hashCodigo}`;
    const ttlRestanteMs = await this.redis.pttl(claveCodigo);
    const clinicaId = await this.redis.getdel(claveCodigo);
    if (clinicaId) await this.redis.del(`whatsapp:otp:clinica:${clinicaId}`);
    if (!clinicaId) {
      await this.auditar('rechazada_codigo', null, null);
      return { ok: false, motivo: 'codigo_invalido' };
    }
    const restaurarCodigo = async (): Promise<void> => {
      if (ttlRestanteMs > 0)
        await this.redis.set(claveCodigo, clinicaId, 'PX', ttlRestanteMs);
    };

    try {
      const contacto = await this.contactos.findOneBy({ telefonoHash });
      if (contacto) {
        if (contacto.estado === 'verificado') {
          // Nunca se roba un contacto ya verificado de otra clínica (T8).
          await this.auditar('rechazada_ya_verificado', clinicaId, contacto.id);
          return { ok: false, motivo: 'rechazado' };
        }
        if (contacto.estado !== 'pendiente') {
          // 'bloqueado' o valor desconocido: solo 'verificado' autoriza (S1).
          await this.auditar('rechazada_bloqueado', clinicaId, contacto.id);
          return { ok: false, motivo: 'rechazado' };
        }
        // Pendiente: se mueve a la clínica del código. Si cambia de clínica,
        // el doctor de la anterior ya no aplica (S2). save() para el hook del hash.
        contacto.clinicaId = clinicaId;
        contacto.doctorId = null;
        contacto.estado = 'verificado';
        contacto.verificadoEn = new Date();
        await this.contactos.save(contacto);
        await this.redis.del(`whatsapp:otp:intentos:${telefonoHash}`);
        await this.auditar('vinculada', clinicaId, contacto.id);
        return { ok: true, clinicaId, contactoId: contacto.id };
      }

      // Número nuevo: se registra directamente verificado (S1b, auto-vinculación).
      const creado = await this.identidad.registrarContacto({
        telefono: canonical,
        clinicaId,
        estado: 'verificado',
        notas: 'Vinculado con código desde el bot',
      });
      await this.redis.del(`whatsapp:otp:intentos:${telefonoHash}`);
      await this.auditar('vinculada', clinicaId, creado.id);
      return { ok: true, clinicaId, contactoId: creado.id };
    } catch {
      // Fallo técnico (escritura del vínculo): se restaura el código con su
      // TTL restante y se distingue del rechazo por política en la auditoría.
      await restaurarCodigo();
      await this.auditar('fallo_tecnico', clinicaId, null);
      return { ok: false, motivo: 'rechazado' };
    }
  }

  /** Auditoría sin datos personales: intención, clínica/contacto y resultado. */
  private async auditar(
    resultado: string,
    clinicaId: string | null,
    contactoId: string | null,
  ): Promise<void> {
    await this.auditoria
      .save({
        clinicaId,
        contactoId,
        intencion: 'vinculacion',
        paso: 'vinculacion',
        resultado,
      } as never)
      .catch(() => undefined);
  }
}
