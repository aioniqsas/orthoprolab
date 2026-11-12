import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SD1 (S3, S4): soft delete on `detalle_orden`, `paciente_doctor`,
 * `cuenta_cobro_orden` and `paciente` (`eliminado_en`), the clinic lifecycle
 * flag `clinica.activo`, and the `paciente.cedula_hash` unique index now
 * partial over active rows so a deleted patient's cedula can be reused.
 */
export class AddSoftDelete1794509812663 implements MigrationInterface {
  name = 'AddSoftDelete1794509812663';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE detalle_orden ADD COLUMN eliminado_en TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE paciente_doctor ADD COLUMN eliminado_en TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE cuenta_cobro_orden ADD COLUMN eliminado_en TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE paciente ADD COLUMN eliminado_en TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE clinica ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`DROP INDEX uq_paciente_cedula_hash`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_paciente_cedula_hash ON paciente (cedula_hash) WHERE cedula_hash IS NOT NULL AND eliminado_en IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Soft-deleted rows would collide with an active row's cedula_hash when the
    // old full-predicate index is recreated; refuse instead of half-reverting.
    await queryRunner.query(
      `DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM detalle_orden WHERE eliminado_en IS NOT NULL) THEN
          RAISE EXCEPTION 'AddSoftDelete: detalle_orden tiene filas con eliminado_en; restaúralas antes de revertir (UPDATE detalle_orden SET eliminado_en = NULL) o resuélvelo a mano';
        END IF;
        IF EXISTS (SELECT 1 FROM paciente_doctor WHERE eliminado_en IS NOT NULL) THEN
          RAISE EXCEPTION 'AddSoftDelete: paciente_doctor tiene filas con eliminado_en; restaúralas antes de revertir (UPDATE paciente_doctor SET eliminado_en = NULL) o resuélvelo a mano';
        END IF;
        IF EXISTS (SELECT 1 FROM cuenta_cobro_orden WHERE eliminado_en IS NOT NULL) THEN
          RAISE EXCEPTION 'AddSoftDelete: cuenta_cobro_orden tiene filas con eliminado_en; restaúralas antes de revertir (UPDATE cuenta_cobro_orden SET eliminado_en = NULL) o resuélvelo a mano';
        END IF;
        IF EXISTS (SELECT 1 FROM paciente WHERE eliminado_en IS NOT NULL) THEN
          RAISE EXCEPTION 'AddSoftDelete: paciente tiene filas con eliminado_en; restaúralas antes de revertir (UPDATE paciente SET eliminado_en = NULL) o resuélvelo a mano';
        END IF;
      END $$;`,
    );
    await queryRunner.query(`DROP INDEX uq_paciente_cedula_hash`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_paciente_cedula_hash ON paciente (cedula_hash) WHERE cedula_hash IS NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE clinica DROP COLUMN activo`);
    await queryRunner.query(
      `ALTER TABLE paciente DROP COLUMN eliminado_en`,
    );
    await queryRunner.query(
      `ALTER TABLE cuenta_cobro_orden DROP COLUMN eliminado_en`,
    );
    await queryRunner.query(
      `ALTER TABLE paciente_doctor DROP COLUMN eliminado_en`,
    );
    await queryRunner.query(
      `ALTER TABLE detalle_orden DROP COLUMN eliminado_en`,
    );
  }
}
