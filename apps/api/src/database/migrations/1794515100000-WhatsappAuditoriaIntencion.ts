import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auditoría de intenciones del bot (T7, S8): intención y paso de cada
 * interacción con el tag del emisor (sha256 truncado). Nunca el cuerpo del
 * mensaje ni datos de pacientes. Columnas nulas para las filas históricas
 * de sesión.
 */
export class WhatsappAuditoriaIntencion1794515100000 implements MigrationInterface {
  name = 'WhatsappAuditoriaIntencion1794515100000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_sesion_auditoria" ADD "intencion" character varying(32), ADD "paso" character varying(64), ADD "emisor_tag" character varying(16)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "whatsapp_sesion_auditoria" DROP COLUMN "emisor_tag", DROP COLUMN "paso", DROP COLUMN "intencion"`);
  }
}
