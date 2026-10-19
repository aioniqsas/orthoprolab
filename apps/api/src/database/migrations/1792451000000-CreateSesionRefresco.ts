import { MigrationInterface, QueryRunner } from 'typeorm';

/** Refresh-token sessions for the auth module (hashes only, no PII). */
export class CreateSesionRefresco1792451000000 implements MigrationInterface {
  name = 'CreateSesionRefresco1792451000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sesion_refresco" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "usuario_id" uuid NOT NULL, "familia_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "expira_en" TIMESTAMP WITH TIME ZONE NOT NULL, "revocada_en" TIMESTAMP WITH TIME ZONE, "reemplazada_por_id" bigint, "creada_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ultimo_uso_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "pk_sesion_refresco" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sesion_refresco_usuario" ON "sesion_refresco" ("usuario_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sesion_refresco_familia" ON "sesion_refresco" ("familia_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_sesion_refresco_token_hash" ON "sesion_refresco" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sesion_refresco_expira" ON "sesion_refresco" ("expira_en")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sesion_refresco" ADD CONSTRAINT "fk_sesion_refresco_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sesion_refresco" DROP CONSTRAINT "fk_sesion_refresco_usuario"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_sesion_refresco_expira"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_sesion_refresco_token_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_sesion_refresco_familia"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_sesion_refresco_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "sesion_refresco"`);
  }
}
