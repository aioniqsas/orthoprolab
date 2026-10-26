import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetTokenToUsuario1792630000000 implements MigrationInterface {
  name = 'AddResetTokenToUsuario1792630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuario
        ADD COLUMN reset_token_hash VARCHAR,
        ADD COLUMN reset_token_expires TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuario
        DROP COLUMN IF EXISTS reset_token_hash,
        DROP COLUMN IF EXISTS reset_token_expires
    `);
  }
}
