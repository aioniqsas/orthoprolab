# Gestión de órdenes — Fase 1

**Objetivo**: Implementar el módulo completo de gestión de órdenes en el admin:
panel de estadísticas por estado, listado real desde el API y transiciones de estado.

**Scope**: API de pedidos (NestJS) + panel de estadísticas + cambio de estado en admin.
**Fuera de scope**: cuentas de cobro, pagos, PDF (Fase 2).

## Authorized scope

- `apps/api/src/pedidos/` — nuevo servicio + controlador + DTOs
- `apps/api/src/database/migrations/` — migración de estados
- `apps/api/src/app.module.ts` — si hace falta registrar PedidosModule
- `apps/admin/lib/data/types.ts` — actualizar EstadoOrden
- `apps/admin/lib/data/repository.ts` — wiring real API
- `apps/admin/lib/data/sample.ts` — actualizar slugs de muestra
- `apps/admin/app/(portal)/ordenes/` — panel stats + enable state change

## Constraints

- `pedidos.module.ts` ya registra las tres entidades; no recrear el módulo, solo agregar servicio + controlador.
- `orden.valor` = SUM(cantidad * precio_unitario) — invariante; el servicio debe recalcular en toda transacción que toque líneas.
- `detalle_orden.precio_unitario` se copia de `servicio.precio` en la creación (snapshot).
- Toda transición de estado: actualizar `orden.estado_id` + insertar en `historial_estado_orden` en la misma transacción.
- `historial_estado_orden` es append-only.
- Los estados viven en tabla `estado_orden` (catalog DB-driven, no enum TypeScript).
- Relative imports en la API deben terminar en `.js`.
- ESM project — no CommonJS require.
- Tests de la API: Vitest (`*.spec.ts`); no tocar suites completas.

## Order states (7 total)

| codigo | nombre | posicion | esFinal |
|---|---|---|---|
| creada | Creada | 1 | false |
| recibida | Recibida | 2 | false |
| en_proceso | En proceso | 3 | false |
| cancelada | Cancelada | 4 | true |
| en_entrega | En entrega al cliente | 5 | false |
| devuelta_correccion | Devuelta para corrección | 6 | false |
| terminada | Terminada | 7 | true |

**Migration note**: el slug `en_produccion` existente se renombra a `en_proceso`
(no hay datos reales de órdenes en staging todavía).

## API endpoints

```
GET  /ordenes          list (filters: estadoId?, urgente?, doctorId?)
GET  /ordenes/stats    count by estado { [codigo]: number }
GET  /ordenes/:id      detail with detalles[] + historial[]
PATCH /ordenes/:id/estado  body: { estadoId, observaciones? }
```

Todos protegidos por JWT guard global. Solo rol `admin` puede acceder (usar `@Roles('admin')`).
`GET /ordenes/stats` y `GET /ordenes` también accesibles por rol `molde` si existe, de lo contrario solo admin.

## Admin panel changes

1. **Stats panel** al inicio de `/ordenes`: tarjetas por estado (nombre + count), usando el endpoint `/ordenes/stats`.
2. **Repository**: flip `SAMPLE_DATA` a `false`, wiring `listOrdenes()` → `GET /ordenes`, `getOrden()` → `GET /ordenes/:id`.
3. **Order detail**: habilitar el botón "Cambiar estado" (reemplazar `DisabledAction` con un formulario de selección de estado + observaciones).
4. **EstadoOrden type**: actualizar a los 7 slugs nuevos.

## Tasks

- [ ] T1 — Migración: seed completo de los 7 estados de orden (rename en_produccion → en_proceso)
- [ ] T2 — API: PedidosService + PedidosController (list, stats, detail, cambiar estado)
- [ ] T3 — Admin types + repository wiring (flip SAMPLE_DATA, update EstadoOrden)
- [ ] T4 — Admin UI: stats panel + habilitar cambio de estado en detalle

## Acceptance criteria

- `GET /ordenes/stats` retorna conteo por cada uno de los 7 estados.
- `PATCH /ordenes/:id/estado` inserta en historial Y actualiza `orden.estado_id` en la misma transacción.
- El panel `/ordenes` muestra estadísticas reales desde el API.
- El detalle de orden permite cambiar el estado; el historial se actualiza sin reload.
- Type-check limpio (`bunx tsc --noEmit`).

## Progress

_Sin commits aún._
