import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('estado_orden')
export class EstadoOrden {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  // Stable slug used by application code (e.g. 'recibida').
  @Column({ type: 'varchar', unique: true })
  codigo: string;

  @Column({ type: 'varchar' })
  nombre: string;

  // Position in the order flow.
  @Column({ type: 'integer' })
  posicion: number;

  @Column({ name: 'es_final', type: 'boolean', default: false })
  esFinal: boolean;
}
