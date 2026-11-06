# Cancelación de órdenes y estados definitivos

Botón de cancelar operativo en los dos portales y regla de irreversibilidad para `cancelada` y `terminada`, aplicada en el API y visible en la interfaz.

**Scope**: API de pedidos (NestJS) + portales Admin y Clientes + pruebas + documentación.

## Specs

- **S1** — Una orden se puede cancelar desde cualquier estado que no sea final: `creada`, `recibida`, `en_proceso`, `en_entrega` y `devuelta_correccion`.
- **S2** — Los dos portales (Administrador y Clientes) ofrecen la acción de cancelar en esa misma ventana de estados; no hay diferencia de alcance entre ellos.
- **S3** — `cancelada` y `terminada` son definitivas: desde ellas no se admite ningún cambio de estado posterior. El API responde 403 con `No se puede cambiar el estado de una orden en estado "<Nombre>".`
- **S4** — La cancelación solo ocurre por la acción de cancelación (`DELETE /ordenes/:id`, `DELETE /mi-clinica/ordenes/:id`), que registra el motivo en `historial_estado_orden`. El cambio de estado genérico rechaza `cancelada` como destino: `Para anular una orden usa la acción de cancelación.`
- **S5** — En el detalle de la orden del portal Administrador, una orden final no muestra el formulario de cambio de estado; muestra un aviso de estado definitivo. El selector de estados no ofrece `cancelada`.

## Tasks

- [x] T1 — API: `PedidosService.cancelar` acepta cualquier estado no final; `cambiarEstado` bloquea salir de un estado final y rechaza `cancelada` como destino. (S1, S3, S4) — `adcd92a`
- [x] T2 — API: guardas de `mi-clinica` (devolver/finalizar) usan `esFinal` en vez del literal `cancelada`. (S3) — `adcd92a`
- [x] T3 — Admin: helper `esEstadoFinal`, aviso de estado definitivo y filtro de `cancelada` en el selector. (S3, S5) — `ecc1f50`
- [x] T4 — Admin: `AccionesOrden` separa "Editar" (solo `creada`) de "Cancelar" (cualquier estado no final) y actualiza el texto del diálogo. (S2) — `ecc1f50`
- [x] T5 — Clientes: `AccionesOrden` y el detalle aplican la misma ventana de cancelación. (S2) — `ecc1f50`
- [x] T6 — Pruebas unitarias del API (cancelación y reversibilidad) y del helper de Admin. (S1–S5) — `adcd92a`, `ecc1f50`
- [x] T7 — Docs: `docs/portals.md` y `apps/api/docs/database-model.md` (pregunta abierta 4). (S1–S4) — `adcd92a`, `ecc1f50`

### Límite de slice

Los dos commits de esta feature viven en la rama `feat/orden-cancelacion-irreversible`, creada sobre `feat/renovacion-sesion-portales`. Esa rama base ya aportaba 24 commits, así que un PR contra `main` incluiría trabajo ajeno a esta feature: entregar con PRs encadenados o rebasar sobre `main` antes de abrir el PR (decisión del dueño del repositorio).

### Verificación observada

- `apps/api`: `vitest run src/pedidos/pedidos.service.spec.ts` → 10/10. Contra el código anterior (copia de `HEAD`) fallan 3 de las nuevas: cancelar desde `recibida`, salir de `terminada`, anular por `PATCH /estado`.
- `tsc --noEmit` limpio en `apps/api`, `apps/admin` y `apps/clientes`.
- `oxlint --type-aware src/` en `apps/api`: sin hallazgos nuevos (dos avisos previos en `clinicas.service.ts`).
- `eslint` en los archivos tocados: sin hallazgos nuevos; quedan avisos/errores previos en `admin/lib/data/types.ts`, `sample.ts` y los `editar-orden-form.tsx`.
- `apps/admin` `vitest run lib/data/helpers.spec.ts` → 12/13, incluida la prueba nueva de `esEstadoFinal`; falla solo `formats dates in the Bogota time zone`, previa y ajena (espera mes abreviado y la implementación usa `MMMM`).
- No ejecutado: `test:e2e` y la comprobación diferencial contra el API anterior (requieren `infra:up` con Podman, `bun` no está disponible en este entorno) y la pasada manual en navegador de los dos portales.

## Log

- **L1** — «Necesito que hagamos el botón de cancelar tanto en el portal Administrador como en el portal Clientes y, además, si una orden es cancelada ya su estado es irreversible, no se puede volver a cambiar. Es decir, una orden no puede volver de cancelada a recibida. Si la orden se cancela, es cancelada y en definitiva.»
- **L2** — Hallazgo de exploración: el botón ya existía en ambos portales, limitado a `creada`; el API ya bloqueaba salir de `cancelada`, pero el portal Admin ofrecía igualmente el formulario de cambio de estado sobre órdenes canceladas y `terminada` (`es_final = true`) no estaba protegido.
- **L3** — Decisión del cliente: ventana de cancelación = cualquier estado no final.
- **L4** — Decisión del cliente: ambos portales con la misma ventana.
- **L5** — Decisión del cliente: `terminada` también es definitiva.
- **L6** — Implementado en `adcd92a` (API) y `ecc1f50` (portales). Identidad de commit tomada de la configuración local del repositorio (`git config --local`), que no existía: se replicó el autor de los commits previos.
