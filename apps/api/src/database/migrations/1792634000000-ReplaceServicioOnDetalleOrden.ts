import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A work line no longer points at a catalog service: the name is typed by the
 * user and the catalog stops being a relation of the order. The price moves to
 * the invoice, so `precio_unitario` becomes nullable and stays only as history
 * of the lines created before this change.
 */
export class ReplaceServicioOnDetalleOrden1792634000000
  implements MigrationInterface
{
  name = 'ReplaceServicioOnDetalleOrden1792634000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE detalle_orden ADD COLUMN servicio text`);
    await queryRunner.query(`
      UPDATE detalle_orden d
         SET servicio = s.nombre
        FROM servicio s
       WHERE s.id = d.servicio_id AND d.servicio IS NULL
    `);
    // Defensive: the old FK was NOT NULL, so every row should have matched.
    await queryRunner.query(`
      UPDATE detalle_orden SET servicio = 'Sin especificar' WHERE servicio IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE detalle_orden ALTER COLUMN servicio SET NOT NULL`,
    );
    // Dropping the column also drops its FK and any index over it.
    await queryRunner.query(`ALTER TABLE detalle_orden DROP COLUMN servicio_id`);
    await queryRunner.query(
      `ALTER TABLE detalle_orden ALTER COLUMN precio_unitario DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE detalle_orden ADD COLUMN servicio_id bigint`);
    await queryRunner.query(`
      UPDATE detalle_orden d
         SET servicio_id = s.id
        FROM servicio s
       WHERE s.nombre = d.servicio AND d.servicio_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE detalle_orden
        ADD CONSTRAINT "FK_b7ae239aa4cc9255d0ecda4e133"
        FOREIGN KEY (servicio_id) REFERENCES servicio(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`ALTER TABLE detalle_orden DROP COLUMN servicio`);
    await queryRunner.query(
      `UPDATE detalle_orden SET precio_unitario = 0 WHERE precio_unitario IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE detalle_orden ALTER COLUMN precio_unitario SET NOT NULL`,
    );
  }
}
