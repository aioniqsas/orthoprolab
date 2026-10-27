import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('metodo_pago_bancario')
export class MetodoPagoBancario {
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
  })
  id: string;

  @Column({ length: 120 })
  banco: string;

  @Column({ name: 'tipo_cuenta', length: 60 })
  tipoCuenta: string;

  @Column({ name: 'numero_cuenta', length: 40 })
  numeroCuenta: string;

  @Column({ length: 160 })
  titular: string;

  @Column({ name: 'qr_url', type: 'varchar', length: 500, nullable: true })
  qrUrl: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
