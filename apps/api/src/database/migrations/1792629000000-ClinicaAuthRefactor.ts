import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Architectural refactor: doctors become a standalone entity; clinica role
 * replaces odontologo/asistente; cuenta_cobro belongs to a clinic, not a doctor.
 *
 * This migration is best-effort for dev data. The DOWN direction reverses schema
 * additions where possible but cannot fully restore migrated data.
 */
export class ClinicaAuthRefactor1792629000000 implements MigrationInterface {
  name = 'ClinicaAuthRefactor1792629000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Drop asistente_doctor (assistants removed from the system) ─────────
    await queryRunner.query(`DROP TABLE IF EXISTS asistente_doctor`);

    // ── 1. Extend clinica and usuario ─────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE clinica ADD COLUMN correo VARCHAR`);
    await queryRunner.query(
      `ALTER TABLE usuario ADD COLUMN clinica_id BIGINT REFERENCES clinica(id) ON DELETE RESTRICT`,
    );

    // ── 2. Create the new standalone doctor table ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE doctor_new (
        id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        clinica_id  BIGINT NOT NULL REFERENCES clinica(id) ON DELETE RESTRICT,
        nombres     VARCHAR NOT NULL,
        apellidos   VARCHAR NOT NULL,
        correo      VARCHAR,
        activo      BOOLEAN NOT NULL DEFAULT TRUE,
        fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fecha_actualizacion  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── 3. Migrate odontologo users → doctor_new ──────────────────────────────
    await queryRunner.query(`
      INSERT INTO doctor_new (clinica_id, nombres, apellidos, correo, activo)
      SELECT d.clinica_id, u.nombres, u.apellidos, u.correo, u.activo
      FROM doctor d
      JOIN usuario u ON u.id = d.usuario_id
      JOIN rol r ON r.id = u.rol_id
      WHERE r.nombre = 'odontologo' AND d.clinica_id IS NOT NULL
    `);

    // ── 4. Build UUID → bigint mapping ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TEMP TABLE doctor_id_map AS
      SELECT d.usuario_id AS old_uuid, dn.id AS new_id
      FROM doctor_new dn
      JOIN doctor d ON d.clinica_id = dn.clinica_id
      JOIN usuario u ON u.id = d.usuario_id
      WHERE u.nombres = dn.nombres AND u.apellidos = dn.apellidos
    `);

    // ── 5. Drop asistente_doctor (references old doctor.usuario_id) ───────────
    await queryRunner.query(
      `ALTER TABLE asistente_doctor DROP CONSTRAINT "FK_7b1e01087f0656b52d643724cb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE asistente_doctor DROP CONSTRAINT "FK_5e0007640800085fc82dac3ad2a"`,
    );
    await queryRunner.query(`DROP TABLE asistente_doctor`);

    // ── 6. Migrate paciente_doctor.doctor_id: uuid → bigint ───────────────────
    // Drop composite FK on orden first (it references paciente_doctor.doctor_id)
    await queryRunner.query(
      `ALTER TABLE orden DROP CONSTRAINT "FK_31d764e8a08c7d26dbae0d32a60"`,
    );
    // Drop PK and FK on paciente_doctor
    await queryRunner.query(
      `ALTER TABLE paciente_doctor DROP CONSTRAINT "PK_58384de963d054b00f4c747c2e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE paciente_doctor DROP CONSTRAINT "FK_8555fa57a77e8aeb1daf1681bd4"`,
    );
    // Add new column, populate, swap
    await queryRunner.query(
      `ALTER TABLE paciente_doctor ADD COLUMN new_doctor_id BIGINT`,
    );
    await queryRunner.query(`
      UPDATE paciente_doctor pd
      SET new_doctor_id = m.new_id
      FROM doctor_id_map m
      WHERE pd.doctor_id::text = m.old_uuid::text
    `);
    await queryRunner.query(
      `ALTER TABLE paciente_doctor DROP COLUMN doctor_id`,
    );
    await queryRunner.query(
      `ALTER TABLE paciente_doctor RENAME COLUMN new_doctor_id TO doctor_id`,
    );
    await queryRunner.query(
      `ALTER TABLE paciente_doctor ADD PRIMARY KEY (paciente_id, doctor_id)`,
    );
    await queryRunner.query(`
      ALTER TABLE paciente_doctor
        ADD CONSTRAINT fk_paciente_doctor_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctor_new(id) ON DELETE RESTRICT
    `);

    // ── 7. Migrate orden.doctor_id: uuid → bigint ─────────────────────────────
    // Drop the index that covers doctor_id (it will be invalid after column change)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orden_doctor_fecha`);
    // Add new column, populate, swap
    await queryRunner.query(
      `ALTER TABLE orden ADD COLUMN new_doctor_id BIGINT`,
    );
    await queryRunner.query(`
      UPDATE orden o
      SET new_doctor_id = m.new_id
      FROM doctor_id_map m
      WHERE o.doctor_id::text = m.old_uuid::text
    `);
    await queryRunner.query(`ALTER TABLE orden DROP COLUMN doctor_id`);
    await queryRunner.query(
      `ALTER TABLE orden RENAME COLUMN new_doctor_id TO doctor_id`,
    );
    await queryRunner.query(`
      ALTER TABLE orden
        ADD CONSTRAINT fk_orden_doctor
        FOREIGN KEY (doctor_id) REFERENCES doctor_new(id) ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE orden
        ADD CONSTRAINT fk_orden_paciente_doctor
        FOREIGN KEY (paciente_id, doctor_id)
        REFERENCES paciente_doctor(paciente_id, doctor_id) ON DELETE RESTRICT
    `);
    // Recreate the doctor+date index
    await queryRunner.query(
      `CREATE INDEX idx_orden_doctor_fecha ON orden (doctor_id, fecha_creacion DESC)`,
    );

    // ── 8. Migrate cuenta_cobro: doctor_id → clinica_id ───────────────────────
    await queryRunner.query(
      `ALTER TABLE cuenta_cobro ADD COLUMN clinica_id BIGINT REFERENCES clinica(id) ON DELETE RESTRICT`,
    );
    // Populate from old doctor.clinica_id (old doctor table still exists at this point)
    await queryRunner.query(`
      UPDATE cuenta_cobro cc
      SET clinica_id = d.clinica_id
      FROM doctor d
      WHERE cc.doctor_id = d.usuario_id AND d.clinica_id IS NOT NULL
    `);
    // Dev fallback: any still-null clinica_id gets the first clinic
    await queryRunner.query(`
      UPDATE cuenta_cobro
      SET clinica_id = (SELECT id FROM clinica ORDER BY id LIMIT 1)
      WHERE clinica_id IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE cuenta_cobro ALTER COLUMN clinica_id SET NOT NULL`,
    );
    // Drop doctor_id (its FK to usuario is dropped automatically)
    await queryRunner.query(`ALTER TABLE cuenta_cobro DROP COLUMN doctor_id`);

    // ── 9. Clean up old doctor table ──────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE doctor DROP CONSTRAINT "FK_8d90e19ddbe01cbfd9556dfcd00"`,
    );
    await queryRunner.query(
      `ALTER TABLE doctor DROP CONSTRAINT "FK_28398af44ae6449e1e423622173"`,
    );
    await queryRunner.query(`DROP TABLE doctor`);
    await queryRunner.query(`ALTER TABLE doctor_new RENAME TO doctor`);

    // ── 10. Handle roles and legacy users ─────────────────────────────────────
    // Remove historial references by odontologo/asistente users (dev data)
    await queryRunner.query(`
      DELETE FROM historial_estado_orden
      WHERE usuario_id IN (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre IN ('odontologo', 'asistente')
      )
    `);
    // Reassign pago.registrado_por for any legacy users
    await queryRunner.query(`
      UPDATE pago
      SET registrado_por = (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre = 'administrador'
        LIMIT 1
      )
      WHERE registrado_por IN (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre IN ('odontologo', 'asistente')
      )
    `);
    // Reassign cuenta_cobro.creada_por
    await queryRunner.query(`
      UPDATE cuenta_cobro
      SET creada_por = (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre = 'administrador'
        LIMIT 1
      )
      WHERE creada_por IN (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre IN ('odontologo', 'asistente')
      )
    `);
    // Reassign envio_cuenta_cobro.enviado_por
    await queryRunner.query(`
      UPDATE envio_cuenta_cobro
      SET enviado_por = (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre = 'administrador'
        LIMIT 1
      )
      WHERE enviado_por IN (
        SELECT u.id FROM usuario u
        JOIN rol r ON r.id = u.rol_id
        WHERE r.nombre IN ('odontologo', 'asistente')
      )
    `);
    // Delete legacy users (FKs should now be cleared)
    await queryRunner.query(`
      DELETE FROM usuario
      WHERE rol_id IN (SELECT id FROM rol WHERE nombre IN ('odontologo', 'asistente'))
    `);
    // Delete legacy roles
    await queryRunner.query(
      `DELETE FROM rol WHERE nombre IN ('odontologo', 'asistente')`,
    );
    // Add clinica role
    await queryRunner.query(`
      INSERT INTO rol (nombre, descripcion)
      VALUES ('clinica', 'Administrador de una clínica')
      ON CONFLICT (nombre) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reversal — data migration cannot be fully undone.
    // Remove clinica role
    await queryRunner.query(`DELETE FROM rol WHERE nombre = 'clinica'`);

    // Restore odontologo/asistente roles
    await queryRunner.query(`
      INSERT INTO rol (nombre, descripcion) VALUES
        ('odontologo', 'Doctor que crea ordenes'),
        ('asistente', 'Asistente de un doctor')
      ON CONFLICT (nombre) DO NOTHING
    `);

    // Restore clinica_id → doctor_id on cuenta_cobro (approximate: set to first admin)
    await queryRunner.query(
      `ALTER TABLE cuenta_cobro ADD COLUMN doctor_id UUID REFERENCES usuario(id)`,
    );
    await queryRunner.query(
      `ALTER TABLE cuenta_cobro DROP COLUMN clinica_id`,
    );

    // Drop standalone doctor table
    await queryRunner.query(`DROP TABLE IF EXISTS doctor`);

    // Remove clinica_id from usuario
    await queryRunner.query(`ALTER TABLE usuario DROP COLUMN IF EXISTS clinica_id`);

    // Remove correo from clinica
    await queryRunner.query(`ALTER TABLE clinica DROP COLUMN IF EXISTS correo`);
  }
}
