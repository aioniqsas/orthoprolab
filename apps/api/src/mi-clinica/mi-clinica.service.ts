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
import { PdfControlTrabajosService } from '../pedidos/pdf-control-trabajos.service.js';
import { MailerControlTrabajosService } from '../pedidos/mailer-control-trabajos.service.js';
import { coincideBusqueda } from '../common/busqueda.js';
import { coincideOrden } from '../pedidos/orden-busqueda.js';
import { Servicio } from '../catalogo/servicio.entity.js';
import { Clinica } from '../usuarios/clinica.entity.js';
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
    @InjectRepository(Clinica)
    private readonly clinicaRepo: Repository<Clinica>,
    private readonly pedidosService: PedidosService,
    private readonly pdfControlTrabajos: PdfControlTrabajosService,
    private readonly mailerControlTrabajos: MailerControlTrabajosService,
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

  async listOrdenes(usuarioId: string, q?: string): Promise<Orden[]> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const ordenes = await this.ordenRepo
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.asignacion', 'asig')
      .innerJoinAndSelect('asig.doctor', 'doctor')
      .innerJoinAndSelect('asig.paciente', 'paciente')
      .innerJoinAndSelect('o.estado', 'estado')
      .where('doctor.clinicaId = :clinicaId', { clinicaId })
      .orderBy('o.fechaCreacion', 'DESC')
      .getMany();
    // The clinic's table also searched the state name.
    return ordenes.filter((o) => coincideOrden(o, q, [o.estado?.nombre]));
  }

  /** Clinic portal: drafts are still internal, so they never reach the client. */
  async listCuentasCobro(usuarioId: string, q?: string): Promise<CuentaCobro[]> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const cuentas = await this.cuentaCobroRepo
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.clinica', 'clinica')
      .where('cc.clinicaId = :clinicaId', { clinicaId })
      .andWhere('cc.estado != :borrador', { borrador: 'borrador' })
      .orderBy('cc.createdAt', 'DESC')
      .getMany();
    return cuentas.filter((c) => coincideBusqueda(q, [c.numero]));
  }

  /** Detail view for the client portal; rejects accounts from other clinics. */
  async getCuentaCobro(usuarioId: string, cuentaId: string): Promise<CuentaCobro> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    const cuenta = await this.cuentaCobroRepo.findOne({
      where: { id: cuentaId, clinicaId },
      relations: { clinica: true, pagos: true },
    });
    if (!cuenta || cuenta.estado === 'borrador') {
      throw new NotFoundException('Cuenta de cobro no encontrada.');
    }
    cuenta.pagos.sort((a, b) => Number(b.id) - Number(a.id));
    return cuenta;
  }

  async listPacientesDelDoctor(
    usuarioId: string,
    doctorId: string,
    q?: string,
  ): Promise<PacienteDoctor[]> {
    await this.getDoctor(usuarioId, doctorId);
    const vinculos = await this.pacienteDoctorRepo.find({
      where: { doctorId },
      relations: { paciente: true },
      order: { fechaAsignacion: 'DESC' },
    });
    return vinculos.filter((v) => coincideBusqueda(q, [v.paciente?.nombre, v.paciente?.cedula]));
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

  async updateOrden(usuarioId: string, ordenId: string, dto: import('../pedidos/dto/update-orden.dto.js').UpdateOrdenDto) {
    await this.getOrden(usuarioId, ordenId);
    return this.pedidosService.update(ordenId, dto);
  }

  async cancelarOrden(ordenId: string, usuarioId: string, observaciones?: string) {
    await this.getOrden(usuarioId, ordenId);
    return this.pedidosService.cancelar(ordenId, usuarioId, observaciones);
  }

  async listAllPacientes(
    usuarioId: string,
    q?: string,
  ): Promise<Array<{ id: string; nombre: string; cedula: string | null }>> {
    const clinicaId = await this.resolveClinicaId(usuarioId);
    return this.pacientesService.listForClinica(clinicaId, q);
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

  async devolverOrden(
    usuarioId: string,
    ordenId: string,
    observaciones: string,
  ): Promise<Orden> {
    const trimmed = (observaciones ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('La observación es obligatoria para devolver una orden.');
    }
    // Ownership check.
    const orden = await this.getOrden(usuarioId, ordenId);
    if (orden.estado?.esFinal) {
      throw new ForbiddenException(
        `No se puede cambiar el estado de una orden en estado "${orden.estado.nombre}".`,
      );
    }

    if (orden.estado?.codigo !== 'en_entrega') {
      throw new BadRequestException('Solo se puede devolver una orden que esté en entrega al cliente.');
    }

    const estadoId = await this.pedidosService.getEstadoIdByCodigo('devuelta_correccion');
    if (!estadoId) {
      throw new BadRequestException('Estado "devuelta_correccion" no encontrado.');
    }

    return this.pedidosService.cambiarEstado(ordenId, estadoId, usuarioId, trimmed);
  }

  async finalizarOrden(
    usuarioId: string,
    ordenId: string,
    observaciones?: string,
  ): Promise<Orden> {
    const orden = await this.getOrden(usuarioId, ordenId);
    if (orden.estado?.esFinal) {
      throw new ForbiddenException(
        `No se puede cambiar el estado de una orden en estado "${orden.estado.nombre}".`,
      );
    }

    if (orden.estado?.codigo !== 'en_entrega') {
      throw new BadRequestException('Solo se puede finalizar una orden que esté en entrega al cliente.');
    }

    const estadoId = await this.pedidosService.getEstadoIdByCodigo('terminada');
    if (!estadoId) {
      throw new BadRequestException('Estado "terminada" no encontrado.');
    }

    const result = await this.pedidosService.cambiarEstado(ordenId, estadoId, usuarioId, (observaciones ?? '').trim() || undefined);

    // Send the control de trabajos only to the clinic (best-effort).
    try {
      const usuario = await this.usuarioRepo.findOneBy({ id: usuarioId });
      const clinica = usuario?.clinicaId
        ? await this.clinicaRepo.findOneBy({ id: usuario.clinicaId })
        : null;
      if (clinica?.correo) {
        const ordenCompleta = await this.getOrden(usuarioId, ordenId);
        const pdfBuffer = await this.pdfControlTrabajos.generate(ordenCompleta);
        await this.mailerControlTrabajos.sendControlTrabajos(clinica.correo, pdfBuffer, ordenId);
      }
    } catch (err) {
      // Do not fail finalization if email fails.
      console.error('Failed to send control de trabajos email:', err);
    }

    return result;
  }

  /**
   * Control de trabajos de una orden terminada, para descargar desde el portal
   * sin depender del correo. Se genera al momento: los datos de una orden
   * terminada ya no cambian (ni la orden ni su historial admiten cambios).
   */
  async controlTrabajos(usuarioId: string, ordenId: string): Promise<Buffer> {
    // getOrden aplica la verificación de pertenencia a la clínica.
    const orden = await this.getOrden(usuarioId, ordenId);
    if (orden.estado?.codigo !== 'terminada') {
      throw new BadRequestException(
        'El control de trabajos está disponible cuando la orden está terminada.',
      );
    }
    return this.pdfControlTrabajos.generate(orden);
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
