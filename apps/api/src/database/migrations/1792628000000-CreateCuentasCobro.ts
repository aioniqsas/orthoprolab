import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Billing accounts: cuenta_cobro, cuenta_cobro_orden, pago, envio_cuenta_cobro */
export class CreateCuentasCobro1792628000000 implements MigrationInterface {
  name = 'CreateCuentasCobro1792628000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cuenta_cobro (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        doctor_id UUID NOT NULL REFERENCES usuario(id),
        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
        fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
        fecha_vencimiento DATE,
        total NUMERIC(12,2) NOT NULL DEFAULT 0,
        pdf_url VARCHAR(500),
        pdf_hash VARCHAR(64),
        observaciones TEXT,
        creada_por UUID NOT NULL REFERENCES usuario(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE cuenta_cobro_orden (
        cuenta_cobro_id BIGINT NOT NULL REFERENCES cuenta_cobro(id) ON DELETE CASCADE,
        orden_id BIGINT NOT NULL REFERENCES orden(id),
        valor_snapshot NUMERIC(12,2) NOT NULL,
        PRIMARY KEY (cuenta_cobro_id, orden_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_cuenta_cobro_orden_orden ON cuenta_cobro_orden(orden_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE pago (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        cuenta_cobro_id BIGINT NOT NULL REFERENCES cuenta_cobro(id),
        monto NUMERIC(12,2) NOT NULL,
        fecha_pago DATE NOT NULL,
        metodo VARCHAR(30) NOT NULL,
        referencia VARCHAR(100),
        notas TEXT,
        registrado_por UUID NOT NULL REFERENCES usuario(id),
        anulado BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_pago_cuenta_cobro ON pago(cuenta_cobro_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE envio_cuenta_cobro (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        cuenta_cobro_id BIGINT NOT NULL REFERENCES cuenta_cobro(id),
        enviado_a VARCHAR(254) NOT NULL,
        estado VARCHAR(20) NOT NULL,
        error TEXT,
        enviado_por UUID NOT NULL REFERENCES usuario(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS envio_cuenta_cobro`);
    await queryRunner.query(`DROP TABLE IF EXISTS pago`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cuenta_cobro_orden_orden`);
    await queryRunner.query(`DROP TABLE IF EXISTS cuenta_cobro_orden`);
    await queryRunner.query(`DROP TABLE IF EXISTS cuenta_cobro`);
  }
}
