import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type WhatsappSesionResultado = 'emitida' | 'limitada' | `rechazada_${string}`;

@Entity('whatsapp_sesion_auditoria')
export class WhatsappSesionAuditoria {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'clinica_id', type: 'bigint', nullable: true }) clinicaId: string | null;
  @Column({ name: 'contacto_id', type: 'uuid', nullable: true }) contactoId: string | null;
  @Column({ type: 'varchar', length: 64 }) resultado: WhatsappSesionResultado;
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' }) creadoEn: Date;
}
