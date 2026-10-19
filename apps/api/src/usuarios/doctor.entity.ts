import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Clinica } from './clinica.entity.js';
import { Usuario } from './usuario.entity.js';

// 1:1 extension of usuario: the primary key is the usuario id.
@Entity('doctor')
export class Doctor {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @OneToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'clinica_id', type: 'bigint', nullable: true })
  clinicaId: string | null;

  @ManyToOne(() => Clinica, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clinica_id' })
  clinica: Clinica | null;
}
