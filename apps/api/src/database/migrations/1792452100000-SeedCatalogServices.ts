import type { MigrationInterface, QueryRunner } from 'typeorm';

// PROVISIONAL: the four current service lines of the website with price 0.00
// (the PDF shows "Consultar valor"). An administrator enters real prices.
// Idempotent: ON CONFLICT DO NOTHING on the unique name.
const SERVICES: [string, string, string][] = [
  [
    'ortodoncia-fija',
    'Ortodoncia Fija',
    'Aparatos fijos para tratamientos de ortodoncia, como disyuntores y anclajes, hechos para cada paciente.',
  ],
  [
    'ortodoncia-removible',
    'Ortodoncia Removible',
    'Placas y aparatos funcionales que el paciente puede quitarse, hechos según el caso del odontólogo.',
  ],
  [
    'alineadores-invisibles',
    'Alineadores Invisibles',
    'Alineadores transparentes planificados a partir de las impresiones que envía el odontólogo.',
  ],
  [
    'retenedores-y-ferulas',
    'Retenedores y Férulas',
    'Retenedores para el final del tratamiento y férulas de descarga hechas a la medida del paciente.',
  ],
];

export class SeedCatalogServices1792452100000 implements MigrationInterface {
  name = 'SeedCatalogServices1792452100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [slug, nombre, descripcion] of SERVICES) {
      await queryRunner.query(
        `INSERT INTO "servicio" ("slug", "nombre", "descripcion", "precio", "activo")
         VALUES ($1, $2, $3, 0.00, true) ON CONFLICT DO NOTHING`,
        [slug, nombre, descripcion],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only rows nobody references: orders keep their services.
    await queryRunner.query(
      `DELETE FROM "servicio" WHERE "slug" = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM "detalle_orden" d WHERE d."servicio_id" = "servicio"."id")`,
      [SERVICES.map(([slug]) => slug)],
    );
  }
}
