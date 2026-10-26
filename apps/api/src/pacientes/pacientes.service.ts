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
