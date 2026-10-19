/**
 * Creates the data-protection keys in apps/api/.env when they are missing.
 *
 *   bun run keys:generate
 *
 * - Appends random 32-byte base64 values for ENCRYPTION_KEY and BLIND_INDEX_KEY.
 * - Never overwrites an existing key and never prints key values or .env
 *   contents: only the variable names that were created or already existed.
 *
 * WARNING: losing ENCRYPTION_KEY makes the encrypted personal data
 * unrecoverable. Back it up in a secrets manager and never commit or share it.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KEYS = ['ENCRYPTION_KEY', 'BLIND_INDEX_KEY'] as const;
const envPath = resolve(import.meta.dirname, '..', '.env');

const current = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

// A key "exists" when an uncommented, non-empty assignment is present.
function isDefined(name: string): boolean {
  return current.split('\n').some((line) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    return match !== null && match[1] === name && match[2].trim() !== '';
  });
}

const created: string[] = [];
const existing: string[] = [];
let addition = '';
for (const name of KEYS) {
  if (isDefined(name)) {
    existing.push(name);
  } else {
    addition += `${name}=${randomBytes(32).toString('base64')}\n`;
    created.push(name);
  }
}

if (addition !== '') {
  const separator = current === '' || current.endsWith('\n') ? '' : '\n';
  appendFileSync(envPath, separator + addition, { mode: 0o600 });
}

console.log(`created: ${created.length > 0 ? created.join(', ') : '(none)'}`);
console.log(
  `already existed: ${existing.length > 0 ? existing.join(', ') : '(none)'}`,
);
