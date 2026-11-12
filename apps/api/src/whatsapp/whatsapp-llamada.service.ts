import { createHash } from 'node:crypto';
import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { EnvConfig } from '../config/env.validation.js';
import { MailQueueService } from '../queues/mail-queue.service.js';
import { THROTTLER_REDIS } from '../security/redis-throttler.storage.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { INTENCIONES_AUDITORIA } from './dto/whatsapp-llamada.dto.js';
import { normalizeTelefono } from './normalize-telefono.js';
import { verificarFirma } from './whatsapp-firma.js';
import { WhatsappIdentidadService } from './whatsapp-identidad.service.js';
import { WhatsappLlamada } from './whatsapp-llamada.entity.js';
import { WhatsappSesionAuditoria, type WhatsappSesionResultado } from './whatsapp-sesion-auditoria.entity.js';

const NO_CONFIG = 'La solicitud de llamada del bot no está configurada.';
const NO = 'Este número no está habilitado para el bot de WhatsApp.';
const LIMIT = 'Límite de solicitudes de llamada excedido.';

/** Tope diario de solicitudes de llamada por contacto (T7). */
export const MAX_LLAMADAS_POR_DIA = 5;

const INTENCIONES = new Set<string>(INTENCIONES_AUDITORIA);

/**
 * La opción 0 del bot (T7, S5) y la auditoría de intenciones (S8): endpoints
 * internos con el mismo blindaje del de sesión (S10) vía verificarFirma.
 * La solicitud queda grabada aunque la cola de correo falle; el bot nunca
 * se bloquea por la notificación.
 */
@Injectable()
export class WhatsappLlamadaService {
  private readonly logger = new Logger(WhatsappLlamadaService.name);

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly identidad: WhatsappIdentidadService,
    @InjectRepository(Clinica) private readonly clinicas: Repository<Clinica>,
    @InjectRepository(WhatsappSesionAuditoria) private readonly auditoria: Repository<WhatsappSesionAuditoria>,
    @InjectRepository(WhatsappLlamada) private readonly llamadas: Repository<WhatsappLlamada>,
    private readonly correo: MailQueueService,
    @Inject(THROTTLER_REDIS) @Optional() private readonly redis: Redis = undefined as never,
  ) {}

  /** Audita la interacción; nunca guarda teléfono, cuerpo ni firma. */
  private async auditar(fila: Partial<WhatsappSesionAuditoria>): Promise<void> {
    await this.auditoria.save(fila as never).catch(() => undefined);
  }

  /** Tag del emisor: sha256 del teléfono canónico, truncado. Nunca el número. */
  private emisorTag(telefono: string): string {
    return createHash('sha256').update(normalizeTelefono(telefono)).digest('hex').slice(0, 16);
  }

  async registrarLlamada(telefono: unknown, token: string | undefined, timestamp?: string, nonce?: string, signature?: string): Promise<void> {
    const service = this.config.get('WHATSAPP_SERVICE_TOKEN', { infer: true });
    const hmacSecret = this.config.get('WHATSAPP_HMAC_SECRET', { infer: true });
    const labEmail = this.config.get('WHATSAPP_LAB_EMAIL', { infer: true });
    if (!service || !hmacSecret) throw new ServiceUnavailableException(NO_CONFIG);
    // Sin Redis no hay nonce de un solo uso ni tope diario: falla cerrado.
    if (!this.redis) throw new ServiceUnavailableException(NO_CONFIG);
    await verificarFirma({ telefono, token, timestamp, nonce, signature }, service, hmacSecret, this.redis);
    const resultado = await this.identidad.resolverContacto(typeof telefono === 'string' ? telefono : '');
    if (!resultado.ok) {
      await this.auditar({ intencion: 'llamada', paso: 'menu', resultado: `rechazada_${resultado.motivo}` });
      throw new ForbiddenException(NO);
    }
    // Tope diario por contacto; un intento denegado no consume cupo.
    const dia = await this.redis.incr(`whatsapp:llamada:${resultado.contacto.id}:day`);
    if (dia === 1) await this.redis.expire(`whatsapp:llamada:${resultado.contacto.id}:day`, 86_400);
    if (dia > MAX_LLAMADAS_POR_DIA) {
      await this.redis.decr(`whatsapp:llamada:${resultado.contacto.id}:day`);
      await this.auditar({ contactoId: resultado.contacto.id, clinicaId: resultado.contacto.clinicaId, intencion: 'llamada', paso: 'menu', resultado: 'limitada' });
      throw new HttpException(LIMIT, HttpStatus.TOO_MANY_REQUESTS);
    }
    const clinica = await this.clinicas.findOneBy({ id: resultado.contacto.clinicaId });
    // La fila primero: la solicitud vale aunque la cola o el correo fallen.
    await this.llamadas.save({
      contactoId: resultado.contacto.id,
      clinicaId: resultado.contacto.clinicaId,
      motivo: 'devolucion',
      atendida: false,
    });
    await this.auditar({
      contactoId: resultado.contacto.id,
      clinicaId: resultado.contacto.clinicaId,
      intencion: 'llamada',
      paso: 'menu',
      resultado: 'llamada',
      emisorTag: this.emisorTag(typeof telefono === 'string' ? telefono : ''),
    });
    // Notificación al laboratorio: clínica y contacto, sin datos de pacientes.
    // La solicitud ya quedó registrada, así que sin correo configurado no se pierde: se avisa en el log.
    if (!labEmail) {
      this.logger.warn('WHATSAPP_LAB_EMAIL sin configurar: la solicitud quedó registrada sin notificar.');
      return;
    }
    await this.correo
      .enqueue({
        to: labEmail,
        subject: 'Solicitud de llamada desde el bot de WhatsApp',
        text: `La clínica ${clinica?.nombre ?? resultado.contacto.clinicaId} (contacto ${resultado.contacto.id}) pidió que el laboratorio la llame por WhatsApp.`,
      })
      .catch(() => undefined);
  }

  async registrarIntencion(telefono: unknown, intencion: string, paso: string, token: string | undefined, timestamp?: string, nonce?: string, signature?: string): Promise<void> {
    if (!INTENCIONES.has(intencion)) throw new BadRequestException('Intención no reconocida.');
    const service = this.config.get('WHATSAPP_SERVICE_TOKEN', { infer: true });
    const hmacSecret = this.config.get('WHATSAPP_HMAC_SECRET', { infer: true });
    if (!service || !hmacSecret) throw new ServiceUnavailableException(NO_CONFIG);
    if (!this.redis) throw new ServiceUnavailableException(NO_CONFIG);
    await verificarFirma({ telefono, token, timestamp, nonce, signature }, service, hmacSecret, this.redis);
    const resultado = await this.identidad.resolverContacto(typeof telefono === 'string' ? telefono : '');
    if (!resultado.ok) {
      await this.auditar({ intencion: 'rechazada', paso, resultado: `rechazada_${resultado.motivo}`, emisorTag: typeof telefono === 'string' ? this.emisorTag(telefono) : null });
      return;
    }
    // La auditoría nunca rompe al bot: si falla, se pierde en silencio.
    await this.auditar({
      contactoId: resultado.contacto.id,
      clinicaId: resultado.contacto.clinicaId,
      intencion,
      paso,
      resultado: intencion as WhatsappSesionResultado,
      emisorTag: this.emisorTag(typeof telefono === 'string' ? telefono : ''),
    });
  }
}
