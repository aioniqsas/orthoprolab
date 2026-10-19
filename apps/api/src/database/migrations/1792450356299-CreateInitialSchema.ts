import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1792450356299 implements MigrationInterface {
  name = 'CreateInitialSchema1792450356299';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rol" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "nombre" character varying NOT NULL, "descripcion" text, CONSTRAINT "UQ_9792c580a992d554ee1621c5b45" UNIQUE ("nombre"), CONSTRAINT "PK_c93a22388638fac311781c7f2dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "paciente" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "nombre" character varying NOT NULL, "cedula" character varying, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cbcb7985432e4b49d32c5243867" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_paciente_cedula" ON "paciente"  ("cedula") WHERE "cedula" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "servicio" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "nombre" character varying NOT NULL, "descripcion" text, "precio" numeric(12,2) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_20f03be6b4f4f61b0485182c1e5" UNIQUE ("nombre"), CONSTRAINT "ck_servicio_precio_no_negativo" CHECK ("precio" >= 0), CONSTRAINT "PK_a589f335f4fc94f913c9f86e608" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "estado_orden" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "codigo" character varying NOT NULL, "nombre" character varying NOT NULL, "posicion" integer NOT NULL, "es_final" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_01e71fd3d24b75572af07df8be4" UNIQUE ("codigo"), CONSTRAINT "PK_2a43d4453d2a2888732cd961e70" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuario" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "cedula" character varying NOT NULL, "nombres" character varying NOT NULL, "apellidos" character varying NOT NULL, "correo" character varying NOT NULL, "password_hash" character varying NOT NULL, "rol_id" bigint NOT NULL, "activo" boolean NOT NULL DEFAULT true, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_83ffe924cd2d60b07421bf8dfc6" UNIQUE ("cedula"), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`,
    );
    // Case-insensitive unique email (not expressible with decorators).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_usuario_correo_lower" ON "usuario" (lower("correo"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "clinica" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "nombre" character varying NOT NULL, "direccion" character varying, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a5868356fca535972d7aa945704" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "doctor" ("usuario_id" uuid NOT NULL, "clinica_id" bigint, CONSTRAINT "PK_8d90e19ddbe01cbfd9556dfcd00" PRIMARY KEY ("usuario_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "paciente_doctor" ("paciente_id" bigint NOT NULL, "doctor_id" uuid NOT NULL, "fecha_asignacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_58384de963d054b00f4c747c2e3" PRIMARY KEY ("paciente_id", "doctor_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "asistente_doctor" ("doctor_id" uuid NOT NULL, "asistente_id" uuid NOT NULL, "fecha_asignacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_asistente_doctor_distintos" CHECK ("doctor_id" <> "asistente_id"), CONSTRAINT "PK_123bac748968c11dbb2ff7bee30" PRIMARY KEY ("doctor_id", "asistente_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orden" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "doctor_id" uuid NOT NULL, "paciente_id" bigint NOT NULL, "estado_id" bigint NOT NULL, "valor" numeric(12,2) NOT NULL DEFAULT '0', "urgente" boolean NOT NULL DEFAULT false, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "fecha_entrega" TIMESTAMP WITH TIME ZONE, "fecha_actualizacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_orden_fecha_entrega" CHECK ("fecha_entrega" IS NULL OR "fecha_entrega" >= "fecha_creacion"), CONSTRAINT "ck_orden_valor_no_negativo" CHECK ("valor" >= 0), CONSTRAINT "PK_7dc2f9c066419f6f0782cafb454" PRIMARY KEY ("id"))`,
    );
    // Latest orders per doctor first (DESC column, not expressible with decorators).
    await queryRunner.query(
      `CREATE INDEX "idx_orden_doctor_fecha" ON "orden" ("doctor_id", "fecha_creacion" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orden_paciente" ON "orden"  ("paciente_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orden_estado" ON "orden"  ("estado_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "historial_estado_orden" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "orden_id" bigint NOT NULL, "estado_anterior_id" bigint, "estado_nuevo_id" bigint NOT NULL, "usuario_id" uuid NOT NULL, "fecha_cambio" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "observaciones" text, CONSTRAINT "PK_c35b6123de1fd5919aa9d37acf4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_historial_orden_fecha" ON "historial_estado_orden"  ("orden_id", "fecha_cambio") `,
    );
    await queryRunner.query(
      `CREATE TABLE "detalle_orden" ("id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL, "orden_id" bigint NOT NULL, "servicio_id" bigint NOT NULL, "cantidad" integer NOT NULL DEFAULT '1', "precio_unitario" numeric(12,2) NOT NULL, "observaciones" text, CONSTRAINT "ck_detalle_orden_precio" CHECK ("precio_unitario" >= 0), CONSTRAINT "ck_detalle_orden_cantidad" CHECK ("cantidad" > 0), CONSTRAINT "PK_cf957cf32507d27e6015ea93515" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_detalle_orden_orden" ON "detalle_orden"  ("orden_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD CONSTRAINT "FK_6c336b0a51b5c4d22614cb02533" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor" ADD CONSTRAINT "FK_8d90e19ddbe01cbfd9556dfcd00" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor" ADD CONSTRAINT "FK_28398af44ae6449e1e423622173" FOREIGN KEY ("clinica_id") REFERENCES "clinica"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_doctor" ADD CONSTRAINT "FK_9d8d4986c8a5f500ae2030db139" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_doctor" ADD CONSTRAINT "FK_8555fa57a77e8aeb1daf1681bd4" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("usuario_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistente_doctor" ADD CONSTRAINT "FK_7b1e01087f0656b52d643724cb3" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("usuario_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistente_doctor" ADD CONSTRAINT "FK_5e0007640800085fc82dac3ad2a" FOREIGN KEY ("asistente_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orden" ADD CONSTRAINT "FK_31d764e8a08c7d26dbae0d32a60" FOREIGN KEY ("paciente_id", "doctor_id") REFERENCES "paciente_doctor"("paciente_id","doctor_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orden" ADD CONSTRAINT "FK_a3fd26abb795b984a7b710ff131" FOREIGN KEY ("estado_id") REFERENCES "estado_orden"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" ADD CONSTRAINT "FK_bc138d6088560ead37cfb000643" FOREIGN KEY ("orden_id") REFERENCES "orden"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" ADD CONSTRAINT "FK_981d1fec49a4fb5af5e50a8d8fb" FOREIGN KEY ("estado_anterior_id") REFERENCES "estado_orden"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" ADD CONSTRAINT "FK_dd0cd30ade629362196327faa07" FOREIGN KEY ("estado_nuevo_id") REFERENCES "estado_orden"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" ADD CONSTRAINT "FK_22893e5083442f13bb964b24dd6" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden" ADD CONSTRAINT "FK_8633a4a37c368f1e7dda4c866dc" FOREIGN KEY ("orden_id") REFERENCES "orden"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden" ADD CONSTRAINT "FK_b7ae239aa4cc9255d0ecda4e133" FOREIGN KEY ("servicio_id") REFERENCES "servicio"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detalle_orden" DROP CONSTRAINT "FK_b7ae239aa4cc9255d0ecda4e133"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden" DROP CONSTRAINT "FK_8633a4a37c368f1e7dda4c866dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" DROP CONSTRAINT "FK_22893e5083442f13bb964b24dd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" DROP CONSTRAINT "FK_dd0cd30ade629362196327faa07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" DROP CONSTRAINT "FK_981d1fec49a4fb5af5e50a8d8fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_estado_orden" DROP CONSTRAINT "FK_bc138d6088560ead37cfb000643"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orden" DROP CONSTRAINT "FK_a3fd26abb795b984a7b710ff131"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orden" DROP CONSTRAINT "FK_31d764e8a08c7d26dbae0d32a60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistente_doctor" DROP CONSTRAINT "FK_5e0007640800085fc82dac3ad2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asistente_doctor" DROP CONSTRAINT "FK_7b1e01087f0656b52d643724cb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_doctor" DROP CONSTRAINT "FK_8555fa57a77e8aeb1daf1681bd4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "paciente_doctor" DROP CONSTRAINT "FK_9d8d4986c8a5f500ae2030db139"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor" DROP CONSTRAINT "FK_28398af44ae6449e1e423622173"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor" DROP CONSTRAINT "FK_8d90e19ddbe01cbfd9556dfcd00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP CONSTRAINT "FK_6c336b0a51b5c4d22614cb02533"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_detalle_orden_orden"`);
    await queryRunner.query(`DROP TABLE "detalle_orden"`);
    await queryRunner.query(`DROP INDEX "public"."idx_historial_orden_fecha"`);
    await queryRunner.query(`DROP TABLE "historial_estado_orden"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orden_estado"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orden_doctor_fecha"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orden_paciente"`);
    await queryRunner.query(`DROP TABLE "orden"`);
    await queryRunner.query(`DROP TABLE "asistente_doctor"`);
    await queryRunner.query(`DROP TABLE "paciente_doctor"`);
    await queryRunner.query(`DROP TABLE "doctor"`);
    await queryRunner.query(`DROP TABLE "clinica"`);
    await queryRunner.query(`DROP INDEX "public"."uq_usuario_correo_lower"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP TABLE "estado_orden"`);
    await queryRunner.query(`DROP TABLE "servicio"`);
    await queryRunner.query(`DROP INDEX "public"."uq_paciente_cedula"`);
    await queryRunner.query(`DROP TABLE "paciente"`);
    await queryRunner.query(`DROP TABLE "rol"`);
  }
}
