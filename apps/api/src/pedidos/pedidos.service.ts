import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { PacientesService } from '../pacientes/pacientes.service.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { DetalleOrden } from './detalle-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';
import { PedidosEventosService } from './pedidos-eventos.service.js';
import type { CreateOrdenDto } from './dto/create-orden.dto.js';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Orden)
    private readonly ordenRepo: Repository<Orden>,
    @InjectRepository(HistorialEstadoOrden)
    private readonly historialRepo: Repository<HistorialEstadoOrden>,
    @InjectRepository(EstadoOrden)
    private readonly estadoRepo: Repository<EstadoOrden>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(PacienteDoctor)
    private readonly pacienteDoctorRepo: Repository<PacienteDoctor>,
    private readonly dataSource: DataSource,
    private readonly pacientesService: PacientesService,
    private readonly eventos: PedidosEventosService,
  ) {}

  async findAll(filters?: {
    estadoId?: number;
    urgente?: boolean;
  }): Promise<Orden[]> {
    const where: FindOptionsWhere<Orden> = {};
    if (filters?.estadoId !== undefined) {
      where.estadoId = String(filters.estadoId);
    }
    if (filters?.urgente !== undefined) {
      where.urgente = filters.urgente;
    }
    return this.ordenRepo.find({
      where,
      relations: {
        estado: true,
        asignacion: { doctor: true, paciente: true },
        detalles: true,
        historial: { estadoAnterior: true, estadoNuevo: true, usuario: true },
      },
      order: { fechaCreacion: 'DESC' },
    });
  }

  /** Returns the order with full nested relations needed by the detail view. */
  async findOne(id: string): Promise<Orden | null> {
    return this.ordenRepo.findOne({
      where: { id },
      relations: {
        estado: true,
        asignacion: { doctor: true, paciente: true },
        detalles: true,
        historial: { estadoAnterior: true, estadoNuevo: true, usuario: true },
      },
      order: { historial: { fechaCambio: 'ASC' } },
    });
  }

  /**
   * Returns a map of { estadoCodigo: count } for every state that has at
   * least one order, plus a count of zero for states with no orders.
   */
  async getStats(): Promise<Record<string, number>> {
    const rows = await this.ordenRepo
      .createQueryBuilder('orden')
      .innerJoin('orden.estado', 'estado')
      .select('estado.codigo', 'codigo')
      .addSelect('COUNT(orden.id)::int', 'total')
      .groupBy('estado.codigo')
      .getRawMany<{ codigo: string; total: number }>();

    return Object.fromEntries(rows.map(({ codigo, total }) => [codigo, total]));
  }

  /** Returns all `estado_orden` rows ordered by their display position. */
  listEstados(): Promise<EstadoOrden[]> {
    return this.estadoRepo.find({ order: { posicion: 'ASC' } });
  }

  /** Returns all active doctors (standalone entity). */
  async listDoctores(): Promise<
    { id: string; nombres: string; apellidos: string; correo: string | null }[]
  > {
    const doctors = await this.doctorRepo.find({
      where: { activo: true },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
    return doctors.map((d) => ({
      id: d.id,
      nombres: d.nombres,
      apellidos: d.apellidos,
      correo: d.correo,
    }));
  }

  /** Returns patients assigned to a given doctor. */
  async listPacientesPorDoctor(
    doctorId: string,
  ): Promise<{ id: string; nombre: string }[]> {
    const rows = await this.pacienteDoctorRepo.find({
      where: { doctorId },
      relations: { paciente: true },
      order: { paciente: { nombre: 'ASC' } },
    });
    return rows.map((r) => ({
      id: r.pacienteId,
      nombre: r.paciente.nombre,
    }));
  }

  /**
   * Creates a new order inside a single transaction.
   * Validates doctor–patient assignment, active services, and seeds history.
   * Accepts either pacienteId (existing) or pacienteCedula+pacienteNombre
   * (inline patient lookup/creation).
   */
  async create(dto: CreateOrdenDto, usuarioId: string): Promise<Orden> {
    // Resolve pacienteId before entering the transaction so that
    // PacientesService uses its own connection context.
    let resolvedPacienteId: string;
    let ensureLink = false;

    if (dto.pacienteId !== undefined) {
      resolvedPacienteId = String(dto.pacienteId);
    } else if (dto.pacienteCedula && dto.pacienteNombre) {
      const p = await this.pacientesService.findOrCreate(
        dto.pacienteCedula,
        dto.pacienteNombre,
      );
      resolvedPacienteId = p.id;
      ensureLink = true;
    } else {
      throw new BadRequestException(
        'Proporciona pacienteId o (pacienteCedula + pacienteNombre).',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // When patient was resolved inline, ensure the PacienteDoctor link exists.
      if (ensureLink) {
        const existing = await manager.findOne(PacienteDoctor, {
          where: { doctorId: dto.doctorId, pacienteId: resolvedPacienteId },
        });
        if (!existing) {
          const link = manager.create(PacienteDoctor, {
            pacienteId: resolvedPacienteId,
            doctorId: dto.doctorId,
          });
          await manager.save(PacienteDoctor, link);
        }
      }

      // 1. Validate that the patient is assigned to this doctor.
      const asignacion = await manager.findOne(PacienteDoctor, {
        where: { doctorId: dto.doctorId, pacienteId: resolvedPacienteId },
      });
      if (!asignacion) {
        throw new BadRequestException(
          'El paciente no está asignado a este doctor.',
        );
      }

      // 2. Load the initial state.
      const estadoCreada = await manager.findOne(EstadoOrden, {
        where: { codigo: 'creada' },
      });
      if (!estadoCreada) {
        throw new BadRequestException(
          'Estado inicial "creada" no encontrado.',
        );
      }

      // 3. Snapshot the typed work lines (no catalog, no price: the amount is
      //    set when the order is attached to an invoice).
      type DetailSnapshot = {
        servicio: string;
        cantidad: number;
        dientes: number[];
        colorDiente: string;
        observaciones: string | null;
      };
      const snapshots: DetailSnapshot[] = [];

      for (const d of dto.detalles) {
        const numeros = new Set(d.dientes);
        if (numeros.size !== d.dientes.length) {
          throw new BadRequestException(
            `El trabajo "${d.servicio}" tiene dientes repetidos.`,
          );
        }
        snapshots.push({
          servicio: d.servicio,
          cantidad: d.cantidad,
          dientes: [...d.dientes],
          colorDiente: d.colorDiente,
          observaciones: d.observaciones ?? null,
        });
      }

      // 4. Insert Orden.
      const orden = manager.create(Orden, {
        doctorId: dto.doctorId,
        pacienteId: resolvedPacienteId,
        estadoId: estadoCreada.id,
        valor: '0.00',
        urgente: dto.urgente ?? false,
        // Parse at noon UTC so any ±12h timezone still lands on the correct day.
        fechaEntrega: dto.fechaEntrega ? new Date(`${dto.fechaEntrega}T12:00:00Z`) : null,
      });
      const savedOrden = await manager.save(Orden, orden);

      // 5. Insert DetalleOrden rows.
      for (const snap of snapshots) {
        const detalle = manager.create(DetalleOrden, {
          ordenId: savedOrden.id,
          servicio: snap.servicio,
          cantidad: snap.cantidad,
          dientes: snap.dientes,
          colorDiente: snap.colorDiente,
          observaciones: snap.observaciones,
        });
        await manager.save(DetalleOrden, detalle);
      }

      // 6. Seed first HistorialEstadoOrden entry.
      const histEntry = manager.create(HistorialEstadoOrden, {
        ordenId: savedOrden.id,
        estadoAnteriorId: null,
        estadoNuevoId: estadoCreada.id,
        usuarioId,
        observaciones: null,
      });
      await manager.save(HistorialEstadoOrden, histEntry);

      // 7. Return with full relations.
      const result = await manager.findOne(Orden, {
        where: { id: savedOrden.id },
        relations: {
          estado: true,
          asignacion: { doctor: true, paciente: true },
          detalles: true,
          historial: { estadoAnterior: true, estadoNuevo: true, usuario: true },
        },
      });
      if (!result) throw new NotFoundException('Orden no encontrada tras creación.');
      return result;
    });

    const doctor = await this.doctorRepo.findOne({ where: { id: result.doctorId } });
    this.eventos.emitir('creada', String(result.id), doctor?.clinicaId);
    return result;
  }

  /** Resolves the DB id of an estado_orden by its codigo. */
  async getEstadoIdByCodigo(codigo: string): Promise<string | null> {
    const estado = await this.estadoRepo.findOne({ where: { codigo } });
    return estado ? estado.id : null;
  }

  /**
   * Transitions an order to a new state and appends a history record.
   * Runs inside a single transaction.
   */
  async cambiarEstado(
    id: string,
    estadoId: string,
    usuarioId: string,
    observaciones?: string,
  ): Promise<Orden> {
    const result = await this.dataSource.transaction(async (manager) => {
      const orden = await manager.findOne(Orden, {
        where: { id },
        relations: { estado: true },
      });
      if (!orden) throw new NotFoundException('Orden no encontrada.');

      const nuevoEstado = await manager.findOne(EstadoOrden, {
        where: { id: estadoId },
      });
      if (!nuevoEstado) {
        throw new BadRequestException('Estado de orden no válido.');
      }

      const entrada = manager.create(HistorialEstadoOrden, {
        ordenId: orden.id,
        estadoAnteriorId: orden.estadoId,
        estadoNuevoId: nuevoEstado.id,
        usuarioId,
        observaciones: observaciones ?? null,
      });
      await manager.save(HistorialEstadoOrden, entrada);

      orden.estadoId = nuevoEstado.id;
      orden.estado = nuevoEstado;
      await manager.save(Orden, orden);

      return orden;
    });

    // Reload with estado relation for callers (the transaction result only has
    // the state we set, but keep shape consistent).
    const doctor = await this.doctorRepo.findOne({ where: { id: result.doctorId } });
    this.eventos.emitir('estado', String(result.id), doctor?.clinicaId);
    return result;
  }
}
