# Orden: clase de trabajo + odontograma por línea

**Objetivo**: al crear una orden, cada línea (trabajo) indica los dientes sobre
los que se realiza y el color de cada diente. Además "servicio" pasa a llamarse
"clase de trabajo" en los textos visibles.

**Por qué**: el laboratorio necesita saber qué piezas se trabajan y con qué tono;
el campo de observaciones no servía para eso.

**Decisiones**
- Numeración FDI de dentición permanente (11-48), 32 dientes, superiores e
  inferiores.
- Selección por trabajo (cada detalle de la orden), no por orden.
- **Un solo color por trabajo**: todos los dientes de la línea comparten el tono
  (`detalle_orden.color_diente`). `dientes` guarda sólo los números FDI.
- El diagrama se dibuja como molde dentario: dos arcos en herradura (∩ / ∪).
- Dientes y color obligatorios en órdenes nuevas; las viejas quedan con `[]` y
  color nulo.

**Fuera de scope**: dentición temporal (51-85), caras/piezas del diente,
selección de dientes por línea en el catálogo, edición posterior de una orden.

## Authorized scope

- `apps/api/src/database/migrations/1792633000000-AddDientesToDetalleOrden.ts` (nuevo)
- `apps/api/src/pedidos/detalle-orden.entity.ts`
- `apps/api/src/pedidos/dto/create-orden.dto.ts` + spec
- `apps/api/src/pedidos/pedidos.service.ts`
- `apps/api/src/pedidos/pdf-control-trabajos.service.ts`
- `apps/admin/lib/dientes.ts` + spec (nuevo) → movido a `packages/api-client/src/dientes.ts` + spec
- `packages/ui/src/components/odontograma.tsx` (nuevo, compartido por ambos portales)
- `packages/api-client/src/index.ts`
- `apps/admin/app/(portal)/ordenes/nueva/` (form, actions)
- `apps/clientes/app/(portal)/ordenes/nuevo/` (form, actions)
- `apps/admin/lib/data/{types,repository,sample}.ts`
- `apps/admin/app/(portal)/ordenes/[id]/page.tsx`
- `apps/clientes/lib/data/types.ts`
- `apps/clientes/app/(portal)/ordenes/detalles-table.tsx`
- `apps/api/docs/schema.sql` (generado)

## Constraints

- Validación en el API (trust boundary) y en el admin (mensaje por fila).
- `dientes` es `jsonb NOT NULL DEFAULT '[]'` (array de números FDI); el CHECK
  sólo valida que sea array.
- `color_diente` es `text` nullable (filas viejas sin tono); el DTO lo exige en
  órdenes nuevas.
- Sin librerías nuevas: el diagrama es CSS grid + botones.
- No tocar el catálogo: el modelo sigue siendo `servicio`.

## Tasks

- [x] T1 — Textos: "Servicio(s)" → "Clase(s) de trabajo" en form, errores y detalle.
- [x] T2 — Migración + entidad `dientes jsonb`.
- [x] T3 — DTO con `dientes` (FDI, sin repetir) + `colorDiente` obligatorio + tests.
- [x] T4 — Servicio: snapshot de dientes y color + rechazo de dientes repetidos.
- [x] T5 — Odontograma en forma de molde (client) + integración por fila.
- [x] T6 — `parseDientes` / `parseColor` con tests (FDI, duplicados, color).
- [x] T7 — Mostrar dientes en detalle admin, tabla de clientes y PDF.
- [x] T8 — Portal de clientes: odontograma por línea, `dientes` en el payload,
  validación por fila y textos "clase de trabajo".
- [x] T9 — `Odontograma` y `parseDientes` compartidos: movidos a
  `packages/ui` y `packages/api-client`.

## Progress

- Migración aplicada en la BD local (`AddDientesToDetalleOrden1792633000000`).
- La columna temporal `color_diente` (nunca commiteada) se dropea en la misma
  migración con `IF EXISTS`.
- `bun run db:schema` regeneró `docs/schema.sql`.

## Verification

- `packages/api-client`: `vitest` 105 passed; `tsc` OK; eslint OK.
- `packages/ui`: `vitest` 20 passed (geometría del molde); `tsc` OK; eslint OK.
- `apps/api`: `vitest src/pedidos src/auth` 85 passed; `tsc` OK; oxlint sin errores.
  La suite completa deja 2 fallas preexistentes y ambientales en
  `src/config/env.validation.spec.ts` (leen el `.env` real).
- `apps/admin`: `vitest` 27 passed (1 falla preexistente en `helpers.spec.ts`,
  formato de fechas); `tsc` OK; eslint sin errores nuevos.
- `apps/clientes`: `tsc` OK; eslint de los archivos tocados OK.
- No verificado en navegador: interacción del odontograma ni el envío real
  desde el portal de clientes.
