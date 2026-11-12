import { coincideOrden } from './orden-busqueda.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { Paciente } from '../pacientes/paciente.entity.js';
import { PacientesService } from '../pacientes/pacientes.service.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { DetalleOrden } from './detalle-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';
import { PedidosEventosService } from './pedidos-eventos.service.js';
import type { CreateOrdenDto } from './dto/create-orden.dto.js';
import type { UpdateOrdenDto } from './dto/update-orden.dto.js';
import { diaBogota, parseFechaEntrega } from './fecha-entrega.js';

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
    q?: string;
  }): Promise<Orden[]> {
    const where: FindOptionsWhere<Orden> = {};
    if (filters?.estadoId !== undefined) {
      where.estadoId = String(filters.estadoId);
    }
    if (filters?.urgente !== undefined) {
      where.urgente = filters.urgente;
    }
    // Lista liviana: la tabla no usa detalles ni historial (se piden en el
    // detalle con findOne). Ver optimizacion B2.
    const ordenes = await this.ordenRepo.find({
      where,
      relations: {
        estado: true,
        asignacion: { doctor: true, paciente: true },
      },
      order: { fechaCreacion: 'DESC' },
    });
    return ordenes.filter((o) => coincideOrden(o, filters?.q));
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

    if (dto.pacienteId !== undefined) {
      resolvedPacienteId = String(dto.pacienteId);
    } else if (dto.pacienteCedula && dto.pacienteNombre) {
      const p = await this.pacientesService.findOrCreate(
        dto.pacienteCedula,
        dto.pacienteNombre,
      );
      resolvedPacienteId = p.id;
    } else {
      throw new BadRequestException(
        'Proporciona pacienteId o (pacienteCedula + pacienteNombre).',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // 1. A patient may be treated by doctors of different clinics, so the
      //    doctor↔patient link is created on demand instead of being required.
      const paciente = await manager.findOne(Paciente, {
        where: { id: resolvedPacienteId },
      });
      if (!paciente) {
        throw new BadRequestException(
          `Paciente ${resolvedPacienteId} no encontrado.`,
        );
      }
      const asignacion = await manager.findOne(PacienteDoctor, {
        where: { doctorId: dto.doctorId, pacienteId: resolvedPacienteId },
      });
      if (!asignacion) {
        const link = manager.create(PacienteDoctor, {
          pacienteId: resolvedPacienteId,
          doctorId: dto.doctorId,
        });
        await manager.save(PacienteDoctor, link);
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
        fechaEntrega: parseFechaEntrega(dto.fechaEntrega),
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
      // Los estados marcados como finales no admiten salida.
      if (orden.estado?.esFinal) {
        throw new ForbiddenException(
          `No se puede cambiar el estado de una orden en estado "${orden.estado.nombre}".`,
        );
      }

      const nuevoEstado = await manager.findOne(EstadoOrden, {
        where: { id: estadoId },
      });
      if (!nuevoEstado) {
        throw new BadRequestException('Estado de orden no válido.');
      }
      // Anular una orden exige el motivo y el flujo de cancelación.
      if (nuevoEstado.codigo === 'cancelada') {
        throw new BadRequestException('Para anular una orden usa la acción de cancelación.');
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

  /** Edit an order only while it is in 'creada' state. */
  async update(id: string, dto: UpdateOrdenDto): Promise<Orden> {
    const result = await this.dataSource.transaction(async (manager) => {
      const orden = await manager.findOne(Orden, {
        where: { id },
        relations: { estado: true },
      });
      if (!orden) throw new NotFoundException('Orden no encontrada.');
      if (orden.estado?.codigo !== 'creada') {
        throw new ForbiddenException('Solo se puede editar una orden en estado Creada.');
      }

      if (dto.urgente !== undefined) {
        orden.urgente = dto.urgente;
      }
      if (dto.fechaEntrega !== undefined) {
        orden.fechaEntrega = parseFechaEntrega(
          dto.fechaEntrega,
          diaBogota(orden.fechaCreacion),
        );
      }

      if (dto.detalles) {
        await manager.delete(DetalleOrden, { ordenId: orden.id });
        for (const d of dto.detalles) {
          const numeros = new Set(d.dientes);
          if (numeros.size !== d.dientes.length) {
            throw new BadRequestException(
              `El trabajo "${d.servicio}" tiene dientes repetidos.`,
            );
          }
          const detalle = manager.create(DetalleOrden, {
            ordenId: orden.id,
            servicio: d.servicio,
            cantidad: d.cantidad,
            dientes: [...d.dientes],
            colorDiente: d.colorDiente,
            observaciones: d.observaciones ?? null,
          });
          await manager.save(DetalleOrden, detalle);
        }
      }

      await manager.save(Orden, orden);

      const full = await manager.findOne(Orden, {
        where: { id: orden.id },
        relations: {
          estado: true,
          asignacion: { doctor: true, paciente: true },
          detalles: true,
          historial: { estadoAnterior: true, estadoNuevo: true, usuario: true },
        },
      });
      if (!full) throw new NotFoundException('Orden no encontrada tras actualizar.');
      return full;
    });

    const doctor = await this.doctorRepo.findOne({ where: { id: result.doctorId } });
    this.eventos.emitir('actualizada', String(result.id), doctor?.clinicaId);
    return result;
  }

  /** Cancel an order from any non-final state. */
  async cancelar(id: string, usuarioId: string, observaciones?: string): Promise<Orden> {
    const estadoCancelada = await this.estadoRepo.findOne({ where: { codigo: 'cancelada' } });
    if (!estadoCancelada) {
      throw new BadRequestException('Estado cancelada no encontrado.');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const orden = await manager.findOne(Orden, {
        where: { id },
        relations: { estado: true },
      });
      if (!orden) throw new NotFoundException('Orden no encontrada.');
      if (orden.estado?.esFinal) {
        throw new ForbiddenException(
          `No se puede cancelar una orden en estado "${orden.estado.nombre}".`,
        );
      }

      const entrada = manager.create(HistorialEstadoOrden, {
        ordenId: orden.id,
        estadoAnteriorId: orden.estadoId,
        estadoNuevoId: estadoCancelada.id,
        usuarioId,
        observaciones: observaciones?.trim() || null,
      });
      await manager.save(HistorialEstadoOrden, entrada);

      orden.estadoId = estadoCancelada.id;
      // A populated relation wins over the FK on save: without this TypeORM
      // rewrites estado_id with the previous state and only the history moves.
      orden.estado = estadoCancelada;
      await manager.save(Orden, orden);

      const full = await manager.findOne(Orden, {
        where: { id: orden.id },
        relations: {
          estado: true,
          asignacion: { doctor: true, paciente: true },
          detalles: true,
          historial: { estadoAnterior: true, estadoNuevo: true, usuario: true },
        },
      });
      if (!full) throw new NotFoundException('Orden no encontrada tras cancelar.');
      return full;
    });

    const doctor = await this.doctorRepo.findOne({ where: { id: result.doctorId } });
    this.eventos.emitir('estado', String(result.id), doctor?.clinicaId);
    return result;
  }
}
