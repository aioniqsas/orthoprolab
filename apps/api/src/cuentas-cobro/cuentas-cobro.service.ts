import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Brackets, DataSource, In } from 'typeorm';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';
import { EnvioCuentaCobro } from './envio-cuenta-cobro.entity.js';
import { Pago } from './pago.entity.js';
import { MetodoPagoBancario } from './metodo-pago-bancario.entity.js';
import { PdfCuentaCobroService } from './pdf-cuenta-cobro.service.js';
import { MailerCuentaCobroService } from './mailer-cuenta-cobro.service.js';
import { ComprobanteStorageService } from './comprobante-storage.service.js';
import { CuentasCobroEventosService } from './cuentas-cobro-eventos.service.js';
import { detectComprobanteType } from './comprobante-upload.interceptor.js';
import { Orden } from '../pedidos/orden.entity.js';
import { PdfControlTrabajosService } from '../pedidos/pdf-control-trabajos.service.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateCuentaCobroDto } from './dto/create-cuenta-cobro.dto.js';
import type { AdjuntarOrdenesDto } from './dto/adjuntar-ordenes.dto.js';
import type { EnviarCuentaCobroDto } from './dto/enviar-cuenta-cobro.dto.js';
import type { RegistrarPagoDto } from './dto/registrar-pago.dto.js';
import type { RegistrarComprobanteDto } from './dto/registrar-comprobante.dto.js';
import type { UpdateCuentaCobroDto } from './dto/update-cuenta-cobro.dto.js';
import { patronBusqueda, sinAcentosSql } from '../common/busqueda.js';

@Injectable()
export class CuentasCobroService {
  private readonly logger = new Logger(CuentasCobroService.name);

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
    @InjectRepository(MetodoPagoBancario)
    private readonly metodoPagoRepo: Repository<MetodoPagoBancario>,
    private readonly dataSource: DataSource,
    private readonly pdfService: PdfCuentaCobroService,
    private readonly mailerService: MailerCuentaCobroService,
    private readonly comprobanteStorage: ComprobanteStorageService,
    private readonly pdfControlTrabajos: PdfControlTrabajosService,
    private readonly eventos: CuentasCobroEventosService,
  ) {}

  async findAll(clinicaId?: string, q?: string): Promise<CuentaCobro[]> {
    const qb = this.cuentaCobroRepo
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.clinica', 'clinica')
      .orderBy('cc.createdAt', 'DESC');

    if (clinicaId) {
      qb.where('cc.clinicaId = :clinicaId', { clinicaId });
    }
    // Searched in the database: number, clinic name and clinic email.
    const patron = patronBusqueda(q);
    if (patron) {
      qb.andWhere(
        new Brackets((w) => {
          for (const col of ['cc.numero', 'clinica.nombre', 'clinica.correo']) {
            w.orWhere(`${sinAcentosSql(col)} LIKE :patron ESCAPE '\\'`, { patron });
          }
        }),
      );
    }
    return qb.getMany();
  }

  findOne(id: string): Promise<CuentaCobro | null> {
    return this.cuentaCobroRepo.findOne({
      where: { id },
      relations: {
        clinica: true,
        creadaPorUsuario: true,
        ordenes: {
          orden: {
            estado: true,
            asignacion: { paciente: true, doctor: true },
            detalles: true,
          },
        },
        pagos: true,
        envios: true,
      },
    });
  }

  async create(dto: CreateCuentaCobroDto, usuarioId: string): Promise<CuentaCobro> {
    const creada = await this.dataSource.transaction(async (em) => {
      const year = new Date().getFullYear(); // shortcut: kept native for year only

      const [row] = await em.query<{ count: string }[]>(
        `SELECT COUNT(*) AS count FROM cuenta_cobro WHERE numero LIKE $1`,
        [`CC-${year}-%`],
      );
      const seq = String(Number(row.count) + 1).padStart(4, '0');
      const numero = `CC-${year}-${seq}`;

      const cuenta = em.create(CuentaCobro, {
        numero,
        clinicaId: String(dto.clinicaId),
        creadaPor: usuarioId,
        fechaEmision: null,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        observaciones: dto.observaciones ?? null,
        estado: 'borrador',
        total: '0',
      });

      return em.save(cuenta);
    });

    this.eventos.emitir('creada', creada.id);
    return creada;
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
    const actualizada = (await this.findOne(id))!;
    this.eventos.emitir('actualizada', actualizada.id);
    return actualizada;
  }

  async adjuntarOrdenes(
    cuentaCobroId: string,
    dto: AdjuntarOrdenesDto,
  ): Promise<CuentaCobro> {
    const adjuntada = await this.dataSource.transaction(async (em) => {
      const cuenta = await em.findOne(CuentaCobro, { where: { id: cuentaCobroId } });
      if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

      if (cuenta.estado === 'anulada' || cuenta.estado === 'pagada') {
        throw new BadRequestException(
          `No se pueden adjuntar órdenes a una cuenta en estado "${cuenta.estado}".`,
        );
      }
      // shortcut: an issued account can still change its orders (and total) after the
      // client saw the PDF. Freeze edits at emitida if a stale PDF becomes a real problem.

      for (const { ordenId, valor } of dto.ordenes) {
        const orden = await em.findOne(Orden, {
          where: { id: String(ordenId) },
          relations: { estado: true },
        });
        if (!orden) {
          throw new NotFoundException(`Orden ${ordenId} no encontrada.`);
        }

        // Solo se cobra trabajo aceptado por el cliente: `terminada` es el único
        // estado que exige su confirmación, y `cancelada` nunca es facturable.
        if (orden.estado?.codigo !== 'terminada') {
          throw new BadRequestException(
            `Solo se cobran órdenes terminadas. La orden ${ordenId} está en estado "${
              orden.estado?.nombre ?? 'desconocido'
            }".`,
          );
        }

        // Ownership check: verify order's doctor belongs to this clinic
        const [ownership] = await em.query<{ belongs: boolean }[]>(
          `SELECT EXISTS(
            SELECT 1 FROM doctor d
            WHERE d.id = $1 AND d.clinica_id = $2
          ) AS belongs`,
          [orden.doctorId, cuenta.clinicaId],
        );
        if (!ownership?.belongs) {
          throw new BadRequestException(
            `La orden ${ordenId} no pertenece a la clínica de esta cuenta de cobro.`,
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
            valorSnapshot: valor.toFixed(2),
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

    this.eventos.emitir('actualizada', adjuntada.id);
    return adjuntada;
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
    this.eventos.emitir('actualizada', cuenta.id);
    return cuenta;
  }

  async registrarPago(
    cuentaCobroId: string,
    dto: RegistrarPagoDto,
    usuarioId: string,
    comprobante?: { url: string; nombre: string },
  ): Promise<CuentaCobro> {
    await this.dataSource.transaction(async (em) => {
      const cuenta = await em.findOne(CuentaCobro, { where: { id: cuentaCobroId } });
      if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

      if (['borrador', 'anulada', 'pagada'].includes(cuenta.estado)) {
        throw new BadRequestException(
          cuenta.estado === 'borrador'
            ? 'No se pueden registrar pagos en una cuenta sin emitir.'
            : `No se pueden registrar pagos en una cuenta en estado "${cuenta.estado}".`,
        );
      }

      const pago = em.create(Pago, {
        cuentaCobroId,
        monto: String(dto.monto),
        fechaPago: new Date(dto.fechaPago),
        metodo: dto.metodo,
        referencia: dto.referencia ?? null,
        notas: dto.notas ?? null,
        comprobanteUrl: comprobante?.url ?? null,
        comprobanteNombre: comprobante?.nombre ?? null,
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
    });

    // Read after commit: the transaction's writes are invisible to the global repo.
    const conPago = (await this.findOne(cuentaCobroId))!;
    this.eventos.emitir('pago', conPago.id);
    return conPago;
  }

  listMetodosPagoBancarios(): Promise<MetodoPagoBancario[]> {
    return this.metodoPagoRepo.find({
      where: { activo: true },
      order: { orden: 'ASC', id: 'ASC' },
    });
  }

  /**
   * Client portal flow: validates the receipt type, stores it and registers the
   * payment, then notifies every active administrator by email.
   */
  async registrarPagoDesdeClinica(
    cuentaCobroId: string,
    usuarioId: string,
    dto: RegistrarComprobanteDto,
    file: { buffer: Buffer; originalname: string },
  ): Promise<CuentaCobro> {
    const cuentaPrevia = await this.findOne(cuentaCobroId);
    if (!cuentaPrevia) {
      throw new NotFoundException('Cuenta de cobro no encontrada.');
    }
    if (cuentaPrevia.estado === 'anulada' || cuentaPrevia.estado === 'pagada') {
      throw new BadRequestException(
        `No se pueden registrar pagos en una cuenta en estado "${cuentaPrevia.estado}".`,
      );
    }
    if (!detectComprobanteType(file.buffer)) {
      throw new BadRequestException(
        'El comprobante debe ser un PDF o una imagen (JPG, PNG o WebP).',
      );
    }

    const url = await this.comprobanteStorage.upload(
      file.buffer,
      file.originalname,
    );

    const cuenta = await this.registrarPago(
      cuentaCobroId,
      {
        monto: dto.monto,
        fechaPago: dto.fechaPago,
        metodo: 'transferencia',
        referencia: dto.referencia,
        notas: dto.notas,
      },
      usuarioId,
      { url, nombre: file.originalname.slice(0, 255) },
    );

    const pago = await this.pagoRepo.findOne({
      where: { cuentaCobroId, comprobanteUrl: url },
      order: { id: 'DESC' },
    });
    const administradores = await this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoin('u.rol', 'rol')
      .where('rol.nombre = :rol', { rol: 'administrador' })
      .andWhere('u.activo = true')
      .getMany();

    if (pago && administradores.length > 0) {
      const result = await this.mailerService.sendPagoRegistrado(
        cuenta,
        pago,
        administradores.map((a) => a.correo),
      );
      if (!result.sent) {
        this.logger.warn(
          `Pago ${pago.id} registrado, pero el correo a administradores falló: ${result.error ?? 'sin detalle'}`,
        );
      }
    }

    this.eventos.emitir('pago', cuenta.id);
    return cuenta;
  }

  async anularPago(cuentaCobroId: string, pagoId: string): Promise<CuentaCobro> {
    await this.dataSource.transaction(async (em) => {
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
        nuevoEstado = ['pagada', 'pagada_parcial'].includes(cuenta.estado)
          ? 'emitida'
          : cuenta.estado;
      }

      await em.update(CuentaCobro, { id: cuentaCobroId }, { estado: nuevoEstado });
    });

    const anulada = (await this.findOne(cuentaCobroId))!;
    this.eventos.emitir('pago', anulada.id);
    return anulada;
  }

  /**
   * Returns orders whose doctor belongs to this billing account's clinic and
   * are not yet attached to any active (non-anulada) billing account — the
   * current one included, so an attached order never shows up as available
   * again.
   */
  async findOrdenesDisponibles(cuentaCobroId: string): Promise<Orden[]> {
    const cuenta = await this.cuentaCobroRepo.findOne({ where: { id: cuentaCobroId } });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

    // Only anulada frees an order: an order already billed by any active account
    // is not available, and that includes this account's own.
    const subQb = this.cuentaCobroOrdenRepo
      .createQueryBuilder('cco')
      .select('cco.ordenId')
      .innerJoin('cco.cuentaCobro', 'cc')
      .where('cc.estado != :anulada', { anulada: 'anulada' });

    return this.ordenRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.estado', 'estado')
      .leftJoinAndSelect('o.asignacion', 'asignacion')
      .leftJoinAndSelect('asignacion.paciente', 'paciente')
      .where(
        `o.doctor_id IN (SELECT d.id FROM doctor d WHERE d.clinica_id = :clinicaId)`,
        { clinicaId: cuenta.clinicaId },
      )
      .andWhere(`o.id NOT IN (${subQb.getQuery()})`)
      .andWhere('estado.codigo = :terminada')
      .setParameters({
        ...subQb.getParameters(),
        terminada: 'terminada',
        clinicaId: cuenta.clinicaId,
      })
      .orderBy('o.fechaCreacion', 'DESC')
      .getMany();
  }

  /**
   * Generates the PDF and, for a draft, issues the account: the emission date and
   * the `emitida` state land with the PDF so the clinic only sees it once it is real.
   */
  async generarYGuardarPdf(id: string): Promise<CuentaCobro> {
    const cuenta = await this.findOne(id);
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada.');

    const emitir = cuenta.estado === 'borrador';
    if (emitir && Number(cuenta.total) <= 0) {
      throw new BadRequestException(
        'No se puede emitir una cuenta de cobro sin órdenes adjuntas.',
      );
    }
    if (emitir) {
      cuenta.fechaEmision = new Date();
    }

    const buffer = await this.pdfService.generate(cuenta);
    const { url, hash } = await this.pdfService.uploadToCloudinary(buffer, cuenta.numero);

    await this.cuentaCobroRepo.update(
      { id },
      {
        pdfUrl: url,
        pdfHash: hash,
        ...(emitir
          ? { estado: 'emitida', fechaEmision: cuenta.fechaEmision }
          : {}),
      },
    );

    const conPdf = (await this.findOne(id))!;
    this.eventos.emitir('pdf', conPdf.id);
    return conPdf;
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

    const pdfUrl = cuenta.pdfUrl;
    if (!pdfUrl) {
      throw new InternalServerErrorException('PDF URL unavailable after generation.');
    }

    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      throw new InternalServerErrorException('Could not fetch PDF for email attachment.');
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // Cada orden incluida viaja con su control de trabajos: la clínica recibe
    // en un solo correo la cuenta y el respaldo del trabajo cobrado.
    const adjuntas = await this.cuentaCobroOrdenRepo.find({
      where: { cuentaCobroId: cuenta.id },
    });
    const ordenes = adjuntas.length
      ? await this.ordenRepo.find({
          where: { id: In(adjuntas.map((a) => a.ordenId)) },
          relations: {
            estado: true,
            asignacion: { doctor: true, paciente: true },
            detalles: true,
            historial: { estadoNuevo: true },
          },
          order: { id: 'ASC' },
        })
      : [];

    const controles: { filename: string; buffer: Buffer }[] = [];
    for (const orden of ordenes) {
      try {
        controles.push({
          filename: `control-de-trabajos-orden-${orden.id}.pdf`,
          buffer: await this.pdfControlTrabajos.generate(orden),
        });
      } catch (err) {
        // Un control que falla no debe impedir el envío de la cuenta.
        this.logger.warn(
          `Control de trabajos omitido para la orden ${orden.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    const result = await this.mailerService.sendCuentaCobro(cuenta, pdfBuffer, dto.email, controles);

    this.eventos.emitir('enviada', cuenta.id);

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
