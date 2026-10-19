import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Servicio } from '../catalogo/servicio.entity.js';
import { Orden } from './orden.entity.js';

@Check('ck_detalle_orden_cantidad', '"cantidad" > 0')
@Check('ck_detalle_orden_precio', '"precio_unitario" >= 0')
@Entity('detalle_orden')
export class DetalleOrden {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Index('idx_detalle_orden_orden')
  @Column({ name: 'orden_id', type: 'bigint' })
  ordenId: string;

  // RESTRICT: an order with lines cannot be deleted by accident.
  @ManyToOne(() => Orden, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orden_id' })
  orden: Orden;

  @Column({ name: 'servicio_id', type: 'bigint' })
  servicioId: string;

  @ManyToOne(() => Servicio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;

  @Column({ type: 'integer', default: 1 })
  cantidad: number;

  // Historical price copied from servicio.precio when the order is placed.
  @Column({
    name: 'precio_unitario',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  precioUnitario: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
