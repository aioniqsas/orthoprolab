import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinica } from '../usuarios/clinica.entity.js';
import { Doctor } from '../usuarios/doctor.entity.js';
import { CreateClinicaDto } from './dto/create-clinica.dto.js';
import { UpdateClinicaDto } from './dto/update-clinica.dto.js';

export type ClinicaWithCount = Clinica & { doctorCount: number };

export type ClinicaDetail = Clinica & {
  doctores: Array<{
    id: string;
    nombres: string;
    apellidos: string;
    correo: string;
    clinicaId: string | null;
  }>;
};

@Injectable()
export class ClinicasService {
  constructor(
    @InjectRepository(Clinica)
    private readonly clinicaRepo: Repository<Clinica>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
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
      .innerJoinAndSelect('d.usuario', 'u')
      .select(['d.usuarioId', 'd.clinicaId', 'u.nombres', 'u.apellidos', 'u.correo'])
      .where('d.clinicaId = :id', { id })
      .getMany();

    return {
      ...clinica,
      doctores: doctores.map((d) => ({
        id: d.usuarioId,
        nombres: d.usuario.nombres,
        apellidos: d.usuario.apellidos,
        correo: d.usuario.correo,
        clinicaId: d.clinicaId,
      })),
    };
  }

  async create(dto: CreateClinicaDto): Promise<Clinica> {
    const clinica = this.clinicaRepo.create({
      nombre: dto.nombre,
      direccion: dto.direccion ?? null,
    });
    return this.clinicaRepo.save(clinica);
  }

  async update(id: string, dto: UpdateClinicaDto): Promise<Clinica> {
    const clinica = await this.clinicaRepo.findOneBy({ id });
    if (!clinica) throw new NotFoundException(`Clínica ${id} no encontrada`);
    if (dto.nombre !== undefined) clinica.nombre = dto.nombre;
    if ('direccion' in dto) clinica.direccion = dto.direccion ?? null;
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
