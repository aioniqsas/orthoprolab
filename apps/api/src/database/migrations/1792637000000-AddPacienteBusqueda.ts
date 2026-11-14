import type { MigrationInterface, QueryRunner } from 'typeorm';

// Blind search index for patients. Names and cedulas are encrypted, so SQL
// cannot search them. This table stores keyed hashes ("blind tokens") that
// let the database find candidate patients without decrypting anything:
//   campo 'nombre'   -> HMAC of each trigram of the normalized name
//   campo 'cedula'   -> HMAC of the full cedula
//   campo 'ultimos4' -> HMAC of the last four digits
// Filled by PacientesService on every write and by the reindex script for
// existing rows (see scripts/reindex-paciente-busqueda.ts).
export class AddPacienteBusqueda1792637000000 implements MigrationInterface {
  name = 'AddPacienteBusqueda1792637000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "paciente_busqueda" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "paciente_id" bigint NOT NULL REFERENCES "paciente"("id") ON DELETE CASCADE,
        "campo" varchar(10) NOT NULL,
        "token_hash" char(64) NOT NULL,
        CONSTRAINT "uq_paciente_busqueda" UNIQUE ("paciente_id", "campo", "token_hash")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_paciente_busqueda_token" ON "paciente_busqueda" ("campo", "token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "paciente_busqueda"`);
  }
}
