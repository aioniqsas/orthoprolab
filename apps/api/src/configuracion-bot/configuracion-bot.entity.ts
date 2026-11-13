import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Almacén clave/valor de la configuración del bot de WhatsApp (IA8).
 * Hoy solo la clave `nombre`; el administrador la edita, el bot la lee.
 */
@Entity('configuracion_bot')
export class ConfiguracionBot {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  clave: string;

  @Column({ type: 'text' })
  valor: string;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
