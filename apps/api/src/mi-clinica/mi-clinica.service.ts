import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CuentaCobro } from '../cuentas-cobro/cuenta-cobro.entity.js';
import { Orden } from '../pedidos/orden.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateMiDoctorDto } from './dto/create-mi-doctor.dto.js';
import type { UpdateMiDoctorDto } from './dto/update-mi-doctor.dto.js';

@Injectable()
export class MiClinicaService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Orden)
    private readonly ordenRepo: Repository<Orden>,
    @InjectRepository(CuentaCobro)
    private readonly cuentaCobroRepo: Repository<CuentaCobro>,
  ) {}

  async resolveClinicaId(usuarioId: string): Promise<string> {
    const usuario = await this.usuarioRepo.findOneBy({ id: usuarioId });
    if (!usuario?.clinicaId) {
      throw new ForbiddenException('Sin clínica asignada');
    }
    return usuario.clinicaId;
  }

  async listDoctores(
    usuarioId: string,
    includeInactive = false,
  ): Promise<Doctor[]> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const where: FindOptionsWhere<Doctor> = { clinicaId };
    if (!includeInactive) where.activo = true;
    return this.doctorRepo.find({
      where,
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  async createDoctor(
    usuarioId: string,
    dto: CreateMiDoctorDto,
  ): Promise<Doctor> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const doctor = this.doctorRepo.create({
      clinicaId,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      correo: dto.correo ?? null,
      activo: true,
    });
    return this.doctorRepo.save(doctor);
  }

  async getDoctor(usuarioId: string, doctorId: string): Promise<Doctor> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const doctor = await this.doctorRepo.findOneBy({ id: doctorId, clinicaId });
    if (!doctor) throw new NotFoundException(`Doctor ${doctorId} no encontrado`);
    return doctor;
  }

  async updateDoctor(
    usuarioId: string,
    doctorId: string,
    dto: UpdateMiDoctorDto,
  ): Promise<Doctor> {
    const doctor = await this.getDoctor(usuarioId, doctorId);
    if (dto.nombres !== undefined) doctor.nombres = dto.nombres;
    if (dto.apellidos !== undefined) doctor.apellidos = dto.apellidos;
    if (dto.correo !== undefined) doctor.correo = dto.correo ?? null;
    return this.doctorRepo.save(doctor);
  }

  async deactivateDoctor(usuarioId: string, doctorId: string): Promise<Doctor> {
    const doctor = await this.getDoctor(usuarioId, doctorId);
    doctor.activo = false;
    return this.doctorRepo.save(doctor);
  }

  async listOrdenes(usuarioId: string): Promise<Orden[]> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    return this.ordenRepo
      .createQueryBuilder('o')
      .innerJoin('o.asignacion', 'asig')
      .innerJoin('asig.doctor', 'doctor')
      .innerJoinAndSelect('o.estado', 'estado')
      .where('doctor.clinicaId = :clinicaId', { clinicaId })
      .orderBy('o.fechaCreacion', 'DESC')
      .getMany();
  }

  async listCuentasCobro(usuarioId: string): Promise<CuentaCobro[]> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    return this.cuentaCobroRepo
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.clinica', 'clinica')
      .where('cc.clinicaId = :clinicaId', { clinicaId })
      .orderBy('cc.createdAt', 'DESC')
      .getMany();
  }
}
