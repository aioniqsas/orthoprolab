import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Key/value store for the editable copy of the public website. */
export class CreateContenidoWeb1792627200000 implements MigrationInterface {
  name = 'CreateContenidoWeb1792627200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contenido_web" ("clave" character varying(120) NOT NULL, "valor" text NOT NULL, "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_contenido_web" PRIMARY KEY ("clave"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contenido_web"`);
  }
}
