import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Official bank accounts (with their QR) and payment receipts uploaded by the
 * client portal. Existing payments get NULL receipt columns.
 */
export class CreateMetodosPagoYComprobantes1792631000000
  implements MigrationInterface
{
  name = 'CreateMetodosPagoYComprobantes1792631000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE metodo_pago_bancario (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        banco VARCHAR(120) NOT NULL,
        tipo_cuenta VARCHAR(60) NOT NULL,
        numero_cuenta VARCHAR(40) NOT NULL,
        titular VARCHAR(160) NOT NULL,
        qr_url VARCHAR(500),
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        orden INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Official account already published on the public website.
    await queryRunner.query(`
      INSERT INTO metodo_pago_bancario
        (banco, tipo_cuenta, numero_cuenta, titular, qr_url, activo, orden)
      VALUES
        ('Bancolombia', 'Cuenta de ahorros', '00861243320',
         'Flavio Alberto Paz', '/images/qr-cuenta.webp', TRUE, 0)
    `);

    await queryRunner.query(
      `ALTER TABLE pago ADD COLUMN comprobante_url VARCHAR(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE pago ADD COLUMN comprobante_nombre VARCHAR(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE pago DROP COLUMN IF EXISTS comprobante_nombre`,
    );
    await queryRunner.query(
      `ALTER TABLE pago DROP COLUMN IF EXISTS comprobante_url`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS metodo_pago_bancario`);
  }
}
