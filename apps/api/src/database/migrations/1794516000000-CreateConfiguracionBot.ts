import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configuración editable del bot de WhatsApp (IA8): almacén clave/valor.
 * El administrador la edita vía `PATCH /admin/configuracion/bot`; el bot la
 * lee con su rol restringido. Fila semilla: nombre del bot.
 */
export class CreateConfiguracionBot1794516000000 implements MigrationInterface {
  name = 'CreateConfiguracionBot1794516000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "configuracion_bot" ("clave" varchar(64) NOT NULL, "valor" text NOT NULL, "actualizado_en" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_configuracion_bot" PRIMARY KEY ("clave"))`,
    );
    await queryRunner.query(
      `INSERT INTO "configuracion_bot" ("clave", "valor") VALUES ('nombre', 'Aioniq') ON CONFLICT ("clave") DO NOTHING`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "configuracion_bot"`);
  }
}
