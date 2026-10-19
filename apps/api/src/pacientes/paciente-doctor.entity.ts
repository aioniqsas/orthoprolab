import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Paciente } from './paciente.entity.js';

// A patient may be followed by several doctors.
@Entity('paciente_doctor')
export class PacienteDoctor {
  @PrimaryColumn({ name: 'paciente_id', type: 'bigint' })
  pacienteId: string;

  @PrimaryColumn({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Paciente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id', referencedColumnName: 'usuarioId' })
  doctor: Doctor;

  @CreateDateColumn({ name: 'fecha_asignacion', type: 'timestamptz' })
  fechaAsignacion: Date;
}
