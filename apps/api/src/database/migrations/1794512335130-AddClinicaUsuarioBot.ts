import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S7 (T3): `clinica.usuario_bot_id`, la cuenta de portal que representa a la
 * clínica ante el bot de WhatsApp. NULL = aún no designada. FK a `usuario`
 * con ON DELETE RESTRICT: no se borra una cuenta designada sin cambiar antes
 * la designación. Solo esta columna y su FK; el resto del esquema lo cubren
 * las migraciones existentes.
 */
export class AddClinicaUsuarioBot1794512335130 implements MigrationInterface {
  name = 'AddClinicaUsuarioBot1794512335130';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE clinica ADD COLUMN usuario_bot_id UUID REFERENCES usuario(id) ON DELETE RESTRICT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE clinica DROP COLUMN usuario_bot_id`);
  }
}
