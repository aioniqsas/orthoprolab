# Zona horaria del negocio (America/Bogota)

La base de datos y los tres procesos Node trabajan en `America/Bogota`, y el formato de fechas se centraliza en `@repo/api-client` con zona explícita.

**Scope**: migración de entorno de base de datos, variables de ejecución, `packages/api-client` (helpers de fecha), portales Admin y Clientes, pruebas y documentación.

## Specs

- **S1** — La base de datos tiene `timezone = 'America/Bogota'` como valor por defecto de sesión, aplicado por migración reversible.
- **S2** — Los tres procesos Node (`apps/api`, `apps/admin`, `apps/clientes`) arrancan con `TZ=America/Bogota`.
- **S3** — `@repo/api-client` expone `ZONA_NEGOCIO`, `diaNegocio()`, `hoyNegocio()`, `formatearFecha()` y `formatearFechaHora()`. `diaNegocio` y `hoyNegocio` usan la zona de forma **explícita** (`Intl.DateTimeFormat` con `timeZone`), sin depender del `TZ` del proceso.
- **S4** — Ningún portal ni el API calcula "hoy" con `new Date().toISOString().slice(0, 10)` ni formatea fechas con `toLocaleDateString`/`toLocaleString` sueltos.
- **S5** — El SQL que depende de la zona de sesión queda explícito o auditado: el CHECK `ck_orden_fecha_entrega` ya usa `AT TIME ZONE 'America/Bogota'` y no cambia con S1.

## Tasks

- [ ] T1 — `packages/api-client`: `fechas.ts` + pruebas + export + declarar `date-fns`. (S3)
- [ ] T2 — Migración `ALTER DATABASE ... SET timezone 'America/Bogota'` con `down` a `UTC`. (S1)
- [ ] T3 — Entorno: `TZ=America/Bogota` en los scripts de los tres apps y en el servicio Postgres de `compose.yaml`. (S2)
- [ ] T4 — Admin: `formatDate`/`formatDateTime` delegan en el helper compartido. (S4)
- [ ] T5 — Clientes: reemplazar `toLocaleDateString`/`toLocaleString` de fecha y el `toISOString().slice(0, 10)` del formulario de pago. (S4)
- [ ] T6 — Docs: `docs/portals.md` (sección de fechas) y nota de `timezone` en `apps/api/docs/database-model.md`. (S1–S5)
- [ ] T7 — Verificación y commits por unidad.

## Log

- **L1** — «Podemos cambiarle el timezone a la bd? para que maneje zona horaria de bogotá? manejemos toda fecha con datefns».
- **L2** — Aclaración técnica aceptada: `timestamptz` guarda instantes; el `TimeZone` de la base solo afecta `CURRENT_DATE`, casts y comparaciones con `date`. Los formateos en JS dependen del `TZ` del proceso, no de la base.
- **L3** — Decisión del cliente: estrategia de entorno (base + procesos en Bogotá) **y** formato centralizado en `@repo/api-client`.
- **L4** — Decisión del cliente: `date-fns` + `Intl`, sin agregar `@date-fns/tz`.
- **L5** — Hallazgos de la auditoría: `new Date().toISOString().slice(0, 10)` en el formulario de pago de Clientes (día UTC), cinco `toLocaleDateString`/`toLocaleString` en Clientes, `date-fns` importado sin declarar en `apps/api` y `apps/admin` (solo está en el `package.json` raíz).
