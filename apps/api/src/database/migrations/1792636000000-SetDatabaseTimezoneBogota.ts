import type { MigrationInterface, QueryRunner } from 'typeorm';

// `timestamptz` guarda instantes; el `TimeZone` de la base decide a qué día
// corresponden `CURRENT_DATE`, `now()::date`, `date_trunc` y los casts a date.
// El negocio opera en Bogotá, así que ese es el valor por defecto de sesión.
export class SetDatabaseTimezoneBogota1792636000000 implements MigrationInterface {
  name = 'SetDatabaseTimezoneBogota1792636000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Bogota'); END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC'); END $$`,
    );
  }
}
