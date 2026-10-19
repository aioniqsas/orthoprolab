import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { encryptedColumn } from '../crypto/encrypted-column.js';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Orden } from './orden.entity.js';

// Append-only log of order state transitions.
@Index('idx_historial_orden_fecha', ['ordenId', 'fechaCambio'])
@Entity('historial_estado_orden')
export class HistorialEstadoOrden {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ name: 'orden_id', type: 'bigint' })
  ordenId: string;

  @ManyToOne(() => Orden, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orden_id' })
  orden: Orden;

  @Column({ name: 'estado_anterior_id', type: 'bigint', nullable: true })
  estadoAnteriorId: string | null;

  @ManyToOne(() => EstadoOrden, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'estado_anterior_id' })
  estadoAnterior: EstadoOrden | null;

  @Column({ name: 'estado_nuevo_id', type: 'bigint' })
  estadoNuevoId: string;

  @ManyToOne(() => EstadoOrden, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'estado_nuevo_id' })
  estadoNuevo: EstadoOrden;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @CreateDateColumn({ name: 'fecha_cambio', type: 'timestamptz' })
  fechaCambio: Date;

  // Free-text clinical notes: encrypted at rest (AES-256-GCM).
  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  observaciones: string | null;
}
