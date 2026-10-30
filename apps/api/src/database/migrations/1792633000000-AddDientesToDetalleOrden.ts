import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teeth selected for each order line, with the shade of each tooth:
 * `[{ "numero": 11, "color": "A2" }]`. Empty for orders created before the
 * odontogram existed; the API requires at least one tooth from now on.
 */
export class AddDientesToDetalleOrden1792633000000
  implements MigrationInterface
{
  name = 'AddDientesToDetalleOrden1792633000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The earlier per-line shade column never shipped outside dev.
    await queryRunner.query(
      `ALTER TABLE detalle_orden DROP COLUMN IF EXISTS color_diente`,
    );
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
        DROP COLUMN IF EXISTS dientes
    `);
  }
}
