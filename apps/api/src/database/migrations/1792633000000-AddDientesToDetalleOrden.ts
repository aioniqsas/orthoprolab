import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Each order line records the FDI numbers of the teeth it covers plus the
 * single shade of the work: `dientes = [11, 21]`, `color_diente = "A2"`.
 * Existing rows keep `[]` and a null shade; the API requires both from now on.
 */
export class AddDientesToDetalleOrden1792633000000
  implements MigrationInterface
{
  name = 'AddDientesToDetalleOrden1792633000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE detalle_orden ADD COLUMN color_diente text`);
    await queryRunner.query(
      `ALTER TABLE detalle_orden ADD COLUMN dientes jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(`
      ALTER TABLE detalle_orden
        ADD CONSTRAINT ck_detalle_orden_dientes
        CHECK (jsonb_typeof(dientes) = 'array')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE detalle_orden
        DROP CONSTRAINT IF EXISTS ck_detalle_orden_dientes,
        DROP COLUMN IF EXISTS dientes,
        DROP COLUMN IF EXISTS color_diente
    `);
  }
}
