import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { EnvConfig } from '../config/env.validation.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { WhatsappIdentidadService } from './whatsapp-identidad.service.js';

/** Todo lo que el bot necesita de la sesión, y nada más (S7). */
export interface SesionBot {
  accessToken: string;
  /** Segundos de vida del token (ACCESS_TOKEN_TTL_SECONDS). */
  expiresIn: number;
  clinicaId: string;
  doctorId: string | null;
}

const MENSAJE_NO_CONFIGURADO =
  'La sesión del bot de WhatsApp no está configurada.';
const MENSAJE_TOKEN = 'Token de servicio inválido.';
const MENSAJE_NO_HABILITADO =
  'Este número no está habilitado para el bot de WhatsApp.';
const MENSAJE_SIN_CUENTA =
  'La clínica no tiene una cuenta de portal designada para el bot. ' +
  'Pide al administrador que designe una cuenta.';

/**
 * Sesión del bot (S7): con el secreto de servicio y un número verificado,
 * acuña el JWT corto de la cuenta de portal designada por la clínica. La
 * tenencia sigue saliendo de `resolveClinicaId` en /mi-clinica/*: aquí no se
 * crean roles ni guards nuevos, solo se emite el mismo token que el portal.
 */
@Injectable()
export class WhatsappSesionService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly jwt: JwtService,
    private readonly identidad: WhatsappIdentidadService,
    @InjectRepository(Clinica)
    private readonly clinicas: Repository<Clinica>,
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  async crearSesion(
    telefonoCrudo: unknown,
    tokenServicio: string | undefined,
  ): Promise<SesionBot> {
    // Sin el secreto el endpoint está caído (patrón de los503 de Cloudinary):
    // 503, nunca 401, para no insinuar que un token podría bastar.
    const esperado = this.config.get('WHATSAPP_SERVICE_TOKEN', {
      infer: true,
    });
    if (!esperado) {
      throw new ServiceUnavailableException(MENSAJE_NO_CONFIGURADO);
    }

    // sha256 de ambos lados: comparación de longitud fija que no filtra el
    // largo del secreto. Ausente y incorrecto responden igual (401).
    const recibido = createHash('sha256')
      .update(tokenServicio ?? '', 'utf8')
      .digest();
    const correcto = createHash('sha256').update(esperado, 'utf8').digest();
    const coincide =
      timingSafeEqual(recibido, correcto) && tokenServicio !== undefined;
    if (!coincide) throw new UnauthorizedException(MENSAJE_TOKEN);

    const resultado = await this.identidad.resolverContacto(
      typeof telefonoCrudo === 'string' ? telefonoCrudo : '',
    );
    // telefono_invalido, no_autorizado y no_verificado: un solo mensaje.
    if (!resultado.ok) throw new ForbiddenException(MENSAJE_NO_HABILITADO);

    const clinica = await this.clinicas.findOneBy({
      id: resultado.contacto.clinicaId,
    });
    // Clínica apagada o ausente: mismo403 genérico que un contacto rechazado.
    if (!clinica?.activo) throw new ForbiddenException(MENSAJE_NO_HABILITADO);
    if (!clinica.usuarioBotId) throw new ConflictException(MENSAJE_SIN_CUENTA);

    const usuario = await this.usuarios.findOne({
      where: { id: clinica.usuarioBotId },
      relations: { rol: true },
    });
    // La cuenta designada tiene que ser ESTA clínica y estar activa (S3): una
    // cuenta ajena haría que /mi-clinica/* sirviera datos de otra clínica.
    if (
      !usuario?.activo ||
      usuario.rol?.nombre !== 'clinica' ||
      usuario.clinicaId !== clinica.id
    ) {
      throw new ConflictException(MENSAJE_SIN_CUENTA);
    }

    // Mismo firmante y misma forma de claims que AuthService.signAccessToken:
    // sub, rol y sid; el guard solo exige que sid sea un UUID.
    const accessToken = await this.jwt.signAsync({
      sub: usuario.id,
      rol: usuario.rol.nombre,
      sid: randomUUID(),
    });

    return {
      accessToken,
      expiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
      clinicaId: resultado.contacto.clinicaId,
      doctorId: resultado.contacto.doctorId,
    };
  }
}
