import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';
import { EnvioCuentaCobro } from './envio-cuenta-cobro.entity.js';
import { Pago } from './pago.entity.js';
import { PdfCuentaCobroService } from './pdf-cuenta-cobro.service.js';
import { MailerCuentaCobroService } from './mailer-cuenta-cobro.service.js';
import { Orden } from '../pedidos/orden.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateCuentaCobroDto } from './dto/create-cuenta-cobro.dto.js';
import type { AdjuntarOrdenesDto } from './dto/adjuntar-ordenes.dto.js';
import type { EnviarCuentaCobroDto } from './dto/enviar-cuenta-cobro.dto.js';
import type { RegistrarPagoDto } from './dto/registrar-pago.dto.js';
import type { UpdateCuentaCobroDto } from './dto/update-cuenta-cobro.dto.js';

@Injectable()
export class CuentasCobroService {
  constructor(
    @InjectRepository(CuentaCobro)
    private readonly cuentaCobroRepo: Repository<CuentaCobro>,
    @InjectRepository(CuentaCobroOrden)
    private readonly cuentaCobroOrdenRepo: Repository<CuentaCobroOrden>,
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    @InjectRepository(Orden)
    private readonly ordenRepo: Repository<Orden>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(EnvioCuentaCobro)
    private readonly envioCuentaCobroRepo: Repository<EnvioCuentaCobro>,
    private readonly dataSource: DataSource,
    private readonly pdfService: PdfCuentaCobroService,
    private readonly mailerService: MailerCuentaCobroService,
  ) {}

  findAll(doctorId?: string): Promise<CuentaCobro[]> {
    const qb = this.cuentaCobroRepo
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.doctor', 'doctor')
      .orderBy('cc.createdAt', 'DESC');

    if (doctorId) {
      qb.where('cc.doctorId = :doctorId', { doctorId });
    }

    return qb.getMany();
  }

  findOne(id: string): Promise<CuentaCobro | null> {
    return this.cuentaCobroRepo.findOne({
      where: { id },
      relations: {
        doctor: true,
        creadaPorUsuario: true,
        ordenes: {
          orden: {
            estado: true,
            asignacion: { paciente: true, doctor: { usuario: true } },
            detalles: { servicio: true },
            historial: { estadoAnterior: true, estadoNuevo: true, usuario: true },
          },
        },
        pagos: true,
        envios: true,
      },
    });
  }

  async create(dto: CreateCuentaCobroDto, usuarioId: string): Promise<CuentaCobro> {
    return this.dataSource.transaction(async (em) => {
      const year = new Date().getFullYear();

      const [row] = await em.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM cuenta_cobro WHERE numero LIKE $1`,
        [`CC-${year}-%`],
      );
      const seq = String(Number(row.count) + 1).padStart(4, '0');
      const numero = `CC-${year}-${seq}`;

      const cuenta = em.create(CuentaCobro, {
        numero,
        doctorId: dto.doctorId,
        creadaPor: usuarioId,
        fechaEmision: new Date(),
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        observaciones: dto.observaciones ?? null,
        estado: 'borrador',
        total: '0',
      });

      return em.save(cuenta);
    });
  }

  async update(id: string, dto: UpdateCuentaCobroDto): Promise<CuentaCobro> {
    const cuenta = await this.cuentaCobroRepo.findOne({ where: { id } });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

    const updates: Partial<CuentaCobro> = {};

    if (dto.fechaVencimiento !== undefined) {
      updates.fechaVencimiento = dto.fechaVencimiento
        ? new Date(dto.fechaVencimiento)
        : null;
    }
    if (dto.observaciones !== undefined) {
      updates.observaciones = dto.observaciones;
    }
    if (dto.estado !== undefined) {
      updates.estado = dto.estado;
    }

    await this.cuentaCobroRepo.update({ id }, updates);
    return (await this.findOne(id))!;
  }

  async adjuntarOrdenes(
    cuentaCobroId: string,
    dto: AdjuntarOrdenesDto,
  ): Promise<CuentaCobro> {
    return this.dataSource.transaction(async (em) => {
      const cuenta = await em.findOne(CuentaCobro, { where: { id: cuentaCobroId } });
      if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

      if (cuenta.estado === 'anulada' || cuenta.estado === 'pagada') {
        throw new BadRequestException(
          `No se pueden adjuntar órdenes a una cuenta en estado "${cuenta.estado}".`,
        );
      }

      for (const ordenId of dto.ordenIds) {
        const orden = await em.findOne(Orden, { where: { id: String(ordenId) } });
        if (!orden) {
          throw new NotFoundException(`Orden ${ordenId} no encontrada.`);
        }

        // Ownership check: the order must belong to the doctor on this billing account
        if (orden.doctorId !== cuenta.doctorId) {
          throw new BadRequestException(
            `La orden ${ordenId} no pertenece al doctor de esta cuenta de cobro.`,
          );
        }

        // Prevent double-billing: check attachment to another active cuenta
        const conflicting = await em
          .createQueryBuilder(CuentaCobroOrden, 'cco')
          .innerJoin('cco.cuentaCobro', 'cc')
          .where('cco.ordenId = :ordenId', { ordenId: String(ordenId) })
          .andWhere('cc.estado != :anulada', { anulada: 'anulada' })
          .andWhere('cco.cuentaCobroId != :cuentaCobroId', { cuentaCobroId })
          .getOne();

        if (conflicting) {
          throw new BadRequestException(
            `La orden ${ordenId} ya está adjunta a otra cuenta de cobro activa.`,
          );
        }

        // Idempotent: skip if already attached to this cuenta
        const alreadyAttached = await em.findOne(CuentaCobroOrden, {
          where: { cuentaCobroId, ordenId: String(ordenId) },
        });
        if (!alreadyAttached) {
          const cco = em.create(CuentaCobroOrden, {
            cuentaCobroId,
            ordenId: String(ordenId),
            valorSnapshot: orden.valor,
          });
          await em.save(cco);
        }
      }

      // Recalculate total from all attached ordenes
      const allAttached = await em.find(CuentaCobroOrden, {
        where: { cuentaCobroId },
      });
      const newTotal = allAttached
        .reduce((sum, o) => sum + Number(o.valorSnapshot), 0)
        .toFixed(2);
      await em.update(CuentaCobro, { id: cuentaCobroId }, { total: newTotal });

      return (await this.findOne(cuentaCobroId))!;
    });
  }

  async desadjuntarOrden(
    cuentaCobroId: string,
    ordenId: string,
  ): Promise<CuentaCobro> {
    await this.cuentaCobroOrdenRepo.delete({ cuentaCobroId, ordenId });

    const allAttached = await this.cuentaCobroOrdenRepo.find({
      where: { cuentaCobroId },
    });
    const newTotal = allAttached
      .reduce((sum, o) => sum + Number(o.valorSnapshot), 0)
      .toFixed(2);
    await this.cuentaCobroRepo.update({ id: cuentaCobroId }, { total: newTotal });

    const cuenta = await this.findOne(cuentaCobroId);
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');
    return cuenta;
  }

  async registrarPago(
    cuentaCobroId: string,
    dto: RegistrarPagoDto,
    usuarioId: string,
  ): Promise<CuentaCobro> {
    return this.dataSource.transaction(async (em) => {
      const cuenta = await em.findOne(CuentaCobro, { where: { id: cuentaCobroId } });
      if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

      if (cuenta.estado === 'anulada' || cuenta.estado === 'pagada') {
        throw new BadRequestException(
          `No se pueden registrar pagos en una cuenta en estado "${cuenta.estado}".`,
        );
      }

      const pago = em.create(Pago, {
        cuentaCobroId,
        monto: String(dto.monto),
        fechaPago: new Date(dto.fechaPago),
        metodo: dto.metodo,
        referencia: dto.referencia ?? null,
        notas: dto.notas ?? null,
        registradoPor: usuarioId,
        anulado: false,
      });
      await em.save(pago);

      const allPagos = await em.find(Pago, {
        where: { cuentaCobroId, anulado: false },
      });
      const totalPagado = allPagos.reduce((sum, p) => sum + Number(p.monto), 0);
      const cuentaTotal = Number(cuenta.total);

      let nuevoEstado: string;
      if (totalPagado >= cuentaTotal) {
        nuevoEstado = 'pagada';
      } else if (totalPagado > 0) {
        nuevoEstado = 'pagada_parcial';
      } else {
        nuevoEstado = cuenta.estado;
      }

      await em.update(CuentaCobro, { id: cuentaCobroId }, { estado: nuevoEstado });

      return (await this.findOne(cuentaCobroId))!;
    });
  }

  async anularPago(cuentaCobroId: string, pagoId: string): Promise<CuentaCobro> {
    return this.dataSource.transaction(async (em) => {
      const pago = await em.findOne(Pago, {
        where: { id: pagoId, cuentaCobroId },
      });
      if (!pago) throw new NotFoundException('Pago no encontrado.');

      const cuenta = await em.findOne(CuentaCobro, { where: { id: cuentaCobroId } });
      if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

      await em.update(Pago, { id: pagoId }, { anulado: true });

      const allPagos = await em.find(Pago, {
        where: { cuentaCobroId, anulado: false },
      });
      const totalPagado = allPagos.reduce((sum, p) => sum + Number(p.monto), 0);
      const cuentaTotal = Number(cuenta.total);

      let nuevoEstado: string;
      if (totalPagado >= cuentaTotal) {
        nuevoEstado = 'pagada';
      } else if (totalPagado > 0) {
        nuevoEstado = 'pagada_parcial';
      } else {
        // All payments annulled; revert to emitida if it was in a payment state
        nuevoEstado = ['pagada', 'pagada_parcial'].includes(cuenta.estado)
          ? 'emitida'
          : cuenta.estado;
      }

      await em.update(CuentaCobro, { id: cuentaCobroId }, { estado: nuevoEstado });

      return (await this.findOne(cuentaCobroId))!;
    });
  }

  /**
   * Returns orders that belong to this billing account's doctor and are not
   * yet attached to any active (non-anulada) billing account.
   */
  async findOrdenesDisponibles(cuentaCobroId: string): Promise<Orden[]> {
    const cuenta = await this.cuentaCobroRepo.findOne({ where: { id: cuentaCobroId } });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

    // Subquery: orden IDs already in an active billing account (excluding the current one)
    const subQb = this.cuentaCobroOrdenRepo
      .createQueryBuilder('cco')
      .select('cco.ordenId')
      .innerJoin('cco.cuentaCobro', 'cc')
      .where('cc.estado != :anulada', { anulada: 'anulada' })
      .andWhere('cco.cuentaCobroId != :cuentaCobroId', { cuentaCobroId });

    return this.ordenRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.estado', 'estado')
      .leftJoinAndSelect('o.asignacion', 'asignacion')
      .leftJoinAndSelect('asignacion.paciente', 'paciente')
      .where('o.doctorId = :doctorId', { doctorId: cuenta.doctorId })
      .andWhere(`o.id NOT IN (${subQb.getQuery()})`)
      .setParameters(subQb.getParameters())
      .orderBy('o.fechaCreacion', 'DESC')
      .getMany();
  }

  /**
   * Generates a PDF for the given billing account, uploads it to Cloudinary,
   * and persists the resulting URL and hash on the entity.
   */
  async generarYGuardarPdf(id: string): Promise<CuentaCobro> {
    const cuenta = await this.findOne(id);
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

    const buffer = await this.pdfService.generate(cuenta);
    const { url, hash } = await this.pdfService.uploadToCloudinary(buffer, cuenta.numero);

    await this.cuentaCobroRepo.update({ id }, { pdfUrl: url, pdfHash: hash });
    return (await this.findOne(id))!;
  }

  /**
   * Sends the billing account PDF by email and records the attempt.
   * Generates the PDF first when no pdfUrl is stored yet.
   */
  async enviarPorEmail(
    id: string,
    dto: EnviarCuentaCobroDto,
    usuarioId: string,
  ): Promise<EnvioCuentaCobro> {
    let cuenta = await this.findOne(id);
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

    if (!cuenta.pdfUrl) {
      cuenta = await this.generarYGuardarPdf(id);
    }

    // cuenta.pdfUrl is now set (generarYGuardarPdf either found or generated it)
    const pdfUrl = cuenta.pdfUrl;
    if (!pdfUrl) {
      throw new InternalServerErrorException('PDF URL unavailable after generation.');
    }

    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      throw new InternalServerErrorException('Could not fetch PDF for email attachment.');
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    const result = await this.mailerService.sendCuentaCobro(cuenta, pdfBuffer, dto.email);

    const envio = this.envioCuentaCobroRepo.create({
      cuentaCobroId: cuenta.id,
      enviadoA: dto.email,
      estado: result.sent ? 'enviado' : 'fallido',
      error: result.error ?? null,
      enviadoPor: usuarioId,
    });
    return this.envioCuentaCobroRepo.save(envio);
  }
}
