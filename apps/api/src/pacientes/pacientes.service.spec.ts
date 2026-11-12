import { randomBytes } from 'node:crypto';
import { configureCrypto, resetCrypto } from '../crypto/crypto.registry.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { PacientesService } from './pacientes.service.js';
import type { Paciente } from './paciente.entity.js';

beforeAll(() => {
  configureCrypto(
    new CryptoService({
      encryptionKey: randomBytes(32).toString('base64'),
      blindIndexKey: randomBytes(32).toString('base64'),
    }),
  );
});
afterAll(() => resetCrypto());

type Repo = {
  findOneBy: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
};

function repo(): Repo {
  return {
    findOneBy: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((x) => x),
    save: vi.fn(async (x) => ({ ...x, id: x.id ?? '99', nombre: x.nombre ?? 'Paciente' })),
    restore: vi.fn(async () => undefined),
  };
}

function montar(opts?: { paciente?: Paciente | null; link?: unknown }) {
  const pacienteRepo = repo();
  const pacienteDoctorRepo = repo();
  const doctorRepo = repo();
  if (opts?.paciente !== undefined) {
    pacienteRepo.findOneBy.mockResolvedValue(opts.paciente);
  }
  pacienteDoctorRepo.findOne.mockResolvedValue(opts?.link ?? null);
  const service = new PacientesService(
    pacienteRepo as never,
    pacienteDoctorRepo as never,
    doctorRepo as never,
  );
  return { service, pacienteRepo, pacienteDoctorRepo, doctorRepo };
}

describe('PacientesService.findOrCreateForClinica', () => {
  it('paciente nuevo: crea el paciente y el vínculo con el doctor indicado', async () => {
    const { service, pacienteRepo, pacienteDoctorRepo } = montar({
      paciente: null,
    });
    pacienteRepo.findOneBy.mockResolvedValue(null);
    pacienteRepo.save.mockResolvedValue({
      id: '7',
      nombre: 'Nuevo',
      cedulaHash: 'h',
    });

    const r = await service.findOrCreateForClinica('1020304050', 'Nuevo', 'd1');

    expect(r).toEqual({ id: '7', nombre: 'Nuevo' });
    expect(pacienteDoctorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pacienteId: '7', doctorId: 'd1' }),
    );
  });

  it('cédula existente sin vínculo: crea el vínculo con el doctor y devuelve el paciente', async () => {
    const { service, pacienteDoctorRepo } = montar({
      paciente: { id: '5', nombre: 'Existente' } as Paciente,
      link: null,
    });

    const r = await service.findOrCreateForClinica('1020304050', 'Otro nombre', 'd1');

    expect(r).toEqual({ id: '5', nombre: 'Existente' });
    expect(pacienteDoctorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pacienteId: '5', doctorId: 'd1' }),
    );
  });

  it('cédula existente con vínculo activo con el doctor: no vuelve a crear el vínculo', async () => {
    const { service, pacienteDoctorRepo } = montar({
      paciente: { id: '5', nombre: 'Existente' } as Paciente,
      link: { pacienteId: '5', doctorId: 'd1', eliminadoEn: null },
    });

    await service.findOrCreateForClinica('1020304050', 'Existente', 'd1');

    expect(pacienteDoctorRepo.save).not.toHaveBeenCalled();
    expect(pacienteDoctorRepo.restore).not.toHaveBeenCalled();
  });

  it('vínculo eliminado (borrado suave) se restaura', async () => {
    const { service, pacienteDoctorRepo } = montar({
      paciente: { id: '5', nombre: 'Existente' } as Paciente,
      link: { pacienteId: '5', doctorId: 'd1', eliminadoEn: new Date() },
    });

    await service.findOrCreateForClinica('1020304050', 'Existente', 'd1');

    expect(pacienteDoctorRepo.restore).toHaveBeenCalledWith({
      pacienteId: '5',
      doctorId: 'd1',
    });
  });

  it('sin doctorId: devuelve el paciente sin crear ni tocar vínculos', async () => {
    const { service, pacienteDoctorRepo } = montar({
      paciente: { id: '5', nombre: 'Existente' } as Paciente,
    });

    const r = await service.findOrCreateForClinica('1020304050', 'Existente', null);

    expect(r).toEqual({ id: '5', nombre: 'Existente' });
    expect(pacienteDoctorRepo.save).not.toHaveBeenCalled();
    expect(pacienteDoctorRepo.restore).not.toHaveBeenCalled();
  });
});
