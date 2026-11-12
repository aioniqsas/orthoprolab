import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { encryptedColumn } from '../crypto/encrypted-column.js';
import { getCrypto } from '../crypto/crypto.registry.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { normalizeTelefono } from './normalize-telefono.js';

/** Unknown numbers are never processed: only allowlisted contacts reach the bot. */
export type WhatsappContactoEstado = 'pendiente' | 'verificado' | 'bloqueado';

// Allowlist of WhatsApp numbers, the bot's identity source (S1/S2). Uniqueness
// lives on the blind index because the encrypted phone is non-deterministic.
@Entity('whatsapp_contacto')
export class WhatsappContacto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Encrypted at rest (AES-256-GCM); the entity holds the plaintext, stored
  // exactly as received. Never query this column: look up by telefonoHash.
  @Column({
    name: 'telefono_cifrado',
    type: 'text',
    transformer: encryptedColumn(),
  })
  telefonoCifrado: string;

  // Blind index (HMAC-SHA256 hex) of normalizeTelefono(plaintext), so every
  // format of one number shares one hash. Maintained by the hooks below.
  @Index('uq_whatsapp_contacto_telefono_hash', { unique: true })
  @Column({ name: 'telefono_hash', type: 'char', length: 64 })
  telefonoHash: string;

  @Column({ name: 'clinica_id', type: 'bigint' })
  clinicaId: string;

  @ManyToOne(() => Clinica, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinica_id' })
  clinica: Clinica;

  // NULL = shared reception number, so the bot asks which doctor (S2).
  @Column({ name: 'doctor_id', type: 'bigint', nullable: true })
  doctorId: string | null;

  @ManyToOne(() => Doctor, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor | null;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: WhatsappContactoEstado;

  @Column({ name: 'verificado_en', type: 'timestamptz', nullable: true })
  verificadoEn: Date | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  // Change the phone only through save(): Repository.update()/QueryBuilder.update() do not run these listeners and would leave a stale telefono_hash that makes the contact unfindable.
  @BeforeInsert()
  @BeforeUpdate()
  syncTelefonoHash(): void {
    // Partial updates may not carry the phone: keep the stored hash then.
    if (this.telefonoCifrado !== undefined && this.telefonoCifrado !== null) {
      this.telefonoHash = getCrypto().blindIndex(
        normalizeTelefono(this.telefonoCifrado),
      );
    }
  }
}
