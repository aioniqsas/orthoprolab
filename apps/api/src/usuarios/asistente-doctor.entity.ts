import {
  Check,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity.js';
import { Usuario } from './usuario.entity.js';

@Check('ck_asistente_doctor_distintos', '"doctor_id" <> "asistente_id"')
@Entity('asistente_doctor')
export class AsistenteDoctor {
  @PrimaryColumn({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @PrimaryColumn({ name: 'asistente_id', type: 'uuid' })
  asistenteId: string;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id', referencedColumnName: 'usuarioId' })
  doctor: Doctor;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asistente_id' })
  asistente: Usuario;

  @CreateDateColumn({ name: 'fecha_asignacion', type: 'timestamptz' })
  fechaAsignacion: Date;
}
