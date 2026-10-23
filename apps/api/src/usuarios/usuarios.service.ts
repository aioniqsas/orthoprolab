import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { cedulaHash } from '../crypto/cedula.js';
import { PasswordService } from '../crypto/password.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { Doctor } from './doctor.entity.js';
import { Rol } from './rol.entity.js';
import { Usuario } from './usuario.entity.js';

export interface UsuarioPublico {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  activo: boolean;
  fechaCreacion: Date;
  rol: { id: string; nombre: string };
  clinica: { id: string; nombre: string } | null;
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    private readonly passwordService: PasswordService,
  ) {}

  async findAll(): Promise<UsuarioPublico[]> {
    const [usuarios, doctores] = await Promise.all([
      this.usuarioRepo
        .createQueryBuilder('u')
        .innerJoinAndSelect('u.rol', 'rol')
        .select([
          'u.id',
          'u.nombres',
          'u.apellidos',
          'u.correo',
          'u.activo',
          'u.fechaCreacion',
          'rol.id',
          'rol.nombre',
        ])
        .orderBy('u.apellidos', 'ASC')
        .addOrderBy('u.nombres', 'ASC')
        .getMany(),
      this.doctorRepo
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.clinica', 'clinica')
        .select(['d.usuarioId', 'clinica.id', 'clinica.nombre'])
        .getMany(),
    ]);

    const clinicaMap = new Map(
      doctores
        .filter((d) => d.clinica !== null && d.clinica !== undefined)
        .map((d) => [d.usuarioId, d.clinica!]),
    );

    return usuarios.map((u) => ({
      id: u.id,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
      activo: u.activo,
      fechaCreacion: u.fechaCreacion,
      rol: { id: u.rol.id, nombre: u.rol.nombre },
      clinica: clinicaMap.has(u.id)
        ? { id: clinicaMap.get(u.id)!.id, nombre: clinicaMap.get(u.id)!.nombre }
        : null,
    }));
  }

  async findOne(id: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.rol', 'rol')
      .select([
        'u.id',
        'u.nombres',
        'u.apellidos',
        'u.correo',
        'u.activo',
        'u.fechaCreacion',
        'rol.id',
        'rol.nombre',
      ])
      .where('u.id = :id', { id })
      .getOne();

    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    const doctor = await this.doctorRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.clinica', 'clinica')
      .select(['d.usuarioId', 'clinica.id', 'clinica.nombre'])
      .where('d.usuarioId = :id', { id })
      .getOne();

    const clinica =
      doctor?.clinica != null
        ? { id: doctor.clinica.id, nombre: doctor.clinica.nombre }
        : null;

    return {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      activo: usuario.activo,
      fechaCreacion: usuario.fechaCreacion,
      rol: { id: usuario.rol.id, nombre: usuario.rol.nombre },
      clinica,
    };
  }

  async create(dto: CreateUsuarioDto): Promise<UsuarioPublico> {
    const rol = await this.rolRepo.findOneBy({ nombre: dto.rol });
    if (!rol) {
      throw new BadRequestException(`Rol '${dto.rol}' no encontrado`);
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const hash = cedulaHash(dto.cedula);

    const exists = await this.usuarioRepo
      .createQueryBuilder('u')
      .where('lower(u.correo) = :correo', {
        correo: dto.correo.toLowerCase(),
      })
      .orWhere('u.cedulaHash = :hash', { hash })
      .getExists();

    if (exists) {
      throw new ConflictException('El correo o la cédula ya está en uso');
    }

    return this.dataSource.transaction(async (manager) => {
      const usuario = await manager.save(
        manager.create(Usuario, {
          cedula: dto.cedula,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo,
          passwordHash,
          rolId: rol.id,
          activo: true,
        }),
      );

      if (dto.rol === 'odontologo' || dto.rol === 'asistente') {
        await manager.insert(Doctor, {
          usuarioId: usuario.id,
          clinicaId:
            dto.clinicaId !== undefined ? String(dto.clinicaId) : null,
        });
      }

      return {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        activo: usuario.activo,
        fechaCreacion: usuario.fechaCreacion,
        rol: { id: rol.id, nombre: rol.nombre },
        clinica: null,
      };
    });
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);

    if (dto.nombres !== undefined) usuario.nombres = dto.nombres;
    if (dto.apellidos !== undefined) usuario.apellidos = dto.apellidos;
    if (dto.activo !== undefined) usuario.activo = dto.activo;
    await this.usuarioRepo.save(usuario);

    if ('clinicaId' in dto) {
      const doctor = await this.doctorRepo.findOneBy({ usuarioId: id });
      if (doctor) {
        doctor.clinicaId =
          dto.clinicaId != null ? String(dto.clinicaId) : null;
        await this.doctorRepo.save(doctor);
      }
    }

    return this.findOne(id);
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
  ): Promise<{ ok: true }> {
    const usuario = await this.usuarioRepo.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    usuario.passwordHash = await this.passwordService.hash(dto.nuevaPassword);
    await this.usuarioRepo.save(usuario);
    return { ok: true };
  }
}
