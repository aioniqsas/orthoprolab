import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { encryptedColumn } from '../crypto/encrypted-column.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import type { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';
import type { Pago } from './pago.entity.js';
import type { EnvioCuentaCobro } from './envio-cuenta-cobro.entity.js';

@Entity('cuenta_cobro')
export class CuentaCobro {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column()
  numero: string;

  @Column({ name: 'clinica_id', type: 'bigint' })
  clinicaId: string;

  @Column({ default: 'borrador' })
  estado: string;

  // Null until the account is issued (PDF generated); drafts are not emitted.
  @Column({ name: 'fecha_emision', type: 'date', nullable: true })
  fechaEmision: Date | null;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: Date | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: string;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ name: 'pdf_hash', type: 'varchar', length: 64, nullable: true })
  pdfHash: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  observaciones: string | null;

  @Column({ name: 'creada_por', type: 'uuid' })
  creadaPor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Clinica)
  @JoinColumn({ name: 'clinica_id' })
  clinica: Clinica;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creada_por' })
  creadaPorUsuario: Usuario;

  // String form avoids circular ESM import with the join entity
  @OneToMany('CuentaCobroOrden', 'cuentaCobro')
  ordenes: CuentaCobroOrden[];

  @OneToMany('Pago', 'cuentaCobro')
  pagos: Pago[];

  @OneToMany('EnvioCuentaCobro', 'cuentaCobro')
  envios: EnvioCuentaCobro[];
}
