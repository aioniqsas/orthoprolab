/**
 * Rebuilds the blind search index (paciente_busqueda) for every patient.
 * Run once after the AddPacienteBusqueda migration, and again only if the
 * index is suspected to be out of date. Writes hashes only; it never prints
 * names or cedulas.
 *
 *   bun run busqueda:reindexar
 */
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { validateEnv } from '../src/config/env.validation.js';
import { CryptoModule } from '../src/crypto/crypto.module.js';
import { DatabaseModule } from '../src/database/database.module.js';
import { Paciente } from '../src/pacientes/paciente.entity.js';
import { PacientesModule } from '../src/pacientes/pacientes.module.js';
import { PacientesService } from '../src/pacientes/pacientes.service.js';

// Only what the index needs: no users, queues or HTTP.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: '.env' }),
    CryptoModule,
    DatabaseModule,
    PacientesModule,
  ],
})
class ReindexModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ReindexModule, {
    logger: ['error', 'warn'],
  });
  try {
    const pacientes = app.get(PacientesService);
    const pacientesRows = await app.get(DataSource).getRepository(Paciente).find();
    for (const p of pacientesRows) {
      await pacientes.sincronizarBusqueda(p);
    }
    console.log(`Índice de búsqueda reconstruido: ${pacientesRows.length} pacientes.`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('No se pudo reconstruir el índice:', error instanceof Error ? error.name : 'error');
  process.exit(1);
});
