import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { EstadoOrden } from '../catalogo/estado-orden.entity.js';
import { HistorialEstadoOrden } from './historial-estado-orden.entity.js';
import { Orden } from './orden.entity.js';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Orden)
    private readonly ordenRepo: Repository<Orden>,
    @InjectRepository(HistorialEstadoOrden)
    private readonly historialRepo: Repository<HistorialEstadoOrden>,
    @InjectRepository(EstadoOrden)
    private readonly estadoRepo: Repository<EstadoOrden>,
    private readonly dataSource: DataSource,
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
        asignacion: { doctor: { usuario: true }, paciente: true },
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
        asignacion: { doctor: { usuario: true }, paciente: true },
        detalles: { servicio: true },
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
    return this.dataSource.transaction(async (manager) => {
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
  }
}
