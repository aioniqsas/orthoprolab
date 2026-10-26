import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CuentaCobro } from '../cuentas-cobro/cuenta-cobro.entity.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { PacientesService } from '../pacientes/pacientes.service.js';
import { Orden } from '../pedidos/orden.entity.js';
import type { CreateOrdenDto } from '../pedidos/dto/create-orden.dto.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { Servicio } from '../catalogo/servicio.entity.js';
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
    @InjectRepository(PacienteDoctor)
    private readonly pacienteDoctorRepo: Repository<PacienteDoctor>,
    @InjectRepository(Servicio)
    private readonly servicioRepo: Repository<Servicio>,
    private readonly pedidosService: PedidosService,
    private readonly pacientesService: PacientesService,
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

  async listPacientesDelDoctor(
    usuarioId: string,
    doctorId: string,
  ): Promise<PacienteDoctor[]> {
    await this.getDoctor(usuarioId, doctorId);
    return this.pacienteDoctorRepo.find({
      where: { doctorId },
      relations: { paciente: true },
      order: { fechaAsignacion: 'DESC' },
    });
  }

  async listServicios(): Promise<Servicio[]> {
    return this.servicioRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async createOrden(usuarioId: string, dto: CreateOrdenDto): Promise<Orden> {
    await this.getDoctor(usuarioId, dto.doctorId);
    return this.pedidosService.create(dto, usuarioId);
  }

  async listAllPacientes(
    usuarioId: string,
  ): Promise<Array<{ id: string; nombre: string; cedula: string | null }>> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    return this.pacientesService.listForClinica(clinicaId);
  }

  async updatePaciente(
    usuarioId: string,
    pacienteId: number,
    nombre: string,
  ): Promise<{ id: string; nombre: string }> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const inClinica = await this.pacientesService.listForClinica(clinicaId);
    const found = inClinica.find((p) => p.id === String(pacienteId));
    if (!found) {
      throw new NotFoundException(`Paciente ${pacienteId} no encontrado en esta clínica.`);
    }
    return this.pacientesService.updateNombre(pacienteId, nombre);
  }

  async createPaciente(
    usuarioId: string,
    cedula: string,
    nombre: string,
  ): Promise<{ id: string; nombre: string }> {
    if (!cedula?.trim() || !nombre?.trim()) {
      throw new BadRequestException('Cédula y nombre son obligatorios.');
    }
    // Verify the user belongs to a valid clinic.
    await this.resolveClinicaId(usuarioId);
    return this.pacientesService.findOrCreate(cedula.trim(), nombre.trim());
  }

  async getOrden(usuarioId: string, ordenId: string): Promise<Orden> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const orden = await this.ordenRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.estado', 'estado')
      .leftJoinAndSelect('o.asignacion', 'asig')
      .leftJoinAndSelect('asig.doctor', 'doctor')
      .leftJoinAndSelect('asig.paciente', 'paciente')
      .leftJoinAndSelect('o.detalles', 'detalles')
      .leftJoinAndSelect('detalles.servicio', 'servicio')
      .leftJoinAndSelect('o.historial', 'historial')
      .leftJoinAndSelect('historial.estadoAnterior', 'estadoAnterior')
      .leftJoinAndSelect('historial.estadoNuevo', 'estadoNuevo')
      .leftJoinAndSelect('historial.usuario', 'usuario')
      .where('o.id = :ordenId', { ordenId })
      .orderBy('historial.fechaCambio', 'DESC')
      .getOne();
    if (!orden) throw new NotFoundException(`Orden ${ordenId} no encontrada`);
    if (orden.asignacion?.doctor?.clinicaId !== clinicaId) {
      throw new NotFoundException(`Orden ${ordenId} no encontrada`);
    }
    return orden;
  }
}
