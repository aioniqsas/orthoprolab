import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { EnvConfig } from '../config/env.validation.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { decideRefresh } from './refresh-policy.js';
import { SesionRefresco } from './sesion-refresco.entity.js';

export interface IssuedSession {
  usuarioId: string;
  rol: string;
  familiaId: string;
  /** Opaque refresh token (only its hash is stored). */
  refreshToken: string;
}

export type RotationResult =
  ({ status: 'rotated' } & IssuedSession) | { status: 'denied' };

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

const newRefreshToken = (): string => randomBytes(32).toString('base64url');

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private get ttlMs(): number {
    return (
      this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000
    );
  }

  private async insertRow(
    manager: EntityManager,
    usuarioId: string,
    familiaId: string,
  ): Promise<{ id: string; token: string }> {
    const token = newRefreshToken();
    const row = await manager.save(SesionRefresco, {
      usuarioId,
      familiaId,
      tokenHash: hashRefreshToken(token),
      expiraEn: new Date(Date.now() + this.ttlMs),
    });
    return { id: row.id, token };
  }

  /** Starts a new session family (a login). */
  async create(usuarioId: string, rol: string): Promise<IssuedSession> {
    const familiaId = randomUUID();
    const { token } = await this.insertRow(
      this.dataSource.manager,
      usuarioId,
      familiaId,
    );
    return { usuarioId, rol, familiaId, refreshToken: token };
  }

  /**
   * Validates and rotates a refresh token inside one transaction holding a
   * row lock, so two concurrent requests with the same token cannot both
   * rotate it. Every non-rotated outcome is `denied`; reuse and cap
   * violations also revoke the family.
   */
  async rotate(rawToken: string): Promise<RotationResult> {
    const now = new Date();
    return this.dataSource.transaction(async (manager) => {
      const row = await manager
        .createQueryBuilder(SesionRefresco, 's')
        .setLock('pessimistic_write')
        .where('s.tokenHash = :hash', { hash: hashRefreshToken(rawToken) })
        .getOne();

      const start = row
        ? await manager
            .createQueryBuilder(SesionRefresco, 's')
            .select('MIN(s.creadaEn)', 'start')
            .where('s.familiaId = :f', { f: row.familiaId })
            .getRawOne<{ start: Date | null }>()
        : null;

      const decision = decideRefresh(row, start?.start ?? null, now, {
        graceSeconds: this.config.get('REFRESH_REUSE_GRACE_SECONDS', {
          infer: true,
        }),
        maxLifetimeDays: this.config.get('SESSION_MAX_LIFETIME_DAYS', {
          infer: true,
        }),
      });

      if (decision !== 'rotate' || row === null) {
        if (row && (decision === 'reuse' || decision === 'capped')) {
          if (decision === 'reuse') {
            this.logger.warn('Refresh token reuse detected; family revoked');
          }
          await this.revokeFamilyWith(manager, row.familiaId, now);
        }
        return { status: 'denied' } as const;
      }

      const user = await manager.findOne(Usuario, {
        where: { id: row.usuarioId },
        relations: { rol: true },
      });
      if (!user?.activo) {
        await this.revokeFamilyWith(manager, row.familiaId, now);
        return { status: 'denied' } as const;
      }

      const next = await this.insertRow(manager, row.usuarioId, row.familiaId);
      await manager.update(SesionRefresco, row.id, {
        revocadaEn: now,
        reemplazadaPorId: next.id,
        ultimoUsoEn: now,
      });
      return {
        status: 'rotated',
        usuarioId: row.usuarioId,
        rol: user.rol.nombre,
        familiaId: row.familiaId,
        refreshToken: next.token,
      } as const;
    });
  }

  /** Revokes the whole family of a refresh token (logout). No-op if unknown. */
  /** Revokes all active sessions for a given user (e.g. after password reset). */
  async revokeAllForUser(usuarioId: string): Promise<void> {
    await this.dataSource.manager
      .createQueryBuilder()
      .update(SesionRefresco)
      .set({ revocadaEn: new Date() })
      .where('usuarioId = :usuarioId AND revocadaEn IS NULL', { usuarioId })
      .execute();
  }

  async revokeByToken(rawToken: string): Promise<void> {
    const row = await this.dataSource.manager.findOne(SesionRefresco, {
      where: { tokenHash: hashRefreshToken(rawToken) },
    });
    if (row) {
      await this.revokeFamilyWith(
        this.dataSource.manager,
        row.familiaId,
        new Date(),
      );
    }
  }

  private async revokeFamilyWith(
    manager: EntityManager,
    familiaId: string,
    at: Date,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(SesionRefresco)
      .set({ revocadaEn: at })
      .where('familiaId = :familiaId AND revocadaEn IS NULL', { familiaId })
      .execute();
  }
}
