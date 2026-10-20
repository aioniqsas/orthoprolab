import type { MigrationInterface, QueryRunner } from 'typeorm';

// Self-contained on purpose: migrations must not depend on application code.
function slugify(nombre: string): string {
  const slug = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
  return slug === '' ? 'servicio' : slug;
}

export class AddCatalogFieldsToServicio1792452000000 implements MigrationInterface {
  name = 'AddCatalogFieldsToServicio1792452000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "servicio" ADD "slug" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "servicio" ADD "imagen_url" text`);
    await queryRunner.query(
      `ALTER TABLE "servicio" ADD "imagen_public_id" text`,
    );

    // Backfill slugs for existing rows BEFORE enforcing NOT NULL.
    const rows = (await queryRunner.query(
      `SELECT "id", "nombre" FROM "servicio" ORDER BY "id"`,
    )) as { id: string; nombre: string }[];
    const used = new Set<string>();
    for (const row of rows) {
      const base = slugify(row.nombre);
      let slug = base;
      for (let n = 2; used.has(slug); n++) {
        const suffix = `-${n}`;
        slug = `${base.slice(0, 120 - suffix.length)}${suffix}`;
      }
      used.add(slug);
      await queryRunner.query(
        `UPDATE "servicio" SET "slug" = $1 WHERE "id" = $2`,
        [slug, row.id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "servicio" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_servicio_slug" ON "servicio" ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "servicio" ADD CONSTRAINT "ck_servicio_imagen_url_cloudinary" CHECK ("imagen_url" IS NULL OR "imagen_url" LIKE 'https://res.cloudinary.com/%')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "servicio" DROP CONSTRAINT "ck_servicio_imagen_url_cloudinary"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_servicio_slug"`);
    await queryRunner.query(
      `ALTER TABLE "servicio" DROP COLUMN "imagen_public_id"`,
    );
    await queryRunner.query(`ALTER TABLE "servicio" DROP COLUMN "imagen_url"`);
    await queryRunner.query(`ALTER TABLE "servicio" DROP COLUMN "slug"`);
  }
}
