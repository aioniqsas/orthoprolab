import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { cedulaHashOrNull } from '../crypto/cedula.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { PacienteDoctor } from './paciente-doctor.entity.js';
import { Paciente } from './paciente.entity.js';

function maskCedula(cedula: string | null): string | null {
  if (!cedula) return null;
  if (cedula.length <= 3) return cedula;
  return '*'.repeat(cedula.length - 3) + cedula.slice(-3);
}

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
    return { id: saved.id, nombre: saved.nombre };
  }

  /**
   * Resolución con alcance de clínica (decision del producto: los pacientes
   * siguen globales por cédula, pero el vínculo con el doctor es explícito).
   * Con doctorId, el paciente existente se vincula a ese doctor si no lo está
   * ya; sin doctorId se devuelve el paciente sin adivinar vínculo.
   */
  async findOrCreateForClinica(
    cedula: string,
    nombre: string,
    doctorId: string | null,
  ): Promise<{ id: string; nombre: string }> {
    const existing = await this.findByCedula(cedula);
    if (!existing) {
      const created = await this.findOrCreate(cedula, nombre);
      if (doctorId) await this.ensureLink(created.id, doctorId);
      return created;
    }
    if (doctorId) await this.ensureLink(existing.id, doctorId);
    return existing;
  }

  /** Crea el vínculo o restaura uno borrado suave; es idempotente. */
  private async ensureLink(pacienteId: string, doctorId: string): Promise<void> {
    const link = await this.pacienteDoctorRepo.findOne({
      where: { pacienteId, doctorId },
      withDeleted: true,
    });
    if (!link) {
      await this.pacienteDoctorRepo.save(
        this.pacienteDoctorRepo.create({ pacienteId, doctorId }),
      );
    } else if (link.eliminadoEn) {
      await this.pacienteDoctorRepo.restore({ pacienteId, doctorId });
    }
  }

  async listForClinica(
    clinicaId: string,
  ): Promise<Array<{ id: string; nombre: string; cedula: string | null }>> {
    const links = await this.pacienteDoctorRepo
      .createQueryBuilder('pd')
      .innerJoin('pd.doctor', 'doctor')
      .innerJoinAndSelect('pd.paciente', 'paciente')
      .where('doctor.clinicaId = :clinicaId', { clinicaId })
      .orderBy('paciente.nombre', 'ASC')
      .getMany();

    const seen = new Set<string>();
    const result: Array<{ id: string; nombre: string; cedula: string | null }> =
      [];
    for (const link of links) {
      if (!seen.has(link.pacienteId)) {
        seen.add(link.pacienteId);
        result.push({
          id: link.pacienteId,
          nombre: link.paciente.nombre,
          cedula: maskCedula(link.paciente.cedula),
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
    return { id: saved.id, nombre: saved.nombre };
  }
}
