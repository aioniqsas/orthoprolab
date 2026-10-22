# Tablas del admin con DataTable (shadcn)

## Objective

Que las cuatro listas del panel de administración (Catálogo, Clínicas, Órdenes, Usuarios) usen una tabla de datos estilo shadcn con búsqueda, filtros y paginación dentro de la tabla, en vez de tablas estáticas con formularios de filtro aparte.

## Problem

Cada página repetía el mismo patrón: un `<form method="get">` de búsqueda, unas pestañas de estado por URL (`searchParams`) y un `<Table>` con todas las filas. Los filtros vivían en la URL (con `parse*Filters`), el listado era server-side y no había paginación: con muchas filas la tabla crece sin control y el usuario tiene que filtrar por URL a mano. Además el filtro por texto y el de estado no se podían combinar.

## Scope

- `packages/ui`: componente `DataTable` (cliente) reutilizable: columnas declarativas, búsqueda global (ignora mayúsculas y acentos), filtros por columna (select), paginación con selector de filas por página, estado vacío y vista mobile por callback.
- `apps/admin`: un componente cliente por página (`servicios-table.tsx`, `clinicas-table.tsx`, `orders-table.tsx`, `usuarios-table.tsx`) con las columnas, los filtros y las tarjetas mobile actuales.
- Las páginas server-side siguen trayendo los datos y conservan `PageHeader`, `Suspense`, `ListSkeleton` y el guard `isAdmin()`; pierden el `searchParams` porque el filtro ahora es del cliente.

## Out of scope

- Ordenamiento por columna, visibilidad de columnas y exportes: no se pidieron.
- Ordenamiento y filtrado en el servidor: el volumen del panel no lo justifica.
- La matriz de permisos de `/usuarios` no es una tabla de datos y queda como estaba.
- Borrar `SearchForm`, `FilterTabs` y los helpers `filter*`/`parse*Filters` que quedan sin uso (siguen cubiertos por sus tests).

## Constraints

- Sin dependencias nuevas: el registry npm no es alcanzable desde este entorno, así que no se pudo instalar `@tanstack/react-table`. La tabla se implementó con las primitivas `Table` de `@repo/ui` y `<select>` nativo, que es el patrón de la casa.
- Copy de la UI en español; código y comentarios en inglés/español según el archivo, con el estilo de cada app (puntos y comas en `apps/admin`, sin puntos y comas en `packages/ui`).
- La tabla es un componente cliente: las páginas server-side le pasan datos planos (strings, números, booleanos).

## Tasks

- [x] T1 `packages/ui/src/components/data-table.tsx`: `DataTable`, `DataTableColumn`, `DataTableFilter`, `filterRows`, `paginate`.
- [x] T2 Tests de la lógica de filtro y paginación en `packages/ui/src/components/data-table.spec.tsx`.
- [x] T3 Catálogo: `servicios-table.tsx` (búsqueda por nombre/descripción, filtro por estado) y `page.tsx` sin filtros por URL.
- [x] T4 Clínicas: `clinicas-table.tsx` (búsqueda por clínica/dirección/doctor) y `page.tsx` sin formulario de búsqueda.
- [x] T5 Órdenes: `orders-table.tsx` (búsqueda por número/doctor/paciente, filtros por estado y urgencia), `orders-view.tsx` y `page.tsx` sin `searchParams`.
- [x] T6 Usuarios: `usuarios-table.tsx` (búsqueda por nombre/correo, filtros por rol y estado) y `page.tsx` sin pestañas de rol.
- [x] T7 Verificación: `turbo run lint check-types test build --filter=admin --filter=@repo/ui`.

## Acceptance criteria

- Cada lista muestra la barra de búsqueda, sus filtros y la paginación dentro de la tabla.
- La búsqueda ignora mayúsculas y acentos y se combina con los filtros activos.
- Con más filas que el tamaño de página aparecen "Anterior"/"Siguiente", "Página X de Y" y el selector de filas por página.
- Sin resultados se muestra el bloque vacío de siempre, sin tabla ni paginación.
- En mobile (< md) se sigue viendo la lista de tarjetas, paginada junto con la tabla.

## Checks

- `bunx turbo run lint check-types test build --filter=admin --filter=@repo/ui`
- `bunx turbo run lint check-types test build` (monorepo completo)
- SSR de prueba: la tabla renderiza 10 de 12 filas, 2 selects, 1 input de búsqueda y "Mostrando 1–10 de 12".

## Progress

- `DataTable` en `@repo/ui` con la lógica de filtro/paginación extraída en `filterRows` y `paginate`, cubierta por tests (7 casos).
- Las 4 páginas migradas; se conservaron tablas, tarjetas mobile, badges, enlaces y formatos.
- Verificado: `admin` y `@repo/ui` con lint, check-types, test y build en verde; rutas `/catalogo`, `/clinicas`, `/ordenes` y `/usuarios` siguen en `◐` (Partial Prerender) por el guard `isAdmin()`.
- Sin commit todavía: los cambios de navegación sin commitear del usuario (`apps/admin/app/_components/nav-items.ts`, `nav-links.tsx`, `topbar-title.tsx`) no se tocaron.

## Next step

Revisión visual en `/admin` (Catálogo, Clínicas, Órdenes, Usuarios) y decidir si `SearchForm`/`FilterTabs` y los helpers de filtro se borran.
