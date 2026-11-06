# Filtros de órdenes agrupados por estado

La lista de órdenes de los dos portales filtra por tres grupos en vez de por los siete estados, y el selector de estado por fila deja de ofrecer cambios inválidos.

**Scope**: `@repo/api-client` (definición de grupos), `@repo/ui` (valor inicial de filtros), portales Admin y Clientes, pruebas y documentación.

## Specs

- **S1** — Ambos portales filtran la lista por tres grupos: **Activas** (`creada`, `recibida`, `en_proceso`, `en_entrega`, `devuelta_correccion`), **Terminadas** (`terminada`) y **Canceladas** (`cancelada`).
- **S2** — Al entrar a `/ordenes`, ambos portales muestran el grupo **Activas**.
- **S3** — Los contadores por estado del panel Administrador siguen contando todas las órdenes; el filtro no altera los totales.
- **S4** — En la lista del Administrador, una orden en estado final muestra su estado como distintivo, no como selector. El selector de fila nunca ofrece `cancelada` y, cuando el cambio falla, vuelve a mostrar el estado real en lugar del intento.

## Tasks

- [x] T1 — `@repo/api-client`: `GRUPOS_ORDEN` y `grupoDeEstado()` con prueba unitaria. (S1) — `840088e`
- [x] T2 — `@repo/ui`: `initialFilterValues` en `DataTable`. Sin prueba: es un valor inicial de estado, no lógica con ramas. (S2) — `840088e`
- [x] T3 — Admin: filtro por grupo con Activas por defecto; los contadores no cambian. (S1, S2, S3) — `48b505f`
- [x] T4 — Admin: la columna Estado muestra distintivo en estados finales; el selector revierte el intento fallido y no ofrece `cancelada`. (S4) — `48b505f`
- [x] T5 — Clientes: mismo filtro por grupo con Activas por defecto. (S1, S2) — `48b505f`
- [x] T6 — Docs: `docs/portals.md`. (S1, S2) — `48b505f`

### Verificación observada

- `@repo/api-client`: `vitest run src/estados.spec.ts` → 3/3 (agrupación de los siete estados, sin solapamientos, `null` para slugs desconocidos).
- `tsc --noEmit` limpio en `packages/ui`, `packages/api-client`, `apps/admin` y `apps/clientes`.
- `eslint` sin hallazgos nuevos en los archivos tocados. `estado-fila-select.tsx` conserva sus tres errores previos de `react-hooks/set-state-in-effect` (efectos que ya estaban antes de esta feature); el revertir del selector se resolve con un valor derivado, sin agregar un efecto.
- No ejecutado: pasada manual en navegador de los dos portales con `infra:up` (los filtros son estado de componente y no hay suite de componentes en los portales).

## Log

- **L1** — «En el panel administrador, desde el portal de las órdenes... si guardo en el Select el estado por el cual le intente cambiar, ese también se devolverá cancelado. Y vamos a hacer algo: vamos a cambiar el filtro de los estados para agruparlos por las órdenes activas, que serían todos los estados como creada, recibida, en proceso, en entrega al cliente, devuelta para corrección. Y en otras, vamos a ver las terminadas y las canceladas. Esos tres grupos de estados nos van a permitir darle más facilidad al cliente para gestionar sus órdenes, ya que son clientes que no son demasiado diestros en la tecnología y darles muchas opciones para filtrar las órdenes los va a confundir y mostrarles también demasiadas órdenes a la vez... Eso no significa que esas órdenes que no se van a mostrar no van a influir en los estados. Así que hagamos ese cambio y sería bueno hacerlo en ambos portales.»
- **L2** — Decisión del cliente: al entrar, ambos portales muestran **Activas** por defecto.
- **L3** — Hallazgo: el `<select>` de cada fila (`estado-fila-select.tsx`) ofrecía los siete estados en cualquier orden, incluidas las finales, y conservaba el intento fallido; el filtro del Admin ofrecía siete opciones sueltas y el de Clientes no existía.
