import { randomBytes } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';
import type { ValueTransformer } from 'typeorm';
import { configureCrypto, resetCrypto } from '../crypto/crypto.registry.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { hashTelefono, normalizeTelefono } from './normalize-telefono.js';
import { WhatsappContacto } from './whatsapp-contacto.entity.js';
import {
  ContactoDuplicadoError,
  WhatsappIdentidadService,
} from './whatsapp-identidad.service.js';

// Same nine representations as normalize-telefono.spec.ts: one number, one
// hash, one lookup — or the allowlist misses the person.
const REPRESENTACIONES = [
  '+573001234567',
  '573001234567',
  '3001234567',
  '(300) 1234567',
  '00573001234567',
  '+57 300 123 4567',
  '57-300-123-4567',
  '0057 300.123.4567',
  '300 1234 567',
];

beforeEach(() =>
  configureCrypto(
    new CryptoService({
      encryptionKey: randomBytes(32).toString('base64'),
      blindIndexKey: randomBytes(32).toString('base64'),
    }),
  ),
);
afterEach(() => resetCrypto());

const transformerTelefono = (): ValueTransformer => {
  const columna = getMetadataArgsStorage().columns.find(
    (c) =>
      c.target === WhatsappContacto && c.propertyName === 'telefonoCifrado',
  );
  return columna?.options.transformer as ValueTransformer;
};

/** Fila tal como quedaría en la base: teléfono cifrado, hash canónico. */
function filaGuardada(datos: {
  id: string;
  telefono: string;
  clinicaId: string;
  doctorId?: string | null;
  // Sin CHECK en la base: se simula cualquier valor crudo, incluido NULL.
  estado: string | null;
}): WhatsappContacto {
  const canonical = normalizeTelefono(datos.telefono);
  return Object.assign(new WhatsappContacto(), {
    id: datos.id,
    telefonoCifrado: transformerTelefono().to(canonical) as string,
    telefonoHash: hashTelefono(canonical),
    clinicaId: datos.clinicaId,
    doctorId: datos.doctorId ?? null,
    estado: datos.estado,
    verificadoEn: null,
    notas: null,
  });
}

/** Repositorio de contactos en memoria que imita a TypeORM en save(). */
function repoContactos(filasIniciales: WhatsappContacto[] = []) {
  const filas = [...filasIniciales];
  const transformer = transformerTelefono();

  const findOneBy = vi.fn(async (where: Partial<WhatsappContacto>) => {
    const fila = filas.find((f) =>
      Object.entries(where).every(([k, v]) => (f as never)[k] === v),
    );
    return fila
      ? Object.assign({}, fila, {
          telefonoCifrado: transformer.from(fila.telefonoCifrado),
        })
      : null;
  });

  const save = vi.fn(async (contacto: WhatsappContacto) => {
    // TypeORM ejecuta @BeforeInsert en save(): el hook calcula el hash.
    contacto.syncTelefonoHash();
    if (filas.some((f) => f.telefonoHash === contacto.telefonoHash)) {
      throw Object.assign(
        new Error(
          'duplicate key value violates unique constraint "uq_whatsapp_contacto_telefono_hash"',
        ),
        {
          driverError: {
            code: '23505',
            constraint: 'uq_whatsapp_contacto_telefono_hash',
          },
        },
      );
    }
    const id = `uuid-${filas.length + 1}`;
    filas.push(
      Object.assign({}, contacto, {
        id,
        telefonoCifrado: transformer.to(contacto.telefonoCifrado),
      }),
    );
    // La entidad en memoria conserva el claro, como en TypeORM.
    return Object.assign({}, contacto, { id });
  });

  const create = vi.fn((datos: Partial<WhatsappContacto>) =>
    Object.assign(new WhatsappContacto(), datos),
  );

  // A propósito no existe update(): el teléfono solo cambia por save()
  // (requisito derivado de la ronda adversarial de T1).
  return { filas, findOneBy, save, create };
}

function montar(
  opts: {
    clinicas?: string[];
    doctores?: { id: string; clinicaId: string }[];
    contactos?: WhatsappContacto[];
  } = {},
) {
  const contactos = repoContactos(opts.contactos);
  const clinicas = {
    findOneBy: vi.fn(async ({ id }: { id: string }) =>
      opts.clinicas?.includes(id) ? { id } : null,
    ),
  };
  const doctores = {
    findOneBy: vi.fn(
      async (where: { id: string; clinicaId: string }) =>
        opts.doctores?.find(
          (d) => d.id === where.id && d.clinicaId === where.clinicaId,
        ) ?? null,
    ),
  };

  const service = new WhatsappIdentidadService(
    contactos as never,
    clinicas as never,
    doctores as never,
  );
  return { service, contactos, clinicas, doctores };
}

/** 23505 crudo como lo devolvería Postgres, envuelto como TypeORM lo expone. */
function violacionUnica(campos: Record<string, unknown>): Error {
  const crudo = Object.assign(
    new Error('duplicate key value violates unique constraint'),
    { code: '23505', ...campos },
  );
  return Object.assign(new Error(crudo.message), { driverError: crudo });
}

describe('WhatsappIdentidadService.resolverContacto', () => {
  it('las nueve representaciones de un número resuelven la misma fila con un solo hash', async () => {
    const { service, contactos } = montar({
      contactos: [
        filaGuardada({
          id: 'c-1',
          telefono: '+573001234567',
          clinicaId: '5',
          estado: 'verificado',
        }),
      ],
    });

    for (const raw of REPRESENTACIONES) {
      expect(await service.resolverContacto(raw)).toEqual({
        ok: true,
        contacto: {
          id: 'c-1',
          clinicaId: '5',
          doctorId: null,
          estado: 'verificado',
        },
      });
    }

    // Una sola forma canónica entra a la base, sea cual sea el formato de entrada.
    expect(contactos.findOneBy).toHaveBeenCalledTimes(9);
    for (const [where] of contactos.findOneBy.mock.calls) {
      expect(where).toEqual({
        telefonoHash: hashTelefono(normalizeTelefono('+573001234567')),
      });
    }
  });

  it('resuelve el doctor personal del contacto verificado', async () => {
    const { service } = montar({
      contactos: [
        filaGuardada({
          id: 'c-2',
          telefono: '+573009999999',
          clinicaId: '7',
          doctorId: '12',
          estado: 'verificado',
        }),
      ],
    });

    expect(await service.resolverContacto('300 999 9999')).toEqual({
      ok: true,
      contacto: {
        id: 'c-2',
        clinicaId: '7',
        doctorId: '12',
        estado: 'verificado',
      },
    });
  });

  it('telefono_invalido devuelve su motivo sin consultar la base', async () => {
    const { service, contactos } = montar();

    expect(await service.resolverContacto('+1 305 555 0100')).toEqual({
      ok: false,
      motivo: 'telefono_invalido',
    });
    expect(contactos.findOneBy).not.toHaveBeenCalled();
  });

  it('ningún rechazo expone datos de clínica ni doctor', async () => {
    const { service } = montar({
      contactos: [
        filaGuardada({
          id: 'c-p',
          telefono: '+573001112222',
          clinicaId: '99',
          doctorId: '77',
          estado: 'pendiente',
        }),
        filaGuardada({
          id: 'c-b',
          telefono: '+573003334444',
          clinicaId: '99',
          doctorId: '77',
          estado: 'bloqueado',
        }),
      ],
    });

    const rechazos = [
      await service.resolverContacto('+573001112222'), // pendiente
      await service.resolverContacto('+573003334444'), // bloqueado
      await service.resolverContacto('+573005556666'), // sin fila
    ];

    expect(rechazos.map((r) => (r.ok ? null : r.motivo))).toEqual([
      'no_verificado',
      'no_autorizado',
      'no_autorizado',
    ]);
    for (const r of rechazos) {
      expect(r).not.toHaveProperty('contacto');
      // Ni la clínica 99 ni el doctor 77 aparecen jamás en la respuesta.
      expect(JSON.stringify(r)).not.toMatch(/99|77|c-p|c-b/);
    }
  });

  it('no_autorizado para un número que no está en la allowlist', async () => {
    const { service } = montar({
      contactos: [
        filaGuardada({
          id: 'c-1',
          telefono: '+573001234567',
          clinicaId: '5',
          estado: 'verificado',
        }),
      ],
    });

    expect(await service.resolverContacto('+573007778888')).toEqual({
      ok: false,
      motivo: 'no_autorizado',
    });
  });

  it('bloqueado y desconocido son indistinguibles para el llamante', async () => {
    const { service } = montar({
      contactos: [
        filaGuardada({
          id: 'c-b',
          telefono: '+573003334444',
          clinicaId: '99',
          doctorId: '77',
          estado: 'bloqueado',
        }),
      ],
    });

    const bloqueado = await service.resolverContacto('+573003334444');
    const desconocido = await service.resolverContacto('+573005556666');

    // Un externo no puede distinguir "existe y fue bloqueado" de "no existe".
    expect(bloqueado).toEqual({ ok: false, motivo: 'no_autorizado' });
    expect(desconocido).toEqual({ ok: false, motivo: 'no_autorizado' });
    expect(JSON.stringify(bloqueado)).toBe(JSON.stringify(desconocido));
  });

  it('solo el valor exacto "verificado" autoriza; todo lo demás es no_autorizado', async () => {
    // estado no tiene CHECK en la base: cualquier valor crudo se rechaza.
    for (const estado of ['Verificado', 'verificado ', 'otro', null]) {
      const { service } = montar({
        contactos: [
          filaGuardada({
            id: 'c-e',
            telefono: '+573001234567',
            clinicaId: '5',
            estado,
          }),
        ],
      });

      expect(await service.resolverContacto('+573001234567')).toEqual({
        ok: false,
        motivo: 'no_autorizado',
      });
    }

    // 'pendiente' conserva su motivo: el flujo OTP necesita saber que el
    // número está registrado pero sin verificar.
    const { service } = montar({
      contactos: [
        filaGuardada({
          id: 'c-p',
          telefono: '+573001234567',
          clinicaId: '5',
          estado: 'pendiente',
        }),
      ],
    });
    expect(await service.resolverContacto('+573001234567')).toEqual({
      ok: false,
      motivo: 'no_verificado',
    });
  });
});

describe('WhatsappIdentidadService.registrarContacto', () => {
  it('guarda el teléfono cifrado y con el hash canónico', async () => {
    const { service, contactos } = montar({ clinicas: ['1'] });

    const guardado = await service.registrarContacto({
      telefono: '(300) 1234567',
      clinicaId: '1',
    });

    const fila = contactos.filas[0];
    expect(fila.telefonoCifrado).not.toContain('3001234567');
    expect(fila.telefonoCifrado.startsWith('v1:')).toBe(true);
    expect(fila.telefonoHash).toBe(
      hashTelefono(normalizeTelefono('(300) 1234567')),
    );
    // En memoria queda el claro canónico; en la fila, el cifrado.
    expect(guardado.telefonoCifrado).toBe('+573001234567');
  });

  it('nace pendiente y solo el llamante puede verificarlo', async () => {
    const { service, contactos } = montar({ clinicas: ['1'] });

    await service.registrarContacto({ telefono: '+573001234567', clinicaId: '1' });
    expect(contactos.filas[0].estado).toBe('pendiente');
    expect(contactos.filas[0].verificadoEn).toBeNull();

    await service.registrarContacto({
      telefono: '+573009999999',
      clinicaId: '1',
      estado: 'verificado',
    });
    expect(contactos.filas[1].estado).toBe('verificado');
    expect(contactos.filas[1].verificadoEn).toBeInstanceOf(Date);
  });

  it('los mensajes "no encontrada" no llevan los ids', async () => {
    const { service } = montar({ clinicas: ['1'] });

    const sinClinica = await service
      .registrarContacto({ telefono: '+573001234567', clinicaId: '404' })
      .catch((e: unknown) => e);
    expect(sinClinica).toBeInstanceOf(NotFoundException);
    expect((sinClinica as Error).message).toBe('Clínica no encontrada.');

    const sinDoctor = await service
      .registrarContacto({
        telefono: '+573001234567',
        clinicaId: '1',
        doctorId: '99',
      })
      .catch((e: unknown) => e);
    expect(sinDoctor).toBeInstanceOf(NotFoundException);
    expect((sinDoctor as Error).message).toBe('Doctor no encontrado.');
  });

  it('rechaza una clínica inexistente', async () => {
    const { service, contactos } = montar({ clinicas: ['1'] });

    await expect(
      service.registrarContacto({ telefono: '+573001234567', clinicaId: '404' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(contactos.save).not.toHaveBeenCalled();
  });

  it('rechaza un doctor de otra clínica (alcance del contacto, S3)', async () => {
    const { service, contactos } = montar({
      clinicas: ['1'],
      doctores: [{ id: '7', clinicaId: '2' }],
    });

    await expect(
      service.registrarContacto({
        telefono: '+573001234567',
        clinicaId: '1',
        doctorId: '7',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(contactos.save).not.toHaveBeenCalled();
  });

  it('acepta el doctor propio de la misma clínica', async () => {
    const { service, contactos } = montar({
      clinicas: ['1'],
      doctores: [{ id: '7', clinicaId: '1' }],
    });

    const guardado = await service.registrarContacto({
      telefono: '+573001234567',
      clinicaId: '1',
      doctorId: '7',
    });

    expect(guardado.doctorId).toBe('7');
    expect(contactos.save).toHaveBeenCalledTimes(1);
  });

  it('un teléfono duplicado produce contacto_duplicado (409), no el error de Postgres', async () => {
    const { service } = montar({
      clinicas: ['1'],
      contactos: [
        filaGuardada({
          id: 'c-1',
          telefono: '+573001234567',
          clinicaId: '5',
          estado: 'verificado',
        }),
      ],
    });

    let error: unknown;
    try {
      await service.registrarContacto({
        telefono: '300 123 4567', // otro formato del mismo número
        clinicaId: '1',
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ContactoDuplicadoError);
    expect(error).toHaveProperty('code', 'contacto_duplicado');
    expect((error as { getStatus?: () => number }).getStatus?.()).toBe(409);
    // El mensaje crudo de Postgres no se propaga.
    expect(String(error)).not.toContain('23505');
    expect(String(error)).not.toContain('duplicate key');
  });

  it('un 23505 de otro índice único llega intacto al llamante', async () => {
    const { service, contactos } = montar({ clinicas: ['1'] });

    // (a) el nombre del otro índice está en el campo constraint.
    const otroConstraint = violacionUnica({
      message:
        'duplicate key value violates unique constraint "uq_whatsapp_contacto_clinica_id"',
      constraint: 'uq_whatsapp_contacto_clinica_id',
    });
    contactos.save.mockRejectedValueOnce(otroConstraint);
    await expect(
      service.registrarContacto({ telefono: '+573001234567', clinicaId: '1' }),
    ).rejects.toBe(otroConstraint);

    // (b) el nombre del otro índice solo aparece en el detalle.
    const otroDetalle = violacionUnica({
      detail:
        'Key (clinica_id)=(1) already exists in unique index "uq_whatsapp_contacto_clinica_id".',
    });
    contactos.save.mockRejectedValueOnce(otroDetalle);
    await expect(
      service.registrarContacto({ telefono: '+573001234567', clinicaId: '1' }),
    ).rejects.toBe(otroDetalle);
  });

  it('el 23505 es contacto_duplicado solo si nombra el índice de telefono_hash', async () => {
    const { service, contactos } = montar({ clinicas: ['1'] });

    // Sin campo constraint: el nombre del índice viaja solo en el detalle.
    const crudo = violacionUnica({
      detail:
        'Key (telefono_hash)=(...) already exists, index uq_whatsapp_contacto_telefono_hash.',
    });
    contactos.save.mockRejectedValueOnce(crudo);

    await expect(
      service.registrarContacto({ telefono: '+573001234567', clinicaId: '1' }),
    ).rejects.toBeInstanceOf(ContactoDuplicadoError);
  });
});
