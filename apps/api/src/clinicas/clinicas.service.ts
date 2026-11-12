import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MailerAuthService } from '../auth/mailer-auth.service.js';
import { cedulaHash } from '../crypto/cedula.js';
import { PasswordService } from '../crypto/password.service.js';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { Rol } from '../usuarios/rol.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CreateClinicaDto } from './dto/create-clinica.dto.js';
import { UpdateClinicaDto } from './dto/update-clinica.dto.js';

const PASSWORD_CHARS =
  'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';

function generatePassword(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length])
    .join('');
}

export type ClinicaWithCount = Clinica & { doctorCount: number };

export type ClinicaDetail = Clinica & {
  doctores: Array<{
    id: string;
    nombres: string;
    apellidos: string;
    correo: string | null;
    clinicaId: string;
  }>;
};

@Injectable()
export class ClinicasService {
  private readonly logger = new Logger(ClinicasService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Clinica)
    private readonly clinicaRepo: Repository<Clinica>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly passwordService: PasswordService,
    private readonly mailerAuth: MailerAuthService,
  ) {}

  async findAll(): Promise<ClinicaWithCount[]> {
    const [clinicas, counts] = await Promise.all([
      this.clinicaRepo.find({ order: { nombre: 'ASC' } }),
      this.doctorRepo
        .createQueryBuilder('d')
        .select('d.clinicaId', 'clinicaId')
        .addSelect('COUNT(*)', 'count')
        .where('d.clinicaId IS NOT NULL')
        .groupBy('d.clinicaId')
        .getRawMany<{ clinicaId: string; count: string }>(),
    ]);
    const countMap = new Map(counts.map((r) => [r.clinicaId, Number(r.count)]));
    return clinicas.map((c) => ({
      ...c,
      doctorCount: countMap.get(c.id) ?? 0,
    }));
  }

  async findOne(id: string): Promise<ClinicaDetail> {
    const clinica = await this.clinicaRepo.findOneBy({ id });
    if (!clinica) throw new NotFoundException(`Clínica ${id} no encontrada`);

    const doctores = await this.doctorRepo
      .createQueryBuilder('d')
      .select(['d.id', 'd.clinicaId', 'd.nombres', 'd.apellidos', 'd.correo'])
      .where('d.clinicaId = :id', { id })
      .getMany();

    return {
      ...clinica,
      doctores: doctores.map((d) => ({
        id: d.id,
        nombres: d.nombres,
        apellidos: d.apellidos,
        correo: d.correo,
        clinicaId: d.clinicaId,
      })),
    };
  }

  async create(dto: CreateClinicaDto): Promise<Clinica> {
    const rolClinica = await this.rolRepo.findOneBy({ nombre: 'clinica' });
    if (!rolClinica) {
      throw new BadRequestException("Rol 'clinica' no encontrado");
    }

    const hash = cedulaHash(dto.adminCedula);
    const exists = await this.usuarioRepo
      .createQueryBuilder('u')
      .where('lower(u.correo) = :correo', { correo: dto.correo.toLowerCase() })
      .orWhere('u.cedulaHash = :hash', { hash })
      .getExists();

    if (exists) {
      throw new ConflictException('El correo o la cédula del administrador ya está en uso');
    }

    const rawPassword = generatePassword();
    const passwordHash = await this.passwordService.hash(rawPassword);

    const clinica = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(Clinica, {
          nombre: dto.nombre,
          direccion: dto.direccion ?? null,
          correo: dto.correo,
          // DB default is true, but TypeORM does not read defaults back.
          activo: true,
        }),
      );

      await manager.save(
        manager.create(Usuario, {
          cedula: dto.adminCedula,
          nombres: dto.adminNombres,
          apellidos: dto.adminApellidos,
          correo: dto.correo,
          passwordHash,
          rolId: rolClinica.id,
          clinicaId: created.id,
          activo: true,
        }),
      );

      return created;
    });

    const { sent, error } = await this.mailerAuth.sendWelcome(
      dto.correo,
      `${dto.adminNombres} ${dto.adminApellidos}`,
      dto.correo,
      rawPassword,
    );
    if (!sent) {
      this.logger.warn(
        `Welcome email not sent for new clinic ${clinica.id}: ${error ?? 'unknown'}`,
      );
    }

    return clinica;
  }

  async update(id: string, dto: UpdateClinicaDto): Promise<Clinica> {
    const clinica = await this.clinicaRepo.findOneBy({ id });
    if (!clinica) throw new NotFoundException(`Clínica ${id} no encontrada`);
    if (dto.nombre !== undefined) clinica.nombre = dto.nombre;
    if ('direccion' in dto) clinica.direccion = dto.direccion ?? null;
    if ('correo' in dto) clinica.correo = dto.correo ?? null;
    return this.clinicaRepo.save(clinica);
  }

  async remove(id: string): Promise<void> {
    const clinica = await this.clinicaRepo.findOneBy({ id });
    if (!clinica) throw new NotFoundException(`Clínica ${id} no encontrada`);
    const doctorCount = await this.doctorRepo.countBy({ clinicaId: id });
    if (doctorCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar una clínica con doctores asociados',
      );
    }
    await this.clinicaRepo.delete(id);
  }
}
