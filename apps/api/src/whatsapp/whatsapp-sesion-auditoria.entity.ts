import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type WhatsappSesionResultado =
  | 'emitida'
  | 'limitada'
  | 'menu'
  | 'estado'
  | 'control'
  | 'cuenta'
  | 'orden_creada'
  | 'llamada'
  | 'rechazada'
  | 'codigo_emitido'
  | 'vinculada'
  | `rechazada_${string}`;

@Entity('whatsapp_sesion_auditoria')
export class WhatsappSesionAuditoria {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'clinica_id', type: 'bigint', nullable: true }) clinicaId: string | null;
  @Column({ name: 'contacto_id', type: 'uuid', nullable: true }) contactoId: string | null;
  @Column({ type: 'varchar', length: 64 }) resultado: WhatsappSesionResultado;
  /** Intención de la interacción (T7/S8); null en filas solo de sesión. */
  @Column({ type: 'varchar', length: 32, nullable: true }) intencion: string | null;
  /** Paso de la conversación al registrar; nunca el texto del mensaje. */
  @Column({ type: 'varchar', length: 64, nullable: true }) paso: string | null;
  /** sha256 del teléfono, truncado a 16 hex: correlación sin datos personales. */
  @Column({ name: 'emisor_tag', type: 'varchar', length: 16, nullable: true }) emisorTag: string | null;
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' }) creadoEn: Date;
}
