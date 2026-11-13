import { describe, expect, it } from 'vitest';
import {
  buildBotRoleStatements,
  DENIED_TABLES,
  GRANTED_TABLES,
  RLS_POLICIES,
} from './bot-role-sql.js';
import { parseBotRoleArgs, resolveAdminTarget, UsageError } from './bot-role.js';

const base = {
  role: 'whatsapp_bot',
  database: 'orthopro',
  password: "se'cret",
  exists: false,
  rotate: false,
};

describe('buildBotRoleStatements', () => {
  it('crea el rol con atributos de mínimo privilegio y la contraseña citada', () => {
    const create = buildBotRoleStatements(base).find((s) => s.startsWith('CREATE ROLE'));
    expect(create).toBe(
      "CREATE ROLE \"whatsapp_bot\" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD 'se''cret'",
    );
  });

  it('no existe GRANT ALL y no concede escrituras ni secuencias', () => {
    const statements = buildBotRoleStatements(base);
    expect(statements.some((s) => /GRANT ALL/i.test(s))).toBe(false);
    expect(statements.some((s) => /GRANT (SELECT|INSERT|UPDATE|DELETE)/i.test(s) && !/GRANT SELECT/i.test(s))).toBe(false);
    expect(statements.filter((s) => s.includes('GRANT'))).toEqual([
      'GRANT CONNECT ON DATABASE "orthopro" TO "whatsapp_bot"',
      'GRANT USAGE ON SCHEMA public TO "whatsapp_bot"',
      ...GRANTED_TABLES.map((t) => `GRANT SELECT ON TABLE public."${t}" TO "whatsapp_bot"`),
    ]);
  });

  it('concede SELECT exactamente sobre las tablas del allowlist y habilita RLS', () => {
    const statements = buildBotRoleStatements(base);
    for (const table of GRANTED_TABLES) {
      expect(statements).toContain(`GRANT SELECT ON TABLE public."${table}" TO "whatsapp_bot"`);
      expect(statements).toContain(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);
      expect(statements).toContain(`DROP POLICY IF EXISTS bot_read_${table} ON public."${table}"`);
      expect(statements).toContain(
        `CREATE POLICY bot_read_${table} ON public."${table}" FOR SELECT TO "whatsapp_bot" USING (${RLS_POLICIES[table]})`,
      );
    }
  });

  it('ninguna tabla denegada aparece en statement alguno', () => {
    const statements = buildBotRoleStatements(base).join('\n');
    for (const table of Object.keys(DENIED_TABLES)) {
      expect(statements).not.toContain(`"${table}"`);
      expect(statements).not.toMatch(new RegExp(`\\b${table}\\b`));
    }
  });

  it('concede configuracion_bot solo de lectura y con contexto de clínica', () => {
    expect(GRANTED_TABLES).toContain('configuracion_bot');
    const statements = buildBotRoleStatements(base);
    expect(statements).toContain('GRANT SELECT ON TABLE public."configuracion_bot" TO "whatsapp_bot"');
    expect(statements.some((s) => /configuracion_bot/i.test(s) && /(INSERT|UPDATE|DELETE|GRANT ALL)/i.test(s))).toBe(false);
    expect(statements).toContain(
      `CREATE POLICY bot_read_configuracion_bot ON public."configuracion_bot" FOR SELECT TO "whatsapp_bot" USING (${RLS_POLICIES['configuracion_bot']})`,
    );
  });

  it('fija los límites a nivel de rol', () => {
    const statements = buildBotRoleStatements(base);
    expect(statements).toContain('ALTER ROLE "whatsapp_bot" SET default_transaction_read_only = on');
    expect(statements).toContain("ALTER ROLE \"whatsapp_bot\" SET statement_timeout = '5s'");
    expect(statements).toContain("ALTER ROLE \"whatsapp_bot\" SET idle_in_transaction_session_timeout = '10s'");
    expect(statements).toContain("ALTER ROLE \"whatsapp_bot\" SET work_mem = '16MB'");
    expect(statements).toContain("ALTER ROLE \"whatsapp_bot\" SET search_path = 'public'");
  });

  it('es idempotente: sobre un rol existente sin --rotate no toca la contraseña', () => {
    const statements = buildBotRoleStatements({ ...base, exists: true });
    expect(statements.some((s) => s.startsWith('CREATE ROLE'))).toBe(false);
    expect(statements.some((s) => /PASSWORD/i.test(s))).toBe(false);
  });

  it('con --rotate re-aplica la contraseña y los atributos', () => {
    const statements = buildBotRoleStatements({ ...base, exists: true, rotate: true });
    expect(statements).toContain(
      "ALTER ROLE \"whatsapp_bot\" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD 'se''cret'",
    );
  });
});

describe('parseBotRoleArgs', () => {
  it('acepta --rotate', () => {
    expect(parseBotRoleArgs(['--rotate'])).toEqual({ rotate: true });
    expect(parseBotRoleArgs([])).toEqual({ rotate: false });
  });

  it('rechaza argumentos desconocidos', () => {
    expect(() => parseBotRoleArgs(['--otro'])).toThrow(UsageError);
  });
});

describe('resolveAdminTarget', () => {
  it('prefiere WHATSAPP_DB_ADMIN_URL', () => {
    expect(resolveAdminTarget({ WHATSAPP_DB_ADMIN_URL: 'postgresql://a:b@h/db' })).toEqual({
      connectionString: 'postgresql://a:b@h/db',
    });
  });

  it('cae a DATABASE_* y exige las obligatorias', () => {
    const env = {
      DATABASE_HOST: 'h',
      DATABASE_PORT: '5432',
      DATABASE_USER: 'u',
      DATABASE_PASSWORD: 'p',
      DATABASE_NAME: 'd',
      DATABASE_SSL: 'true',
    };
    expect(resolveAdminTarget(env)).toMatchObject({ host: 'h', port: 5432, user: 'u', database: 'd' });
    expect(() => resolveAdminTarget({})).toThrow(/DATABASE_PASSWORD/);
  });

  it('aplica los mismos valores por defecto que env.validation.ts', () => {
    expect(resolveAdminTarget({ DATABASE_PASSWORD: 'p' })).toMatchObject({
      host: 'localhost',
      port: 5432,
      user: 'orthopro',
      database: 'orthopro',
    });
  });

  it('prefiere WHATSAPP_DB_ADMIN_URL incluso con DATABASE_URL presente', () => {
    expect(
      resolveAdminTarget({ WHATSAPP_DB_ADMIN_URL: 'postgresql://a:b@h/db', DATABASE_URL: 'postgresql://x:y@z/n' }),
    ).toEqual({ connectionString: 'postgresql://a:b@h/db' });
  });

  it('usa una DATABASE_URL completa cuando no hay URL administrativa', () => {
    expect(resolveAdminTarget({ DATABASE_URL: 'postgresql://x:y@z/n' })).toEqual({
      connectionString: 'postgresql://x:y@z/n',
    });
  });

  it('acepta DATABASE_USERNAME como alternativa a DATABASE_USER', () => {
    const env = {
      DATABASE_HOST: 'h',
      DATABASE_PASSWORD: 'p',
      DATABASE_NAME: 'd',
      DATABASE_USERNAME: 'u2',
    };
    expect(resolveAdminTarget(env)).toMatchObject({ host: 'h', user: 'u2', database: 'd' });
  });

  it('DATABASE_USER gana sobre DATABASE_USERNAME', () => {
    expect(resolveAdminTarget({ DATABASE_PASSWORD: 'p', DATABASE_USER: 'u1', DATABASE_USERNAME: 'u2' })).toMatchObject({ user: 'u1' });
  });
});
