import { Readable } from 'node:stream';
import {
  AdminCreateError,
  createAdministrator,
  parseAdminArgs,
  readPasswordLine,
  type AdminDeps,
} from './admin-bootstrap.js';

const PASSWORD = 'correct horse battery';
const input = {
  nombres: 'Ana',
  apellidos: 'Perez',
  cedula: '1234567890',
  correo: 'ana@orthopro.test',
  password: PASSWORD,
};

function makeDeps(
  conflicts = { correo: false, cedula: false },
  insertError?: unknown,
) {
  const insert = vi.fn(async (data: { correo: string }) => {
    if (insertError) throw insertError;
    return { id: 'uuid-1', correo: data.correo, rol: 'administrador' };
  });
  const findConflicts = vi.fn(async () => conflicts);
  const hash = vi.fn(async (_plain: string) => 'HASHED');
  const deps: AdminDeps = {
    passwords: { hash },
    store: { findConflicts, insertAdministrator: insert },
  };
  return { deps, insert, findConflicts, hash };
}

async function failure(promise: Promise<unknown>): Promise<AdminCreateError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AdminCreateError);
    return error as AdminCreateError;
  }
  throw new Error('expected a rejection');
}

describe('parseAdminArgs', () => {
  it('reads --flag value and --flag=value, ignoring a bare --', () => {
    const parsed = parseAdminArgs([
      '--',
      '--correo',
      'a@b.co',
      '--cedula=1234567890',
      '--nombres',
      'Ana',
      '--apellidos=Perez',
      '--password-stdin',
    ]);
    expect(parsed.values).toEqual({
      correo: 'a@b.co',
      cedula: '1234567890',
      nombres: 'Ana',
      apellidos: 'Perez',
    });
    expect(parsed.passwordStdin).toBe(true);
    expect(parsed.help).toBe(false);
  });

  it('defaults to nothing provided', () => {
    const parsed = parseAdminArgs([]);
    expect(parsed.values).toEqual({});
    expect(parsed.passwordStdin).toBe(false);
  });

  it('recognizes --help', () => {
    expect(parseAdminArgs(['--help']).help).toBe(true);
  });

  it('refuses a password as an argument without echoing it', () => {
    for (const argv of [
      ['--password', 'hunter2hunter2'],
      ['--password=hunter2hunter2'],
    ]) {
      let message = '';
      try {
        parseAdminArgs(argv);
      } catch (error) {
        message = (error as Error).message;
        expect(error).toBeInstanceOf(AdminCreateError);
        expect((error as AdminCreateError).code).toBe('usage');
      }
      expect(message).not.toBe('');
      expect(message).not.toContain('hunter2');
    }
  });

  it('rejects unknown flags, positional values and missing values', () => {
    for (const argv of [['--rol', 'x'], ['stray'], ['--correo']]) {
      expect(() => parseAdminArgs(argv)).toThrow(AdminCreateError);
    }
  });
});

describe('readPasswordLine', () => {
  it('reads only the first line, across chunks', async () => {
    const stream = Readable.from(['correct horse ', 'battery\nsecond line\n']);
    await expect(readPasswordLine(stream)).resolves.toBe(PASSWORD);
  });

  it('strips CRLF but keeps inner and edge spaces', async () => {
    await expect(
      readPasswordLine(Readable.from([' a b c \r\n'])),
    ).resolves.toBe(' a b c ');
  });

  it('accepts a last line without newline', async () => {
    await expect(readPasswordLine(Readable.from([PASSWORD]))).resolves.toBe(
      PASSWORD,
    );
  });

  it('fails on empty input', async () => {
    await expect(
      readPasswordLine(Readable.from(['\n'])),
    ).rejects.toBeInstanceOf(AdminCreateError);
    await expect(readPasswordLine(Readable.from([]))).rejects.toBeInstanceOf(
      AdminCreateError,
    );
  });
});

describe('createAdministrator', () => {
  it('hashes the password and inserts a normalized administrator', async () => {
    const { deps, insert, hash } = makeDeps();
    const result = await createAdministrator(deps, {
      ...input,
      correo: '  Ana@Orthopro.TEST ',
    });
    expect(hash).toHaveBeenCalledWith(PASSWORD);
    expect(insert).toHaveBeenCalledWith({
      nombres: 'Ana',
      apellidos: 'Perez',
      cedula: '1234567890',
      correo: 'ana@orthopro.test',
      passwordHash: 'HASHED',
    });
    expect(result).toEqual({
      id: 'uuid-1',
      correo: 'ana@orthopro.test',
      rol: 'administrador',
    });
  });

  it('never returns or stores the plaintext password or the hash', async () => {
    const { deps, insert } = makeDeps();
    const result = await createAdministrator(deps, input);
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
    expect(JSON.stringify(result)).not.toContain('HASHED');
    expect(JSON.stringify(insert.mock.calls)).not.toContain(PASSWORD);
  });

  it.each([
    ['password too short', { password: 'short' }, 'password'],
    ['password too long', { password: 'x'.repeat(201) }, 'password'],
    ['cedula with letters', { cedula: '12ab5678' }, 'cedula'],
    ['cedula too short', { cedula: '1234' }, 'cedula'],
    ['bad email', { correo: 'not-an-email' }, 'correo'],
    ['digits in the name', { nombres: 'Ana2' }, 'nombres'],
    ['missing apellidos', { apellidos: undefined }, 'apellidos'],
  ])('rejects %s with the RegisterDto rules', async (_name, patch, field) => {
    const { deps, insert, hash } = makeDeps();
    const error = await failure(
      createAdministrator(deps, { ...input, ...patch }),
    );
    expect(error.code).toBe('invalid');
    expect(error.details.join(' ')).toContain(field);
    expect(error.message).not.toContain(PASSWORD);
    expect(error.details.join(' ')).not.toContain(PASSWORD);
    expect(insert).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });

  it('rejects unknown fields such as rol', async () => {
    const { deps, insert } = makeDeps();
    const error = await failure(
      createAdministrator(deps, { ...input, rol: 'odontologo' }),
    );
    expect(error.code).toBe('invalid');
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses an existing email without changing anything', async () => {
    const { deps, insert } = makeDeps({ correo: true, cedula: false });
    const error = await failure(createAdministrator(deps, input));
    expect(error.code).toBe('duplicate');
    expect(error.details).toEqual(['correo']);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses an existing cedula without changing anything', async () => {
    const { deps, insert } = makeDeps({ correo: false, cedula: true });
    const error = await failure(createAdministrator(deps, input));
    expect(error.code).toBe('duplicate');
    expect(error.details).toEqual(['cedula']);
    expect(insert).not.toHaveBeenCalled();
  });

  it('maps a unique violation race to a duplicate error', async () => {
    const { deps } = makeDeps(undefined, { code: '23505' });
    const error = await failure(createAdministrator(deps, input));
    expect(error.code).toBe('duplicate');
  });

  it('maps a missing role to a clear error', async () => {
    const { deps } = makeDeps(
      undefined,
      new AdminCreateError('role_missing', 'x'),
    );
    const error = await failure(createAdministrator(deps, input));
    expect(error.code).toBe('role_missing');
  });
});
