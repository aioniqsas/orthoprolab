import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `resultado` era varchar(32) y los códigos de rechazo de la auditoría no
 * cabían (`rechazada_contacto_telefono_invalido` son 38), así que la fila de
 * auditoría se perdía. Se amplía a 64.
 */
export class WidenWhatsappSesionAuditoriaResultado1794514000000
  implements MigrationInterface
{
  name = 'WidenWhatsappSesionAuditoriaResultado1794514000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whatsapp_sesion_auditoria" ALTER COLUMN "resultado" TYPE character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whatsapp_sesion_auditoria" ALTER COLUMN "resultado" TYPE character varying(32)`,
    );
  }
}
