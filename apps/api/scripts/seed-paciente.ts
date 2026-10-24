/**
 * Seeds one test patient linked to the first available doctor.
 *
 *   bun run seed:paciente -- --nombre "Juan Pérez" --cedula 123456789
 *
 * --nombre   Patient's full name (required)
 * --cedula   Document number, digits only (optional)
 * --doctor   Doctor's UUID (optional; defaults to the first doctor found)
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AdminCliModule } from '../src/auth/admin-cli.module.js';
import { Paciente } from '../src/pacientes/paciente.entity.js';
import { PacienteDoctor } from '../src/pacientes/paciente-doctor.entity.js';
import { Doctor } from '../src/usuarios/doctor.entity.js';

function parseArgs(): { nombre: string; cedula: string | null; doctorId: string | null } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | null => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };

  const nombre = get('--nombre');
  if (!nombre) {
    console.error('Error: --nombre is required.\n');
    console.error('Usage: bun run seed:paciente -- --nombre "Nombre Completo" [--cedula 123456789] [--doctor <id>]');
    process.exit(2);
  }

  const cedula = get('--cedula');
  if (cedula && !/^\d{5,12}$/.test(cedula)) {
    console.error('Error: --cedula must be 5–12 digits.');
    process.exit(2);
  }

  return { nombre, cedula, doctorId: get('--doctor') };
}

async function main(): Promise<void> {
  const { nombre, cedula, doctorId: argDoctorId } = parseArgs();

  const app = await NestFactory.createApplicationContext(AdminCliModule, { logger: false });
  const ds = app.get(DataSource);

  try {
    // Resolve doctor
    const doctorRepo = ds.getRepository(Doctor);
    const doctor = argDoctorId
      ? await doctorRepo.findOne({ where: { id: argDoctorId } })
      : await doctorRepo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!doctor) {
      console.error(argDoctorId
        ? `Error: no doctor found with id ${argDoctorId}.`
        : 'Error: no doctors in the database. Create one first with the admin form.');
      process.exit(1);
    }

    await ds.transaction(async (em) => {
      // Check cedula uniqueness via the blind index (same as the real service)
      if (cedula) {
        const { cedulaHashOrNull } = await import('../src/crypto/cedula.js');
        const hash = cedulaHashOrNull(cedula);
        if (hash) {
          const dup = await em.findOne(Paciente, { where: { cedulaHash: hash } });
          if (dup) {
            console.error(`Error: a patient with cedula ${cedula} already exists (id ${dup.id}).`);
            process.exit(1);
          }
        }
      }

      // Insert paciente — the encryptedColumn transformer runs automatically
      const paciente = em.create(Paciente, { nombre, cedula: cedula ?? null });
      const saved = await em.save(paciente);

      // Link to doctor
      const link = em.create(PacienteDoctor, {
        pacienteId: saved.id,
        doctorId: doctor.id,
      });
      await em.save(link);

      console.log(JSON.stringify({
        id: saved.id,
        nombre: saved.nombre,
        cedula: cedula ?? null,
        doctorId: doctor.id,
      }, null, 2));
    });
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
