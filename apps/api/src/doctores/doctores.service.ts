import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { Doctor } from '../usuarios/doctor.entity.js';
import type { CreateDoctorDto } from './dto/create-doctor.dto.js';
import type { UpdateDoctorDto } from './dto/update-doctor.dto.js';

@Injectable()
export class DoctoresService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  findAll(clinicaId?: string): Promise<Doctor[]> {
    const where: FindOptionsWhere<Doctor> = {};
    if (clinicaId) where.clinicaId = clinicaId;
    return this.doctorRepo.find({
      where,
      relations: { clinica: true },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  findOne(id: string): Promise<Doctor | null> {
    return this.doctorRepo.findOne({
      where: { id },
      relations: { clinica: true },
    });
  }

  async create(dto: CreateDoctorDto): Promise<Doctor> {
    const doctor = this.doctorRepo.create({
      clinicaId: String(dto.clinicaId),
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      correo: dto.correo ?? null,
      activo: true,
    });
    return this.doctorRepo.save(doctor);
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOneBy({ id });
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);

    if (dto.nombres !== undefined) doctor.nombres = dto.nombres;
    if (dto.apellidos !== undefined) doctor.apellidos = dto.apellidos;
    if (dto.correo !== undefined) doctor.correo = dto.correo ?? null;
    if (dto.clinicaId !== undefined) doctor.clinicaId = String(dto.clinicaId);
    if (dto.activo !== undefined) doctor.activo = dto.activo;

    return this.doctorRepo.save(doctor);
  }

  async deactivate(id: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOneBy({ id });
    if (!doctor) throw new NotFoundException(`Doctor ${id} no encontrado`);
    doctor.activo = false;
    return this.doctorRepo.save(doctor);
  }
}
