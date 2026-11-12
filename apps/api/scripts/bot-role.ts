/**
 * Provisions the restricted PostgreSQL role for the WhatsApp bot (task IA1).
 *
 *   bun run db:bot-role            # create or converge the role
 *   bun run db:bot-role -- --rotate  # also re-apply the password
 *
 * Administrative connection: WHATSAPP_DB_ADMIN_URL if set, otherwise the API's
 * own DATABASE_* variables. WHATSAPP_DB_PASSWORD is required and is never
 * printed, logged or written anywhere.
 *
 * If the connection lacks CREATEROLE it exits non-zero and tells the operator
 * exactly which statements to run as an administrator.
 */
import { Client } from 'pg';
import { pathToFileURL } from 'node:url';
import {
  buildBotRoleStatements,
  DENIED_TABLES,
  GRANTED_TABLES,
} from './bot-role-sql.js';

const DEFAULT_ROLE = 'whatsapp_bot';
const USAGE = `Usage: bun run db:bot-role [--rotate]

Administrative connection: WHATSAPP_DB_ADMIN_URL, or DATABASE_URL, or the API's DATABASE_* variables.
Role: WHATSAPP_DB_USER (default ${DEFAULT_ROLE}), password: WHATSAPP_DB_PASSWORD (required).`;

export interface BotRoleArgs {
  rotate: boolean;
}

export function parseBotRoleArgs(argv: readonly string[]): BotRoleArgs {
  const rotate = argv.includes('--rotate');
  if (argv.some((a) => a !== '--rotate')) {
    throw new UsageError(`Argumento desconocido. ${USAGE}`);
  }
  return { rotate };
}

export class UsageError extends Error {}

interface AdminTarget {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: { rejectUnauthorized: false };
}

/**
 * Prefers WHATSAPP_DB_ADMIN_URL, then a full DATABASE_URL, then the API's
 * individual DATABASE_* variables (DATABASE_USER or DATABASE_USERNAME).
 */
export function resolveAdminTarget(env: NodeJS.ProcessEnv): AdminTarget {
  if (env.WHATSAPP_DB_ADMIN_URL) {
    return { connectionString: env.WHATSAPP_DB_ADMIN_URL };
  }
  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL };
  }
  // Los mismos valores por defecto que aplica src/config/env.validation.ts;
  // solo DATABASE_PASSWORD es obligatoria.
  const { DATABASE_HOST, DATABASE_PORT, DATABASE_PASSWORD, DATABASE_SSL } = env;
  const user = env.DATABASE_USER ?? env.DATABASE_USERNAME ?? 'orthopro';
  if (!DATABASE_PASSWORD) {
    throw new UsageError(
      'Falta DATABASE_PASSWORD para la conexión administrativa (o define DATABASE_URL o WHATSAPP_DB_ADMIN_URL).',
    );
  }
  return {
    host: DATABASE_HOST ?? 'localhost',
    port: DATABASE_PORT ? Number.parseInt(DATABASE_PORT, 10) : 5432,
    user,
    password: DATABASE_PASSWORD,
    database: env.DATABASE_NAME ?? 'orthopro',
    ssl: DATABASE_SSL === 'true' || DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  };
}

const MANUAL_STEP = `Tu conexión no tiene privilegio CREATEROLE. Ejecuta como administrador de PostgreSQL:

  1. CREATE ROLE <rol> LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD <de WHATSAPP_DB_PASSWORD>;
  2. Vuelve a ejecutar este comando; el resto de grants y políticas sí son aplicables con permisos de dueño de las tablas.

No imprimimos la contraseña: tómala de WHATSAPP_DB_PASSWORD.`;

async function main(): Promise<number> {
  let args: BotRoleArgs;
  try {
    args = parseBotRoleArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }

  const password = process.env.WHATSAPP_DB_PASSWORD;
  if (!password) {
    process.stderr.write(
      `WHATSAPP_DB_PASSWORD es obligatoria (nunca se imprime ni se escribe en archivos).\n${USAGE}\n`,
    );
    return 2;
  }
  const role = process.env.WHATSAPP_DB_USER || DEFAULT_ROLE;

  let client: Client;
  try {
    client = new Client(resolveAdminTarget(process.env));
    await client.connect();
  } catch (error) {
    process.stderr.write(`No se pudo conectar: ${(error as Error).message}\n`);
    return 1;
  }

  try {
    const roleName = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
    const exists = roleName.rowCount === 1;
    const database = await client.query('SELECT current_database() AS db');
    const db: string = database.rows[0].db;

    const statements = buildBotRoleStatements({ role, database: db, password, exists, rotate: args.rotate });
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        const pgError = error as { code?: string };
        if (pgError.code === '42501') {
          process.stderr.write(`${MANUAL_STEP}\nError original: ${(error as Error).message}\n`);
          return 1;
        }
        throw error;
      }
    }

    process.stdout.write(`Rol ${role} listo (idempotente${args.rotate ? ', contraseña rotada' : ''}).\n`);
    process.stdout.write(`Concede SELECT (con RLS por clínica): ${GRANTED_TABLES.join(', ')}\n`);
    process.stdout.write('Deniega:\n');
    for (const [table, reason] of Object.entries(DENIED_TABLES)) {
      process.stdout.write(`  - ${table}: ${reason}\n`);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`Error: ${(error as Error).message}\n`);
    return 1;
  } finally {
    await client.end();
  }
}

// Run only when executed directly, so tests can import the helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code));
}
