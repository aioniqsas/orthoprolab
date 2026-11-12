import { Transform } from 'class-transformer';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { cedulaHashOrNull } from '../crypto/cedula.js';
import { encryptedColumn } from '../crypto/encrypted-column.js';
import { enmascararCedula } from './cedula-visible.js';

// cedula is optional (e.g. minors) but unique when present. Uniqueness lives on
// the blind index because the encrypted cedula is non-deterministic.
@Index('uq_paciente_cedula_hash', ['cedulaHash'], {
  unique: true,
  where: '"cedula_hash" IS NOT NULL',
})
@Entity('paciente')
export class Paciente {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  // Encrypted at rest (AES-256-GCM); the entity holds the plaintext.
  @Column({ type: 'text', transformer: encryptedColumn() })
  nombre: string;

  // Encrypted at rest; look up by cedulaHash, never by this column.
  // HTTP responses show only the last four digits (see cedula-visible.ts).
  // The transform runs at serialization only: the PDFs read the full value.
  @Transform(({ value }) => enmascararCedula(value as string | null), { toPlainOnly: true })
  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  cedula: string | null;

  @Column({ name: 'cedula_hash', type: 'char', length: 64, nullable: true })
  cedulaHash: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncCedulaHash(): void {
    // Partial updates may not carry the cedula: keep the stored hash then.
    if (this.cedula !== undefined) {
      this.cedulaHash = cedulaHashOrNull(this.cedula);
    }
  }
}
