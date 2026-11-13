import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Allowlist of WhatsApp numbers the bot answers (S1). S1: unknown numbers are
 * never processed. Phone stored encrypted (AES-256-GCM) with a blind index for
 * lookup (S8). doctor_id NULL = shared reception number (S2).
 */
export class WhatsappContacto1794506513106 implements MigrationInterface {
  name = 'WhatsappContacto1794506513106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE whatsapp_contacto (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telefono_cifrado TEXT NOT NULL,
        telefono_hash CHAR(64) NOT NULL,
        clinica_id BIGINT NOT NULL REFERENCES clinica(id) ON DELETE CASCADE,
        doctor_id BIGINT REFERENCES doctor(id) ON DELETE RESTRICT,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        verificado_en TIMESTAMPTZ,
        notas TEXT,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Phone lookups go through the blind index; the ciphertext is never compared.
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_whatsapp_contacto_telefono_hash
        ON whatsapp_contacto (telefono_hash)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS whatsapp_contacto`);
  }
}
