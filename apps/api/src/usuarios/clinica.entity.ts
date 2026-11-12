import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clinica')
export class Clinica {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', nullable: true })
  correo: string | null;

  // Same lifecycle flag as doctor/usuario/servicio: false = clinic off (SD1).
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Portal account that represents the clinic to the WhatsApp bot (S7).
  // FK to usuario created in the migration; NULL = not designated yet.
  @Column({ name: 'usuario_bot_id', type: 'uuid', nullable: true })
  usuarioBotId: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;
}
