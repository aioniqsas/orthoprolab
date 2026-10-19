import type { MigrationInterface, QueryRunner } from 'typeorm';

// PROVISIONAL values: roles and order states are assumptions to be confirmed
// with the client. Inserts are idempotent (ON CONFLICT DO NOTHING).
export class SeedCatalogs1792450400000 implements MigrationInterface {
  name = 'SeedCatalogs1792450400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "rol" ("nombre", "descripcion") VALUES
        ('administrador', 'Administra la plataforma'),
        ('odontologo', 'Doctor que crea ordenes'),
        ('asistente', 'Asistente de un doctor')
      ON CONFLICT ("nombre") DO NOTHING`);
    await queryRunner.query(`
      INSERT INTO "estado_orden" ("codigo", "nombre", "posicion", "es_final") VALUES
        ('recibida', 'Recibida', 1, false),
        ('en_produccion', 'En produccion', 2, false),
        ('terminada', 'Terminada', 3, true)
      ON CONFLICT ("codigo") DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "estado_orden" WHERE "codigo" IN ('recibida','en_produccion','terminada')`,
    );
    await queryRunner.query(
      `DELETE FROM "rol" WHERE "nombre" IN ('administrador','odontologo','asistente')`,
    );
  }
}
