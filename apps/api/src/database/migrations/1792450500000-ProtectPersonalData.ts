import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data protection (Ley 1581 de 2012, technical measures).
 *
 * Personal data is encrypted by the APPLICATION (AES-256-GCM, key in
 * ENCRYPTION_KEY), so the database only ever stores `v1:...` ciphertext:
 *   paciente.nombre, paciente.cedula, usuario.cedula,
 *   detalle_orden.observaciones, historial_estado_orden.observaciones.
 * Ciphertext is not deterministic and longer than the plaintext, so:
 *   - those columns become `text`;
 *   - uniqueness moves from the cedula columns to `cedula_hash`, an HMAC-SHA256
 *     blind index (char(64) hex, separate BLIND_INDEX_KEY) computed by the app.
 *
 * GUARD: existing plaintext cannot be converted in SQL because the keys live in
 * the application, not in the database. There is no production data yet, so
 * `up` aborts if any affected row exists (instead of leaving plaintext behind a
 * column that the app would then fail to decrypt). If data ever has to be
 * migrated, do it with an app-level script that reads plaintext and re-saves
 * through the entities. `down` is guarded the same way, since it would leave
 * ciphertext in columns that no longer expect it.
 */
export class ProtectPersonalData1792450500000 implements MigrationInterface {
  name = 'ProtectPersonalData1792450500000';

  private async assertEmpty(queryRunner: QueryRunner, action: string) {
    const checks = [
      `SELECT 'usuario' AS t FROM usuario LIMIT 1`,
      `SELECT 'paciente' FROM paciente LIMIT 1`,
      `SELECT 'detalle_orden' FROM detalle_orden WHERE observaciones IS NOT NULL LIMIT 1`,
      `SELECT 'historial_estado_orden' FROM historial_estado_orden WHERE observaciones IS NOT NULL LIMIT 1`,
    ];
    for (const sql of checks) {
      const rows = (await queryRunner.query(sql)) as { t: string }[];
      if (rows.length > 0) {
        throw new Error(
          `ProtectPersonalData ${action} aborted: table "${Object.values(rows[0])[0]}" already contains rows. ` +
            'Plaintext cannot be converted in SQL (encryption keys live in the application). ' +
            'Migrate the data with an application-level script, or empty the table in a development database.',
        );
      }
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.assertEmpty(queryRunner, 'up');

    await queryRunner.query(`DROP INDEX "public"."uq_paciente_cedula"`);
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP CONSTRAINT "UQ_83ffe924cd2d60b07421bf8dfc6"`,
    );

    await queryRunner.query(
      `ALTER TABLE "paciente" ALTER COLUMN "nombre" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" ALTER COLUMN "cedula" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" ADD "cedula_hash" character(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "cedula" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD "cedula_hash" character(64) NOT NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_paciente_cedula_hash" ON "paciente" ("cedula_hash") WHERE "cedula_hash" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_usuario_cedula_hash" ON "usuario" ("cedula_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.assertEmpty(queryRunner, 'down');

    await queryRunner.query(`DROP INDEX "public"."uq_usuario_cedula_hash"`);
    await queryRunner.query(`DROP INDEX "public"."uq_paciente_cedula_hash"`);
    await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "cedula_hash"`);
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "cedula" TYPE character varying`,
    );
    await queryRunner.query(`ALTER TABLE "paciente" DROP COLUMN "cedula_hash"`);
    await queryRunner.query(
      `ALTER TABLE "paciente" ALTER COLUMN "cedula" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente" ALTER COLUMN "nombre" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD CONSTRAINT "UQ_83ffe924cd2d60b07421bf8dfc6" UNIQUE ("cedula")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_paciente_cedula" ON "paciente"  ("cedula") WHERE "cedula" IS NOT NULL`,
    );
  }
}
