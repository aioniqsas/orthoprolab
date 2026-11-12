/**
 * SQL statement builder for the `whatsapp_bot` PostgreSQL role (task IA1).
 *
 * Pure module: no connection, no environment access. The CLI lives in
 * `bot-role.ts`. The statements are allowlist-only (no GRANT ALL) and every
 * re-run emits the same statements, so the script is idempotent.
 */

export interface BuildRoleOptions {
  /** Role name (WHATSAPP_DB_USER). */
  role: string;
  /** Target database, always the one the administrative connection opened. */
  database: string;
  /** Password in clear; it is quoted but never printed by the caller. */
  password: string;
  /** True when the role already exists in pg_roles. */
  exists: boolean;
  /** --rotate: re-apply the password from WHATSAPP_DB_PASSWORD. */
  rotate: boolean;
}

/** Tables the bot may read (business data it answers with). */
export const GRANTED_TABLES = [
  'orden',
  'detalle_orden',
  'estado_orden',
  'cuenta_cobro',
  'cuenta_cobro_orden',
  'pago',
  'doctor',
  'paciente',
  'paciente_doctor',
  'servicio',
  'clinica',
  'configuracion_bot',
] as const;

/** Tables explicitly denied, with the reason surfaced by the CLI summary. */
export const DENIED_TABLES: Readonly<Record<string, string>> = {
  usuario: 'credenciales y datos personales del portal; el bot nunca autentica usuarios',
  sesion_refresco: 'hashes de tokens de sesión del portal',
  whatsapp_contacto: 'tabla de autenticación del bot; la identidad la resuelve código determinista',
  whatsapp_sesion_auditoria: 'auditoría interna; solo escritura por la API',
  whatsapp_llamada: 'auditoría interna; solo escritura por la API',
  migrations: 'infraestructura de migraciones',
  historial_estado_orden: 'historial interno de estados, no lo necesita el catálogo del bot',
  rol: 'catálogo de roles del portal',
  contenido_web: 'CMS del sitio público, fuera del dominio del bot',
  envio_cuenta_cobro: 'log de envíos de correo con direcciones',
  metodo_pago_bancario: 'números de cuenta bancaria; dato financiero fuera del alcance del bot',
};

/** The clinic context GUC the bot sets per transaction with SET LOCAL. */
export const CLINICA_GUC = "current_setting('app.clinica_id', true)::bigint";

/**
 * RLS predicate per granted table. `FOR SELECT` only: the role cannot write.
 * When `app.clinica_id` is unset, current_setting(..., true) yields NULL and
 * every predicate is false, so the bot sees nothing without clinic context.
 */
export const RLS_POLICIES: Readonly<Record<string, string>> = {
  // Direct clinica_id column.
  cuenta_cobro: `clinica_id = ${CLINICA_GUC}`,
  doctor: `clinica_id = ${CLINICA_GUC}`,
  // The clinic row itself: its id IS the clinic id.
  clinica: `id = ${CLINICA_GUC}`,
  // orden has no clinica_id: it reaches the clinic through its doctor.
  orden: `EXISTS (SELECT 1 FROM public.doctor d WHERE d.id = orden.doctor_id AND d.clinica_id = ${CLINICA_GUC})`,
  detalle_orden: `EXISTS (SELECT 1 FROM public.orden o JOIN public.doctor d ON d.id = o.doctor_id WHERE o.id = detalle_orden.orden_id AND d.clinica_id = ${CLINICA_GUC})`,
  cuenta_cobro_orden: `EXISTS (SELECT 1 FROM public.cuenta_cobro cc WHERE cc.id = cuenta_cobro_orden.cuenta_cobro_id AND cc.clinica_id = ${CLINICA_GUC})`,
  pago: `EXISTS (SELECT 1 FROM public.cuenta_cobro cc WHERE cc.id = pago.cuenta_cobro_id AND cc.clinica_id = ${CLINICA_GUC})`,
  // paciente reaches the clinic through its (active) assignments.
  paciente: `EXISTS (SELECT 1 FROM public.paciente_doctor pd JOIN public.doctor d ON d.id = pd.doctor_id WHERE pd.paciente_id = paciente.id AND pd.eliminado_en IS NULL AND d.clinica_id = ${CLINICA_GUC})`,
  paciente_doctor: `EXISTS (SELECT 1 FROM public.doctor d WHERE d.id = paciente_doctor.doctor_id AND d.clinica_id = ${CLINICA_GUC})`,
  // Global catalog tables: readable only with a clinic context set.
  servicio: `${CLINICA_GUC} IS NOT NULL`,
  estado_orden: `${CLINICA_GUC} IS NOT NULL`,
  // Bot configuration (key/value, e.g. its name): same global-catalog rule.
  configuracion_bot: `${CLINICA_GUC} IS NOT NULL`,
};

const q = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;
const quoteLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Emits the ordered SQL statements. Reads are granted per table; everything
 * else (ALL TABLES/SEQUENCES revokes) keeps re-runs deterministic even if a
 * privilege leaked earlier. No INSERT/UPDATE/DELETE, no sequences, no FORCE
 * ROW LEVEL SECURITY (the API user owns the tables and must keep working).
 */
export function buildBotRoleStatements(options: BuildRoleOptions): string[] {
  const { role, database, password, exists, rotate } = options;
  const r = q(role);
  const statements: string[] = [];

  if (!exists) {
    statements.push(
      `CREATE ROLE ${r} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(password)}`,
    );
  } else if (rotate) {
    statements.push(
      `ALTER ROLE ${r} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD ${quoteLiteral(password)}`,
    );
  }

  // Role-level settings (idempotent: SET stores, does not fail on repeat).
  statements.push(
    `ALTER ROLE ${r} SET default_transaction_read_only = on`,
    `ALTER ROLE ${r} SET statement_timeout = '5s'`,
    `ALTER ROLE ${r} SET idle_in_transaction_session_timeout = '10s'`,
    `ALTER ROLE ${r} SET work_mem = '16MB'`,
    `ALTER ROLE ${r} SET search_path = 'public'`,
  );

  // Database and schema: connect + usage only, never CREATE.
  statements.push(
    `REVOKE ALL PRIVILEGES ON DATABASE ${q(database)} FROM ${r}`,
    `GRANT CONNECT ON DATABASE ${q(database)} TO ${r}`,
    `REVOKE ALL ON SCHEMA public FROM ${r}`,
    `GRANT USAGE ON SCHEMA public TO ${r}`,
  );

  // Deterministic baseline: drop any privilege not re-granted below.
  statements.push(
    `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${r}`,
    `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${r}`,
  );

  for (const table of GRANTED_TABLES) {
    statements.push(
      `GRANT SELECT ON TABLE public.${q(table)} TO ${r}`,
      `ALTER TABLE public.${q(table)} ENABLE ROW LEVEL SECURITY`,
      `DROP POLICY IF EXISTS bot_read_${table} ON public.${q(table)}`,
      `CREATE POLICY bot_read_${table} ON public.${q(table)} FOR SELECT TO ${r} USING (${RLS_POLICIES[table]})`,
    );
  }

  return statements;
}
