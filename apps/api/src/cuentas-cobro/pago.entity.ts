import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { encryptedColumn } from '../crypto/encrypted-column.js';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ name: 'cuenta_cobro_id', type: 'bigint' })
  cuentaCobroId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monto: string;

  @Column({ name: 'fecha_pago', type: 'date' })
  fechaPago: Date;

  @Column({ length: 30 })
  metodo: string;

  @Column({ nullable: true, length: 100 })
  referencia: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  notas: string | null;

  @Column({ name: 'registrado_por', type: 'uuid' })
  registradoPor: string;

  @Column({ default: false })
  anulado: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CuentaCobro, (cc) => cc.pagos)
  @JoinColumn({ name: 'cuenta_cobro_id' })
  cuentaCobro: CuentaCobro;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'registrado_por' })
  registradoPorUsuario: Usuario;
}
