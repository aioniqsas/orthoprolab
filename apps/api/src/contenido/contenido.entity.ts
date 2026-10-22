import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Key/value store for the fixed copy of the public site. Only edited values are
 * stored: a missing row means "the site uses its own default text".
 */
@Entity('contenido_web')
export class ContenidoWeb {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  clave: string;

  @Column({ type: 'text' })
  valor: string;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;
}
