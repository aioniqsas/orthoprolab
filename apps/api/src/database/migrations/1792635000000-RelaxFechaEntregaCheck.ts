import type { MigrationInterface, QueryRunner } from 'typeorm';

// `fecha_entrega` guarda un día calendario a las 12:00 UTC (07:00 en Bogotá),
// mientras que `fecha_creacion` conserva la hora real. Comparar ambos como
// timestamps rechazaba entregar el mismo día de la creación, así que la
// restricción pasa a comparar días calendario en la zona del negocio.
export class RelaxFechaEntregaCheck1792635000000 implements MigrationInterface {
  name = 'RelaxFechaEntregaCheck1792635000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orden" DROP CONSTRAINT "ck_orden_fecha_entrega"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orden" ADD CONSTRAINT "ck_orden_fecha_entrega" CHECK (
         "fecha_entrega" IS NULL
         OR ("fecha_entrega" AT TIME ZONE 'America/Bogota')::date
            >= ("fecha_creacion" AT TIME ZONE 'America/Bogota')::date
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orden" DROP CONSTRAINT "ck_orden_fecha_entrega"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orden" ADD CONSTRAINT "ck_orden_fecha_entrega" CHECK (
         "fecha_entrega" IS NULL OR "fecha_entrega" >= "fecha_creacion"
       )`,
    );
  }
}
