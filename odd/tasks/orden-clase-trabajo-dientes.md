# Orden: clase de trabajo + odontograma por línea

**Objetivo**: al crear una orden, cada línea de trabajo indica en texto libre qué
trabajo es, sobre qué dientes se realiza y con qué color. El monto no se define
en la orden sino al armar la cuenta de cobro.

**Por qué**: el laboratorio necesita saber qué piezas se trabajan y con qué tono;
el campo de observaciones no servía para eso. Y el catálogo de servicios dejó de
ser una relación de la orden: una orden puede combinar trabajos que no están en
el catálogo.

**Decisiones**
- La línea guarda `servicio` como **texto libre** (máx. 120). Se eliminó
  `detalle_orden.servicio_id` y su FK: la orden ya no referencia el catálogo.
- Numeración FDI de dentición permanente (11-48), 32 dientes.
- **Un solo color por trabajo**: todos los dientes de la línea comparten el tono
  (`detalle_orden.color_diente`). `dientes` guarda sólo los números FDI.
- **Sin precio en la orden**: `precio_unitario` queda nullable sólo como
  histórico y `orden.valor` se crea en `0.00`. El importe se carga al adjuntar
  cada orden a una cuenta de cobro (`cuenta_cobro_orden.valor_snapshot`).
- El diagrama es un molde dentario: dos arcos en herradura (∩ / ∪), dientes
  distribuidos por longitud de arco y con forma propia (incisivo, canino,
  premolar, molar).

**Fuera de scope**: dentición temporal (51-85), caras del diente.

## Authorized scope

- `apps/api/src/database/migrations/1792633000000-AddDientesToDetalleOrden.ts`
- `apps/api/src/database/migrations/1792634000000-ReplaceServicioOnDetalleOrden.ts`
- `apps/api/src/pedidos/{detalle-orden.entity,dto/create-orden.dto,pedidos.service,pdf-control-trabajos.service}.ts`
- `apps/api/src/catalogo/servicios.service.ts` (+ spec)
- `apps/api/src/cuentas-cobro/{cuentas-cobro.service,dto/adjuntar-ordenes.dto,pdf-cuenta-cobro.service}.ts`
- `apps/api/src/mi-clinica/{mi-clinica.service,mi-clinica.module}.ts`
- `apps/api/src/pedidos/mailer-control-trabajos.service.ts`
- `packages/api-client/src/dientes.ts` (+ spec)
- `packages/ui/src/components/odontograma.tsx` (+ spec)
- `apps/admin/app/(portal)/ordenes/**`, `apps/admin/app/(portal)/cuentas-cobro/[id]/**`
- `apps/admin/lib/data/{types,repository,sample,helpers}.ts`
- `apps/clientes/app/(portal)/ordenes/**`, `apps/clientes/lib/data/{types,repository}.ts`
- `apps/clientes/proxy.ts` (preview dev-only), `apps/clientes/app/preview/odontograma/page.tsx`
- `playwright.config.ts`, `e2e/odontograma.spec.ts`

## Constraints

- Validación en el API (trust boundary) y en cada portal, con mensaje por fila.
- `dientes` es `jsonb NOT NULL DEFAULT '[]'` (array de números FDI).
- `color_diente` nullable: filas viejas sin tono; el DTO lo exige en órdenes nuevas.
- Sin librerías nuevas de UI: el molde es CSS grid/posicionamiento absoluto.
- El correo del control de trabajos se manda al usuario que confirma y a la
  clínica, sin romper la finalización si falla.

## Tasks

- [x] T1 — Textos: "Servicio(s)" → "Clase(s) de trabajo".
- [x] T2 — Migración + entidad con `dientes`, `color_diente` y sin `servicio_id`.
- [x] T3 — DTO: `servicio` texto libre, `dientes` FDI, `colorDiente` obligatorio.
- [x] T4 — Servicio: snapshot de la línea sin catálogo ni precio.
- [x] T5 — Odontograma en forma de molde, con forma por tipo de diente.
- [x] T6 — `parseDientes` / `parseColor` compartidos y testeados.
- [x] T7 — Mostrar dientes y color en detalle admin, tabla de clientes y PDF.
- [x] T8 — Portal de clientes: mismo formulario y validación por fila.
- [x] T9 — Cuenta de cobro: el valor por orden se carga al adjuntar.
- [x] T10 — Control de trabajos por correo también a la clínica.
- [x] T11 — Playwright: layout del molde en móvil, tablet y escritorio.

## Progress

- `bun run db:migrate` aplicado en local (`AddDientes…` y `ReplaceServicio…`).
- `docs/schema.sql` regenerado.
- `@playwright/test` agregado como devDependency en la raíz; chromium instalado.

## Verification

- `packages/api-client`: 105 tests; `tsc` OK; eslint OK.
- `packages/ui`: 20 tests (geometría del molde); `tsc` OK; eslint OK.
- `apps/api`: `tsc` OK; oxlint sin errores. La suite completa deja 2 fallas
  preexistentes en `src/config/env.validation.spec.ts` (leen el `.env` real).
- `apps/admin`: 27 tests (1 falla preexistente de formato de fechas); `tsc` OK.
- `apps/clientes`: `tsc` OK.
- Playwright: 9/9 en 3 resoluciones (móvil 412, tablet 768, escritorio 1440):
  ningún diente se superpone, no hay scroll horizontal, cada tipo conserva su
  forma. Capturas en `e2e/.results/`.
- No probado con SMTP real: el envío del PDF a la clínica queda best-effort.
