import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import type { Repository } from 'typeorm';
import type { EnvConfig } from '../config/env.validation.js';
import { THROTTLER_REDIS } from '../security/redis-throttler.storage.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { WhatsappIdentidadService } from './whatsapp-identidad.service.js';
import { WhatsappSesionAuditoria } from './whatsapp-sesion-auditoria.entity.js';

export interface SesionBot { accessToken: string; expiresIn: number; clinicaId: string; doctorId: string | null; }
const NO_CONFIG = 'La sesión del bot de WhatsApp no está configurada.';
const BAD = 'Token de servicio inválido.';
const NO = 'Este número no está habilitado para el bot de WhatsApp.';
const LIMIT = 'Límite de sesiones del bot excedido.';

@Injectable()
export class WhatsappSesionService {
  constructor(private readonly config: ConfigService<EnvConfig, true>, private readonly jwt: JwtService, private readonly identidad: WhatsappIdentidadService,
    @InjectRepository(Clinica) private readonly clinicas: Repository<Clinica>, @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(WhatsappSesionAuditoria) private readonly auditoria: Repository<WhatsappSesionAuditoria> = undefined as never, @Inject(THROTTLER_REDIS) @Optional() private readonly redis: Redis = undefined as never) {}

  /** Audita la sesión con su resultado; nunca guarda teléfono, token ni firma. */
  private async auditar(resultado: string, clinicaId: number | string | null = null, contactoId: string | null = null): Promise<void> {
    await this.auditoria.save({ clinicaId, contactoId, resultado } as never).catch(() => undefined);
  }

  async crearSesion(telefono: unknown, token: string | undefined, timestamp?: string, nonce?: string, signature?: string): Promise<SesionBot> {
    const service = this.config.get('WHATSAPP_SERVICE_TOKEN', { infer: true });
    const hmacSecret = this.config.get('WHATSAPP_HMAC_SECRET', { infer: true });
    if (!service || !hmacSecret) throw new ServiceUnavailableException(NO_CONFIG);
    // Sin Redis no hay protección de nonce ni cuotas: se falla cerrado en vez de emitir sesiones sin límite.
    if (!this.redis) throw new ServiceUnavailableException(NO_CONFIG);
    const same = (a: string | undefined, b: string) => timingSafeEqual(createHash('sha256').update(a ?? '').digest(), createHash('sha256').update(b).digest()) && a !== undefined;
    if (!same(token, service)) throw new UnauthorizedException(BAD);
    const seconds = Number(timestamp);
    if (!Number.isInteger(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > 120 || !nonce || !/^[A-Za-z0-9_-]{16,40}$/.test(nonce) || !signature || !/^[0-9a-f]{64}$/i.test(signature)) throw new UnauthorizedException(BAD);
    const expected = createHmac('sha256', hmacSecret).update(`${typeof telefono === 'string' ? telefono : ''}|${timestamp}|${nonce}`).digest('hex');
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) throw new UnauthorizedException(BAD);
    if ((await this.redis.set(`whatsapp:nonce:${nonce}`, '1', 'EX', 120, 'NX')) !== 'OK') throw new UnauthorizedException(BAD);
    const resultado = await this.identidad.resolverContacto(typeof telefono === 'string' ? telefono : '');
    if (!resultado.ok) { await this.auditar(`rechazada_contacto_${resultado.motivo}`); throw new ForbiddenException(NO); }
    const clinica = await this.clinicas.findOneBy({ id: resultado.contacto.clinicaId });
    if (!clinica?.activo) { await this.auditar('rechazada_clinica_inactiva', resultado.contacto.clinicaId, resultado.contacto.id); throw new ForbiddenException(NO); }
    if (!clinica.usuarioBotId) { await this.auditar('rechazada_cuenta_no_designada', clinica.id, resultado.contacto.id); throw new ConflictException('La clínica no tiene una cuenta de portal designada para el bot. Pide al administrador que designe una cuenta.'); }
    const usuario = await this.usuarios.findOne({ where: { id: clinica.usuarioBotId }, relations: { rol: true } });
    if (!usuario?.activo || usuario.rol?.nombre !== 'clinica' || usuario.clinicaId !== clinica.id) { await this.auditar('rechazada_cuenta_inutilizable', clinica.id, resultado.contacto.id); throw new ConflictException('La clínica no tiene una cuenta de portal designada para el bot. Pide al administrador que designe una cuenta.'); }
    const minute = await this.redis.incr(`whatsapp:limit:clinic:${clinica.id}:minute`); if (minute === 1) await this.redis.expire(`whatsapp:limit:clinic:${clinica.id}:minute`, 60);
    const hour = await this.redis.incr(`whatsapp:limit:contact:${resultado.contacto.id}:hour`); if (hour === 1) await this.redis.expire(`whatsapp:limit:contact:${resultado.contacto.id}:hour`, 3600);
    if (minute > 6 || hour > 20) {
      // Un intento denegado no consume cupo: si no, un atacante mantiene el
      // contador alto para siempre y bloquea a la clínica legítima.
      await this.redis.decr(`whatsapp:limit:clinic:${clinica.id}:minute`);
      await this.redis.decr(`whatsapp:limit:contact:${resultado.contacto.id}:hour`);
      await this.auditar('limitada', clinica.id, resultado.contacto.id); throw new HttpException(LIMIT, HttpStatus.TOO_MANY_REQUESTS);
    }
    const accessToken = await this.jwt.signAsync({ sub: usuario.id, rol: usuario.rol.nombre, sid: randomUUID(), scope: 'whatsapp-bot' });
    await this.auditar('emitida', clinica.id, resultado.contacto.id);
    return { accessToken, expiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }), clinicaId: clinica.id, doctorId: resultado.contacto.doctorId };
  }
}
