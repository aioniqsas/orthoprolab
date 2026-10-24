import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Clinica } from './clinica.entity.js';

// Standalone doctor entity — no longer a 1:1 extension of usuario.
// Primary key is a bigint identity; the doctor has no login credentials.
@Entity('doctor')
export class Doctor {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ name: 'clinica_id', type: 'bigint' })
  clinicaId: string;

  @ManyToOne(() => Clinica, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clinica_id' })
  clinica: Clinica;

  @Column({ type: 'varchar' })
  nombres: string;

  @Column({ type: 'varchar' })
  apellidos: string;

  @Column({ type: 'varchar', nullable: true })
  correo: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;
}
