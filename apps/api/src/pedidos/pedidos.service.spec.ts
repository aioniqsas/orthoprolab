import { BadRequestException } from '@nestjs/common';
import { PedidosService } from './pedidos.service.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { Paciente } from '../pacientes/paciente.entity.js';

const dto = {
  doctorId: '7',
  pacienteId: 42,
  detalles: [
    { servicio: 'Corona de zirconia', cantidad: 1, dientes: [11], colorDiente: 'A2' },
  ],
};

/**
 * Builds the service over a fake transaction manager. `linkExistente` decides
 * whether the doctor↔patient row is already there.
 */
function montar(opciones: { linkExistente: boolean; pacienteExiste?: boolean }) {
  const guardados: { entidad: unknown; valor: unknown }[] = [];

  const manager = {
    findOne: vi.fn(async (entidad: unknown) => {
      if (entidad === Paciente) {
        return opciones.pacienteExiste === false ? null : { id: '42' };
      }
      if (entidad === PacienteDoctor) {
        return opciones.linkExistente ? { pacienteId: '42', doctorId: '7' } : null;
      }
      // EstadoOrden
      return { id: '1', codigo: 'creada' };
    }),
    create: vi.fn((_entidad: unknown, valor: unknown) => valor),
    save: vi.fn(async (entidad: unknown, valor: unknown) => {
      guardados.push({ entidad, valor });
      return entidad === PacienteDoctor ? valor : { id: '99', ...(valor as object) };
    }),
  };

  const service = new PedidosService(
    {} as never,
    {} as never,
    {} as never,
    { findOne: vi.fn(async () => ({ id: '7', clinicaId: '1' })) } as never,
    {} as never,
    { transaction: (cb: (m: unknown) => unknown) => cb(manager) } as never,
    {} as never,
    { emitir: vi.fn() } as never,
  );

  return { service, guardados, manager };
}

describe('PedidosService.create · paciente de otra clínica', () => {
  it('vincula el paciente al doctor cuando todavía no lo atendió', async () => {
    const { service, guardados } = montar({ linkExistente: false });

    await service.create(dto as never, 'usuario-1');

    const vinculos = guardados.filter((g) => g.entidad === PacienteDoctor);
    expect(vinculos).toHaveLength(1);
    expect(vinculos[0]?.valor).toMatchObject({ pacienteId: '42', doctorId: '7' });
  });

  it('no duplica el vínculo si ya existe', async () => {
    const { service, guardados } = montar({ linkExistente: true });

    await service.create(dto as never, 'usuario-1');

    expect(guardados.filter((g) => g.entidad === PacienteDoctor)).toHaveLength(0);
  });

  it('rechaza un paciente inexistente con un 400 claro', async () => {
    const { service } = montar({ linkExistente: false, pacienteExiste: false });

    await expect(service.create(dto as never, 'usuario-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
