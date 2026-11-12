import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWhatsappSesionAuditoria1794513000000 implements MigrationInterface {
  name = 'CreateWhatsappSesionAuditoria1794513000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "whatsapp_sesion_auditoria" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clinica_id" bigint, "contacto_id" uuid, "resultado" character varying(32) NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_whatsapp_sesion_auditoria" PRIMARY KEY ("id"), CONSTRAINT "FK_whatsapp_sesion_auditoria_clinica" FOREIGN KEY ("clinica_id") REFERENCES "clinica"("id") ON DELETE SET NULL, CONSTRAINT "FK_whatsapp_sesion_auditoria_contacto" FOREIGN KEY ("contacto_id") REFERENCES "whatsapp_contacto"("id") ON DELETE SET NULL)`);
    await queryRunner.query(`CREATE INDEX "IDX_whatsapp_sesion_auditoria_creado_en" ON "whatsapp_sesion_auditoria" ("creado_en")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_whatsapp_sesion_auditoria_creado_en"`);
    await queryRunner.query(`DROP TABLE "whatsapp_sesion_auditoria"`);
  }
}
