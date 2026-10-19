import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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

  @Column({ type: 'varchar', unique: true })
  cedula: string;

  @Column({ type: 'varchar' })
  nombres: string;

  @Column({ type: 'varchar' })
  apellidos: string;

  @Column({ type: 'varchar' })
  correo: string;

  // Hash only; hashing is the responsibility of the auth layer.
  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash: string;

  @Column({ name: 'rol_id', type: 'bigint' })
  rolId: string;

  @ManyToOne(() => Rol, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;
}
