import type { MigrationInterface, QueryRunner } from 'typeorm';

/** A billing account is issued when its PDF is generated; drafts have no emission date. */
export class NullableFechaEmisionCuentaCobro1792632000000
  implements MigrationInterface
{
  name = 'NullableFechaEmisionCuentaCobro1792632000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cuenta_cobro
        ALTER COLUMN fecha_emision DROP NOT NULL,
        ALTER COLUMN fecha_emision DROP DEFAULT
    `);
    await queryRunner.query(
      `UPDATE cuenta_cobro SET fecha_emision = NULL WHERE estado = 'borrador'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE cuenta_cobro SET fecha_emision = CURRENT_DATE WHERE fecha_emision IS NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE cuenta_cobro
        ALTER COLUMN fecha_emision SET DEFAULT CURRENT_DATE,
        ALTER COLUMN fecha_emision SET NOT NULL
    `);
  }
}
