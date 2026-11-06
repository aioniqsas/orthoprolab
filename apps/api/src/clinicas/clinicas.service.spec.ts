import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClinicasService } from './clinicas.service.js';
import { UpdateClinicaDto } from './dto/update-clinica.dto.js';

/** Servicio sobre un repositorio de clínicas falso. */
function montar(clinica: { id: string; nombre: string; correo: string | null; direccion: string | null }) {
  const guardadas: typeof clinica[] = [];
  const clinicaRepo = {
    findOneBy: vi.fn(async () => ({ ...clinica })),
    save: vi.fn(async (guardada: typeof clinica) => {
      guardadas.push(guardada);
      return guardada;
    }),
  };

  const service = new ClinicasService(
    {} as never,
    clinicaRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, guardadas };
}

const clinicaBase = {
  id: '2',
  nombre: 'Clinica Muelas Flojas',
  correo: 'correo-mal-escrito@proton.me',
  direccion: null,
};

describe('ClinicasService.update · correo', () => {
  it('permite corregir el correo de la clínica', async () => {
    const { service, guardadas } = montar(clinicaBase);

    await service.update('2', { correo: 'santiago.aristizbalh@proton.me' });

    expect(guardadas[0]?.correo).toBe('santiago.aristizbalh@proton.me');
  });

  it('permite borrar el correo', async () => {
    const { service, guardadas } = montar(clinicaBase);

    await service.update('2', { correo: null });

    expect(guardadas[0]?.correo).toBeNull();
  });

  it('no toca el correo cuando el DTO no lo trae', async () => {
    const { service, guardadas } = montar(clinicaBase);

    await service.update('2', { nombre: 'Otro nombre' });

    expect(guardadas[0]?.correo).toBe(clinicaBase.correo);
  });
});

describe('UpdateClinicaDto · correo en el límite de confianza', () => {
  const validar = async (correo: unknown) => {
    const dto = plainToInstance(UpdateClinicaDto, { correo });
    const errores = await validate(dto, { whitelist: true });
    return { correo: dto.correo, errores: errores.map((e) => e.property) };
  };

  it('normaliza a minúsculas y sin espacios', async () => {
    const { correo } = await validar('  Santiago.Aristizbalh@Proton.ME ');
    expect(correo).toBe('santiago.aristizbalh@proton.me');
  });

  it('convierte el vacío en null para poder borrarlo', async () => {
    const { correo, errores } = await validar('   ');
    expect(correo).toBeNull();
    expect(errores).toEqual([]);
  });

  it('rechaza un correo inválido', async () => {
    const { errores } = await validar('correo-mal-escrito');
    expect(errores).toContain('correo');
  });
});
