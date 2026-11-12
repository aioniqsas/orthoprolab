import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { cedulaHashOrNull } from '../crypto/cedula.js';
import { getCrypto } from '../crypto/crypto.registry.js';
import { normalizarBusqueda } from '../common/busqueda.js';
import {
  digitosDe,
  nombreBuscable,
  palabrasNormalizadas,
  trigramas,
} from './busqueda-tokens.js';

import { enmascararCedula } from './cedula-visible.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { PacienteDoctor } from './paciente-doctor.entity.js';
import { Paciente } from './paciente.entity.js';



@Injectable()
export class PacientesService {
  constructor(
    @InjectRepository(Paciente)
    private readonly pacienteRepo: Repository<Paciente>,
    @InjectRepository(PacienteDoctor)
    private readonly pacienteDoctorRepo: Repository<PacienteDoctor>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async findByCedula(
    cedula: string,
  ): Promise<{ id: string; nombre: string } | null> {
    const hash = cedulaHashOrNull(cedula);
    if (!hash) return null;
    const p = await this.pacienteRepo.findOneBy({ cedulaHash: hash });
    if (!p) return null;
    return { id: p.id, nombre: p.nombre };
  }

  async findOrCreate(
    cedula: string,
    nombre: string,
  ): Promise<{ id: string; nombre: string }> {
    const existing = await this.findByCedula(cedula);
    if (existing) return existing;
    const p = this.pacienteRepo.create({ nombre, cedula });
    const saved = await this.pacienteRepo.save(p);
    await this.sincronizarBusqueda(saved);
    return { id: saved.id, nombre: saved.nombre };
  }

  async listForClinica(
    clinicaId: string,
    q?: string,
  ): Promise<Array<{ id: string; nombre: string; cedula: string | null }>> {
    const ids = await this.buscarIds(q);
    if (ids && ids.length === 0) return [];
    const qb = this.pacienteDoctorRepo
      .createQueryBuilder('pd')
      .innerJoin('pd.doctor', 'doctor')
      .innerJoinAndSelect('pd.paciente', 'paciente')
      .where('doctor.clinicaId = :clinicaId', { clinicaId })
      .orderBy('paciente.nombre', 'ASC');
    if (ids) qb.andWhere('paciente.id IN (:...ids)', { ids });
    const links = await qb.getMany();

    const seen = new Set<string>();
    const result: Array<{ id: string; nombre: string; cedula: string | null }> =
      [];
    for (const link of links) {
      if (!seen.has(link.pacienteId)) {
        seen.add(link.pacienteId);
        result.push({
          id: link.pacienteId,
          nombre: link.paciente.nombre,
          cedula: enmascararCedula(link.paciente.cedula),
        });
      }
    }
    return result;
  }

  async updateNombre(
    id: number,
    nombre: string,
  ): Promise<{ id: string; nombre: string }> {
    const p = await this.pacienteRepo.findOneBy({ id: String(id) });
    if (!p) throw new NotFoundException(`Paciente ${id} no encontrado.`);
    p.nombre = nombre;
    const saved = await this.pacienteRepo.save(p);
    await this.sincronizarBusqueda(saved);
    return { id: saved.id, nombre: saved.nombre };
  }

  /**
   * Rewrites this patient's blind search tokens (paciente_busqueda): one per
   * trigram of the name, plus the cedula and its last four digits. The rows
   * hold HMACs only; the plaintext never reaches the index.
   */
  async sincronizarBusqueda(paciente: { id: string; nombre: string; cedula: string | null }): Promise<void> {
    const crypto = getCrypto();
    const campos: string[] = [];
    const hashes: string[] = [];
    for (const t of trigramas(paciente.nombre)) {
      campos.push('nombre');
      hashes.push(crypto.tokenIndex('nombre', t));
    }
    const digitos = paciente.cedula ? digitosDe(paciente.cedula) : '';
    if (digitos) {
      campos.push('cedula', 'ultimos4');
      hashes.push(crypto.tokenIndex('cedula', digitos), crypto.tokenIndex('ultimos4', digitos.slice(-4)));
    }
    await this.pacienteRepo.query('DELETE FROM paciente_busqueda WHERE paciente_id = $1', [paciente.id]);
    if (hashes.length === 0) return;
    await this.pacienteRepo.query(
      `INSERT INTO paciente_busqueda (paciente_id, campo, token_hash)
       SELECT $1, x.campo, x.hash FROM unnest($2::text[], $3::text[]) AS x(campo, hash)
       ON CONFLICT DO NOTHING`,
      [paciente.id, campos, hashes],
    );
  }

  /**
   * Patient ids matching a search text, or null when there is no text.
   * - Digits: exact cedula, or the last four digits when the term has four.
   * - Letters: candidates from the blind trigram index, then the exact
   *   word match is checked on the names of those few candidates only.
   * The browser never receives the encrypted values to filter them itself.
   */
  async buscarIds(q?: string): Promise<string[] | null> {
    const texto = (q ?? '').trim();
    if (!texto) return null;
    const crypto = getCrypto();
    const digitos = digitosDe(texto);
    if (/^[\d.\-\s]+$/.test(texto)) {
      if (digitos.length < 4) return [];
      const params: string[] = [crypto.tokenIndex('cedula', digitos)];
      let condicion = "campo = 'cedula' AND token_hash = $1";
      if (digitos.length === 4) {
        params.push(crypto.tokenIndex('ultimos4', digitos));
        condicion += " OR (campo = 'ultimos4' AND token_hash = $2)";
      }
      const filas: Array<{ paciente_id: string }> = await this.pacienteRepo.query(
        `SELECT DISTINCT paciente_id FROM paciente_busqueda WHERE ${condicion}`,
        params,
      );
      return filas.map((f) => String(f.paciente_id));
    }
    if (!nombreBuscable(texto)) return [];
    const hashes = trigramas(texto).map((t) => crypto.tokenIndex('nombre', t));
    const candidatos: Array<{ paciente_id: string }> = await this.pacienteRepo.query(
      `SELECT paciente_id FROM paciente_busqueda
       WHERE campo = 'nombre' AND token_hash = ANY($1::char(64)[])
       GROUP BY paciente_id
       HAVING COUNT(DISTINCT token_hash) = $2`,
      [hashes, hashes.length],
    );
    if (candidatos.length === 0) return [];
    const ids = candidatos.map((c) => String(c.paciente_id));
    const pacientes = await this.pacienteRepo.find({ where: { id: In(ids) }, select: { id: true, nombre: true } });
    const palabras = palabrasNormalizadas(texto);
    return pacientes
      .filter((p) => {
        const nombre = normalizarBusqueda(p.nombre ?? '');
        return palabras.every((w) => nombre.includes(w));
      })
      .map((p) => p.id);
  }
}
