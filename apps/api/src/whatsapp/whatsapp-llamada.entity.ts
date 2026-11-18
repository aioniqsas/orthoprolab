import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Solicitud de devolución de llamada (T7, S5): la opción 0 del bot la graba
 * aquí y notifica al laboratorio por el correo. Nunca guarda el teléfono, el
 * cuerpo del mensaje ni ningún token: la clínica sale del contacto verificado.
 */
@Entity('whatsapp_llamada')
export class WhatsappLlamada {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'contacto_id', type: 'uuid', nullable: true }) contactoId: string | null;
  @Column({ name: 'clinica_id', type: 'bigint', nullable: true }) clinicaId: string | null;
  @Column({ type: 'varchar', length: 120 }) motivo: string;
  @Column({ type: 'boolean', default: false }) atendida: boolean;
  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' }) creadoEn: Date;
}
