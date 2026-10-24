import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';

@Entity('envio_cuenta_cobro')
export class EnvioCuentaCobro {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ name: 'cuenta_cobro_id', type: 'bigint' })
  cuentaCobroId: string;

  @Column({ name: 'enviado_a', length: 254 })
  enviadoA: string;

  @Column({ length: 20 })
  estado: string;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'enviado_por', type: 'uuid' })
  enviadoPor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CuentaCobro, (cc) => cc.envios)
  @JoinColumn({ name: 'cuenta_cobro_id' })
  cuentaCobro: CuentaCobro;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'enviado_por' })
  enviadoPorUsuario: Usuario;
}
