import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';

// The (doctor_id, fecha_creacion DESC) index needs a DESC column, which the
// decorator cannot express; it lives in the schema migration.
@Index('idx_orden_doctor_fecha', { synchronize: false })
@Check('ck_orden_valor_no_negativo', '"valor" >= 0')
@Check(
  'ck_orden_fecha_entrega',
  '"fecha_entrega" IS NULL OR "fecha_entrega" >= "fecha_creacion"',
)
@Entity('orden')
export class Orden {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @Index('idx_orden_paciente')
  @Column({ name: 'paciente_id', type: 'bigint' })
  pacienteId: string;

  // Composite FK: a doctor can only order for patients assigned to them.
  @ManyToOne(() => PacienteDoctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'paciente_id', referencedColumnName: 'pacienteId' },
    { name: 'doctor_id', referencedColumnName: 'doctorId' },
  ])
  asignacion: PacienteDoctor;

  @Index('idx_orden_estado')
  @Column({ name: 'estado_id', type: 'bigint' })
  estadoId: string;

  @ManyToOne(() => EstadoOrden, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'estado_id' })
  estado: EstadoOrden;

  // Stored total, kept in sync with detalle_orden by the application service.
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  valor: string;

  @Column({ type: 'boolean', default: false })
  urgente: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_entrega', type: 'timestamptz', nullable: true })
  fechaEntrega: Date | null;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;
}
