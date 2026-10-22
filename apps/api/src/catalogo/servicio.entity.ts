import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Check('ck_servicio_precio_no_negativo', '"precio" >= 0')
@Check(
  'ck_servicio_imagen_url_cloudinary',
  `"imagen_url" IS NULL OR "imagen_url" LIKE 'https://res.cloudinary.com/%'`,
)
@Entity('servicio')
export class Servicio {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ type: 'varchar', unique: true })
  nombre: string;

  // Stable public URL key, generated once at creation (never regenerated, so
  // website URLs do not break when the name is edited).
  @Index('uq_servicio_slug', { unique: true })
  @Column({ type: 'varchar' })
  slug: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  // numeric(12,2) maps to string to avoid float rounding on money.
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  precio: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // Cloudinary delivery URL (https://res.cloudinary.com/...) and its asset id.
  @Column({ name: 'imagen_url', type: 'text', nullable: true })
  imagenUrl: string | null;

  // Internal: needed to replace/delete the asset. Never exposed by the API.
  @Column({ name: 'imagen_public_id', type: 'text', nullable: true })
  imagenPublicId: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;
}
