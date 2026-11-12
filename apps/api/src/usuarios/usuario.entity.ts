import { Exclude } from 'class-transformer';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { cedulaHash } from '../crypto/cedula.js';
import { encryptedColumn } from '../crypto/encrypted-column.js';
import { Clinica } from './clinica.entity.js';
import { Rol } from './rol.entity.js';

// The case-insensitive unique index on lower(correo) cannot be expressed with
// decorators; it is created in the schema migration (synchronize: false keeps
// TypeORM from trying to drop it).
@Index('uq_usuario_correo_lower', { synchronize: false })
@Entity('usuario')
export class Usuario {
  // gen_random_uuid() is built into PostgreSQL 13+ (see uuidExtension below).
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Encrypted at rest (AES-256-GCM); the entity holds the plaintext. Never
  // query this column: look up by cedulaHash (see crypto/cedula.ts).
  // @Exclude: serialization only (ClassSerializerInterceptor). The column,
  // the entity and every query keep working; the HTTP response never carries it.
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'text', transformer: encryptedColumn() })
  cedula: string;

  // Blind index (HMAC-SHA256 hex) of the normalized cedula; carries the
  // uniqueness guarantee. Maintained by the hooks below.
  @Index('uq_usuario_cedula_hash', { unique: true })
  @Exclude({ toPlainOnly: true })
  @Column({ name: 'cedula_hash', type: 'char', length: 64 })
  cedulaHash: string;

  @Column({ type: 'varchar' })
  nombres: string;

  @Column({ type: 'varchar' })
  apellidos: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar' })
  correo: string;

  // Hash only; hashing is the responsibility of the auth layer.
  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash: string;

  @Column({ name: 'rol_id', type: 'bigint' })
  rolId: string;

  @ManyToOne(() => Rol, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  // Only populated for users with the 'clinica' role.
  @Column({ name: 'clinica_id', type: 'bigint', nullable: true })
  clinicaId: string | null;

  @ManyToOne(() => Clinica, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clinica_id' })
  clinica: Clinica | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Password reset: the raw token is emailed; only its SHA-256 hex is stored.
  @Exclude({ toPlainOnly: true })
  @Column({ name: 'reset_token_hash', type: 'varchar', nullable: true })
  resetTokenHash: string | null;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'reset_token_expires', type: 'timestamptz', nullable: true })
  resetTokenExpires: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;

  @BeforeInsert()
  @BeforeUpdate()
  syncCedulaHash(): void {
    // Partial updates may not carry the cedula: keep the stored hash then.
    if (this.cedula !== undefined && this.cedula !== null) {
      this.cedulaHash = cedulaHash(this.cedula);
    }
  }
}
