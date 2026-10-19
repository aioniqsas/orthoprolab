import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';

/**
 * One refresh token. Tokens of a login share `familiaId`; each rotation adds a
 * row to the family and revokes the previous one. Only the SHA-256 hash of the
 * token is stored. No IP or user-agent is kept (data minimization).
 */
@Entity('sesion_refresco')
export class SesionRefresco {
  // bigint identity values are returned as strings by the pg driver.
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
    primaryKeyConstraintName: 'pk_sesion_refresco',
  })
  id: string;

  @Index('idx_sesion_refresco_usuario')
  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_sesion_refresco_usuario',
  })
  usuario: Usuario;

  @Index('idx_sesion_refresco_familia')
  @Column({ name: 'familia_id', type: 'uuid' })
  familiaId: string;

  @Index('uq_sesion_refresco_token_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  @Index('idx_sesion_refresco_expira')
  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ name: 'revocada_en', type: 'timestamptz', nullable: true })
  revocadaEn: Date | null;

  @Column({ name: 'reemplazada_por_id', type: 'bigint', nullable: true })
  reemplazadaPorId: string | null;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamptz' })
  creadaEn: Date;

  @Column({
    name: 'ultimo_uso_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  ultimoUsoEn: Date;
}
