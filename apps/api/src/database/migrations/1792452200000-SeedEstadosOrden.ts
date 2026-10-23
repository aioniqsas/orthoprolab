import type { MigrationInterface, QueryRunner } from 'typeorm';

// Migrates order states from 3 → 7:
//   Existing: recibida, en_produccion, terminada
//   After:    creada(1), recibida(2), en_proceso(3), cancelada(4),
//             en_entrega(5), devuelta_correccion(6), terminada(7)
//
// Idempotent: ON CONFLICT ("codigo") DO NOTHING on inserts.
export class SeedEstadosOrden1792452200000 implements MigrationInterface {
  name = 'SeedEstadosOrden1792452200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename en_produccion → en_proceso and fix its position.
    await queryRunner.query(
      `UPDATE "estado_orden"
       SET "codigo" = 'en_proceso', "nombre" = 'En proceso', "posicion" = 3
       WHERE "codigo" = 'en_produccion'`,
    );

    // Ensure recibida and terminada have the canonical positions.
    await queryRunner.query(
      `UPDATE "estado_orden" SET "posicion" = 2 WHERE "codigo" = 'recibida'`,
    );
    await queryRunner.query(
      `UPDATE "estado_orden" SET "posicion" = 7 WHERE "codigo" = 'terminada'`,
    );

    // Insert the four missing states (idempotent).
    const states: [string, string, number, boolean][] = [
      ['creada', 'Creada', 1, false],
      ['en_entrega', 'En entrega al cliente', 5, false],
      ['cancelada', 'Cancelada', 4, true],
      ['devuelta_correccion', 'Devuelta para corrección', 6, false],
    ];

    for (const [codigo, nombre, posicion, esFinal] of states) {
      await queryRunner.query(
        `INSERT INTO "estado_orden" ("codigo", "nombre", "posicion", "es_final")
         VALUES ($1, $2, $3, $4) ON CONFLICT ("codigo") DO NOTHING`,
        [codigo, nombre, posicion, esFinal],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the four inserted states.
    await queryRunner.query(
      `DELETE FROM "estado_orden"
       WHERE "codigo" = ANY($1::text[])`,
      [['creada', 'en_entrega', 'cancelada', 'devuelta_correccion']],
    );

    // Revert en_proceso back to en_produccion.
    await queryRunner.query(
      `UPDATE "estado_orden"
       SET "codigo" = 'en_produccion', "nombre" = 'En producción'
       WHERE "codigo" = 'en_proceso'`,
    );
  }
}
