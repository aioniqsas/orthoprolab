import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { Orden } from '../pedidos/orden.entity.js';

@Entity('cuenta_cobro_orden')
export class CuentaCobroOrden {
  @PrimaryColumn({ name: 'cuenta_cobro_id', type: 'bigint' })
  cuentaCobroId: string;

  @PrimaryColumn({ name: 'orden_id', type: 'bigint' })
  ordenId: string;

  @Column({ name: 'valor_snapshot', type: 'numeric', precision: 12, scale: 2 })
  valorSnapshot: string;

  @ManyToOne(() => CuentaCobro, (cc) => cc.ordenes)
  @JoinColumn({ name: 'cuenta_cobro_id' })
  cuentaCobro: CuentaCobro;

  @ManyToOne(() => Orden)
  @JoinColumn({ name: 'orden_id' })
  orden: Orden;
}
