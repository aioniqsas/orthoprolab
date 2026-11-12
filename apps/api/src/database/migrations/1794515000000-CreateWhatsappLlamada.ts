import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Solicitudes de devolución de llamada del bot (T7, S5). Nunca guarda el
 * teléfono ni el cuerpo del mensaje: la identidad vive en `contacto_id`.
 */
export class CreateWhatsappLlamada1794515000000 implements MigrationInterface {
  name = 'CreateWhatsappLlamada1794515000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "whatsapp_llamada" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "contacto_id" uuid, "clinica_id" bigint, "motivo" character varying(120) NOT NULL, "atendida" boolean NOT NULL DEFAULT false, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_whatsapp_llamada" PRIMARY KEY ("id"), CONSTRAINT "FK_whatsapp_llamada_contacto" FOREIGN KEY ("contacto_id") REFERENCES "whatsapp_contacto"("id") ON DELETE SET NULL, CONSTRAINT "FK_whatsapp_llamada_clinica" FOREIGN KEY ("clinica_id") REFERENCES "clinica"("id") ON DELETE SET NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_whatsapp_llamada_creado_en" ON "whatsapp_llamada" ("creado_en")`);
    await queryRunner.query(`CREATE INDEX "IDX_whatsapp_llamada_contacto" ON "whatsapp_llamada" ("contacto_id")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_whatsapp_llamada_contacto"`);
    await queryRunner.query(`DROP INDEX "IDX_whatsapp_llamada_creado_en"`);
    await queryRunner.query(`DROP TABLE "whatsapp_llamada"`);
  }
}
