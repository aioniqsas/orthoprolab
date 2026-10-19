import { BadRequestException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { DataSource } from 'typeorm';
import { cedulaHash } from '../crypto/cedula.js';
import type { PasswordService } from '../crypto/password.service.js';
import { Rol } from '../usuarios/rol.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { createValidationPipe } from '../security/validation.js';
import { RegisterDto } from './dto/register.dto.js';

/**
 * Logic of the `admin:create` operator CLI (scripts/admin-create.ts): argument
 * parsing, validation with the SAME rules as public registration, duplicate
 * detection and the insert. No TTY handling here, so it is unit-testable.
 * Nothing in this file prints, logs or returns a password or a hash.
 */

export const ADMIN_ROLE = 'administrador';

export type AdminErrorCode =
  'usage' | 'invalid' | 'duplicate' | 'role_missing' | 'input';

/** Operator-facing failure; `details` holds field names or validation messages. */
export class AdminCreateError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'AdminCreateError';
  }
}

export interface AdminInput {
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  password: string;
}

export interface AdminCreated {
  id: string;
  correo: string;
  rol: string;
}

export interface AdminStore {
  /** Which unique fields already belong to an existing user. */
  findConflicts(
    correo: string,
    cedula: string,
  ): Promise<{ correo: boolean; cedula: boolean }>;
  insertAdministrator(
    data: Omit<AdminInput, 'password'> & { passwordHash: string },
  ): Promise<AdminCreated>;
}

export interface AdminDeps {
  passwords: Pick<PasswordService, 'hash'>;
  store: AdminStore;
}

export const ADMIN_FIELDS = [
  'correo',
  'cedula',
  'nombres',
  'apellidos',
] as const;
type AdminField = (typeof ADMIN_FIELDS)[number];

export interface ParsedArgs {
  values: Partial<Record<AdminField, string>>;
  passwordStdin: boolean;
  help: boolean;
}

export function parseAdminArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = { values: {}, passwordStdin: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--password-stdin') {
      parsed.passwordStdin = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new AdminCreateError('usage', 'Unexpected positional argument.');
    }
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    if (name === 'password') {
      // Never accept (or echo) a password given as an argument.
      throw new AdminCreateError(
        'usage',
        'A password cannot be passed as an argument. Type it at the prompt or use --password-stdin.',
      );
    }
    if (!(ADMIN_FIELDS as readonly string[]).includes(name)) {
      throw new AdminCreateError('usage', `Unknown option --${name}.`);
    }
    let value: string | undefined;
    if (eq !== -1) {
      value = arg.slice(eq + 1);
    } else {
      value = argv[i + 1];
      i++;
    }
    if (value === undefined) {
      throw new AdminCreateError('usage', `Option --${name} needs a value.`);
    }
    parsed.values[name as AdminField] = value;
  }
  return parsed;
}

/** Reads ONE line (the password) from a stream; strips only the line ending. */
export async function readPasswordLine(stream: Readable): Promise<string> {
  let buffer = '';
  stream.setEncoding?.('utf8');
  for await (const chunk of stream) {
    buffer += String(chunk);
    const newline = buffer.indexOf('\n');
    if (newline !== -1) {
      buffer = buffer.slice(0, newline);
      break;
    }
  }
  const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
  if (line === '') {
    throw new AdminCreateError('input', 'No password received on stdin.');
  }
  return line;
}

const pipe = createValidationPipe();

/** Validates with the RegisterDto rules (same pipe as the HTTP layer). */
async function validateInput(
  raw: Record<string, unknown>,
): Promise<RegisterDto> {
  try {
    return (await pipe.transform(raw, {
      type: 'body',
      metatype: RegisterDto,
    })) as RegisterDto;
  } catch (error) {
    if (error instanceof BadRequestException) {
      const body = error.getResponse() as { message?: unknown };
      const messages = Array.isArray(body.message)
        ? body.message.map(String)
        : [error.message];
      throw new AdminCreateError('invalid', 'Invalid data.', messages);
    }
    throw error;
  }
}

export async function createAdministrator(
  deps: AdminDeps,
  raw: Record<string, unknown>,
): Promise<AdminCreated> {
  const input = await validateInput(raw);

  const conflicts = await deps.store.findConflicts(input.correo, input.cedula);
  assertNoConflicts(conflicts);

  const passwordHash = await deps.passwords.hash(input.password);
  try {
    return await deps.store.insertAdministrator({
      nombres: input.nombres,
      apellidos: input.apellidos,
      cedula: input.cedula,
      correo: input.correo,
      passwordHash,
    });
  } catch (error) {
    if ((error as { code?: string } | null)?.code === '23505') {
      // Lost a race against another writer: same outcome as the pre-check.
      throw new AdminCreateError(
        'duplicate',
        'The email or cedula already exists.',
        [],
      );
    }
    throw error;
  }
}

function assertNoConflicts(conflicts: { correo: boolean; cedula: boolean }) {
  const taken = (['correo', 'cedula'] as const).filter((f) => conflicts[f]);
  if (taken.length > 0) {
    throw new AdminCreateError(
      'duplicate',
      `A user with that ${taken.join(' and ')} already exists. Nothing was changed.`,
      taken,
    );
  }
}

export function typeormAdminStore(dataSource: DataSource): AdminStore {
  return {
    async findConflicts(correo, cedula) {
      const rows: Array<{ by_correo: boolean; by_cedula: boolean }> =
        await dataSource.query(
          `SELECT EXISTS (SELECT 1 FROM usuario WHERE lower(correo) = $1) AS by_correo,
                  EXISTS (SELECT 1 FROM usuario WHERE cedula_hash = $2) AS by_cedula`,
          [correo, cedulaHash(cedula)],
        );
      return { correo: rows[0].by_correo, cedula: rows[0].by_cedula };
    },

    insertAdministrator(data) {
      return dataSource.transaction(async (manager) => {
        const rol = await manager.findOneBy(Rol, { nombre: ADMIN_ROLE });
        if (!rol) {
          throw new AdminCreateError(
            'role_missing',
            `The role "${ADMIN_ROLE}" does not exist. Run the migrations first.`,
          );
        }
        const usuario = await manager.save(
          manager.create(Usuario, {
            nombres: data.nombres,
            apellidos: data.apellidos,
            cedula: data.cedula,
            correo: data.correo,
            passwordHash: data.passwordHash,
            rolId: rol.id,
            activo: true,
          }),
        );
        return { id: usuario.id, correo: usuario.correo, rol: ADMIN_ROLE };
      });
    },
  };
}
