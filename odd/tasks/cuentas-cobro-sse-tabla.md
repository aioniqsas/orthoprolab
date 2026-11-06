# Cuentas de cobro: tiempo real, filtros agrupados y DataTable

Las cuentas de cobro se actualizan sin recargar en Admin y Clientes, y las dos listas usan el DataTable compartido con tres grupos de estado y paginación.

**Scope**: `apps/api` (SSE), `packages/api-client` (grupos), `apps/admin` y `apps/clientes` (tablas y refresco en vivo), documentación.

## Specs

- **S1** — «Necesito que con las fuentes de cobro también hagamos server sent events para que se actualicen también en tiempo real.» Admin y Clientes reciben un evento cuando una cuenta de cobro cambia (creada, actualizada, pago registrado o anulado, PDF, envío, anulación) y la lista se refresca sin recargar la página.
- **S2** — «en el portal de clientes, tanto como en el administrador, vamos a usar data table de shadCN, por lo que necesitamos mejorar la UI en esa parte.» Las dos listas usan `DataTable` de `@repo/ui/components/data-table`; la de Clientes deja de ser una lista `<ul>`.
- **S3** — «los filtros agrupados por estados ... Pendientes pagadas o canceladas ... esos son tres estados». Tres grupos visibles, con Pendientes por defecto:
  - **Pendientes** = `borrador`, `emitida`, `pagada_parcial`
  - **Pagadas** = `pagada`
  - **Canceladas** = `anulada`

  La clínica nunca ve `borrador` (el API ya lo excluye), así que en Clientes el grupo queda con `emitida` y `pagada_parcial`. `pagada_parcial` cae en Pendientes a propósito: todavía se debe dinero.
- **S4** — «luego tendríamos la opción de paginar, que ya sería con la data table de ShadCN.» Ambas tablas paginan en cliente (los datos ya llegan completos) con tamaño de página elegible. No se agrega paginación al API: el volumen no lo justifica.

## Tasks

| ID  | Specs | Ruta   | Tarea                                                              | Commit |
| --- | ----- | ------ | ------------------------------------------------------------------ | ------ |
| T1  | S3    | inline | `GRUPOS_CUENTA` y `grupoDeCuenta` en `@repo/api-client`, con tests  | `141371a` |
| T2  | S1    | inline | Bus de eventos y endpoints SSE (Admin y Clientes) + emisión         | `0ae6cb0` |
| T3  | S3,S4 | inline | Admin: tres grupos con Pendientes por defecto y paginación          | `4ffbe19` |
| T4  | S2,S3,S4 | inline | Clientes: `DataTable` con los mismos grupos y paginación         | `ef5fe7c` |
| T5  | S1    | inline | Refresco en vivo en ambos portales (puente + componente cliente)     | `4ffbe19`, `ef5fe7c` |
| T6  | —     | inline | Documentación: `docs/portals.md` y `apps/api/docs`                  | este commit |

## Log

- **L1** — «Necesito que con las fuentes de cobro también hagamos server sent events para que se actualicen también en tiempo real. Y en el portal de clientes, tanto como en el administrador, vamos a usar data table de shadCN, por lo que necesitamos mejorar la UI en esa parte. Igualmente, los filtros agrupados por estados que serían visibles para el usuario 2, que serían. Pendientes pagadas o canceladas, bueno, esos son tres. El punto es que serían esos tres estados, y luego tendríamos la opción de paginar, que ya sería con la data table de ShadCN.»
- **L2** — Decisión de mapeo (S3): `borrador` y `pagada_parcial` entran en **Pendientes**. Un borrador todavía no se emitió y un pago parcial todavía debe dinero; esconderlos o marcarlos como pagados confundiría al operador. Cambiarlo es una línea en `GRUPOS_CUENTA`.
- **L3** — Decisión de arquitectura (S4): paginación en cliente. `DataTable` ya pagina y filtra en memoria; el endpoint devuelve todas las cuentas de la clínica o del laboratorio. Se reevalúa si una clínica supera el millar de cuentas.
- **L4** — T3, T4 y T5 iban para `gentle-ai-worker`; el guard rechazó el handoff dos veces (el cwd de la sesión es `app/apps` y la ruta `odd/tasks/...` no resuelve desde ahí), así que se hicieron inline. Rutas quedan registradas como `inline` en la tabla.
- **L5** — El stream de la clínica envía solo `tipo`, sin `cuentaId`: el bus es global y la clínica no debe ver ids de cuentas de otras clínicas. El del administrador sí los envía.

### Verificación observada

- `vitest run src/estados.spec.ts` (`packages/api-client`) → 6/6.
- `vitest run src/cuentas-cobro` (`apps/api`) → 5/5, incluido el bus nuevo.
- `tsc --noEmit` limpio en `packages/api-client`, `apps/api`, `apps/admin`, `apps/clientes`.
- `eslint` sin errores en los archivos nuevos y modificados; los avisos que quedan (`Button` sin usar en formularios de cuentas de cobro) son previos.
- **No verificado**: el refresco en vivo en un navegador real (requiere API y ambos portales corriendo) y la suite completa de `apps/admin`, que se cuelga en este entorno por agotamiento de hilos de vitest; los specs tocados se ejecutaron por archivo.
