/**
 * Creates the first administrator (never over HTTP).
 *
 *   bun run admin:create -- --correo a@b.co --cedula 1234567890 \
 *     --nombres "Ana" --apellidos "Perez"
 *
 * - Missing fields are asked interactively.
 * - The password is ALWAYS typed at a hidden prompt (twice). It is never a
 *   command-line argument or an environment variable.
 * - Automation: pass --password-stdin and pipe the password as one line on
 *   stdin (all other fields must then be given as options). Without a TTY and
 *   without --password-stdin the command refuses to run.
 * - Same validation rules as public registration (RegisterDto).
 * - Prints only the new user's id, correo and role. Exit code 0 on success,
 *   1 on failure (nothing is changed on duplicates), 2 on bad usage.
 */
import 'reflect-metadata';
import { createInterface } from 'node:readline/promises';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AdminCliModule } from '../src/auth/admin-cli.module.js';
import {
  ADMIN_FIELDS,
  AdminCreateError,
  createAdministrator,
  parseAdminArgs,
  readPasswordLine,
  typeormAdminStore,
} from '../src/auth/admin-bootstrap.js';
import { PasswordService } from '../src/crypto/password.service.js';

const USAGE = `Usage: bun run admin:create -- [--correo <email>] [--cedula <digits>]
                              [--nombres <text>] [--apellidos <text>]
                              [--password-stdin]

Missing fields are asked interactively. The password is prompted twice with
hidden input; for automation use --password-stdin and pipe one line to stdin.`;

const LABELS = {
  correo: 'Correo',
  cedula: 'Cedula',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
} as const;

/** Reads a line from the TTY with echo disabled. Resolves to the typed text. */
function promptHidden(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stderr.write(`${label}: `);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const finish = (error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stderr.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') return finish();
        if (ch === '\u0003') {
          return finish(new AdminCreateError('input', 'Cancelled.'));
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else if (ch >= ' ') value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function askMissing(
  values: Partial<Record<(typeof ADMIN_FIELDS)[number], string>>,
): Promise<Record<string, string>> {
  const missing = ADMIN_FIELDS.filter((f) => values[f] === undefined);
  if (missing.length === 0) return { ...values } as Record<string, string>;
  if (!process.stdin.isTTY) {
    throw new AdminCreateError(
      'usage',
      `Missing options without a terminal: ${missing.map((f) => `--${f}`).join(', ')}.`,
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answers: Record<string, string> = { ...values } as Record<
      string,
      string
    >;
    for (const field of missing) {
      answers[field] = (await rl.question(`${LABELS[field]}: `)).trim();
    }
    return answers;
  } finally {
    rl.close();
  }
}

async function obtainPassword(passwordStdin: boolean): Promise<string> {
  if (passwordStdin) return readPasswordLine(process.stdin);
  if (!process.stdin.isTTY) {
    throw new AdminCreateError(
      'usage',
      'stdin is not a terminal. Use --password-stdin to pipe the password.',
    );
  }
  const first = await promptHidden('Password');
  const second = await promptHidden('Repeat password');
  if (first !== second) {
    throw new AdminCreateError('input', 'The passwords do not match.');
  }
  return first;
}

async function main(): Promise<number> {
  const args = parseAdminArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  if (args.passwordStdin) {
    const missing = ADMIN_FIELDS.filter((f) => args.values[f] === undefined);
    if (missing.length > 0) {
      throw new AdminCreateError(
        'usage',
        `With --password-stdin all fields must be options. Missing: ${missing.map((f) => `--${f}`).join(', ')}.`,
      );
    }
  }

  // Everything is collected before touching the database.
  const fields = await askMissing(args.values);
  const password = await obtainPassword(args.passwordStdin);

  const app = await NestFactory.createApplicationContext(AdminCliModule, {
    logger: ['error'],
  });
  try {
    const created = await createAdministrator(
      {
        passwords: app.get(PasswordService),
        store: typeormAdminStore(app.get(DataSource)),
      },
      { ...fields, password },
    );
    console.log('Administrator created.');
    console.log(`id:     ${created.id}`);
    console.log(`correo: ${created.correo}`);
    console.log(`rol:    ${created.rol}`);
    return 0;
  } finally {
    await app.close();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof AdminCreateError) {
      console.error(`Error: ${error.message}`);
      for (const detail of error.code === 'invalid' ? error.details : []) {
        console.error(`  - ${detail}`);
      }
      process.exit(error.code === 'usage' ? 2 : 1);
    }
    // Unexpected failure: name and code only (messages may carry user data).
    const e = error as { name?: string; code?: string };
    console.error(
      `Unexpected error (${e?.name ?? 'unknown'}${e?.code ? `, ${e.code}` : ''}). Is the database up and migrated?`,
    );
    process.exit(1);
  },
);
