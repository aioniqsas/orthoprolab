# Catálogo en tiempo real (SSE)

## Objective

Que las páginas públicas del catálogo reflejen los cambios hechos en `/admin` casi de inmediato: al crear, editar, activar/desactivar, eliminar o cambiar la imagen de un servicio, el visitante ve el catálogo actualizado sin recargar a mano.

## Problem

`apps/web` cachea `fetchServices()` con `cacheTag("catalog")` y `cacheLife("hours")`. Un cambio en el panel de administración no invalida ese cache, así que la web puede servir datos viejos durante horas. Además el navegador no tiene forma de enterarse de que hubo un cambio.

## Scope

- Backend (`apps/api`): bus de eventos en memoria + endpoint público SSE `GET /catalogo/eventos` que emite `event: catalogo` en cada mutación del catálogo.
- Web (`apps/web`): route handler SSE `GET /api/catalogo/eventos` que se suscribe a la API, invalida el tag `catalog` (`revalidateTag`) y reenvía el evento al navegador.
- Web: componente cliente `CatalogLive` montado en `/catalogo` y `/catalogo/[servicio]` que hace `router.refresh()` al recibir el evento.

## Out of scope

- Eventos por servicio o diff de datos: el cliente solo recibe un disparador y vuelve a pedir el RSC.
- Persistencia o reintentos garantizados: los eventos viven en memoria y se pierden si la API se reinicia.
- Multi-instancia de la API: un `Subject` en proceso no cruza réplicas (haría falta Redis pub/sub).

## Constraints

- Sin dependencias nuevas (rxjs ya viene con Nest).
- El endpoint sigue siendo público y solo expone `{ tipo }`.
- La invalidación de Next debe ser inmediata: `revalidateTag("catalog", { expire: 0 })`.

## Tasks

- [x] T1 API: `CatalogoEventosService` (`Subject`) + provider en `CatalogoModule`.
- [x] T2 API: endpoint `@Sse() GET /catalogo/eventos` con heartbeat cada 25 s.
- [x] T3 API: emitir en `create`, `update`, `remove` y `setImage`.
- [x] T4 API: test unitario de la emisión; `test`/`lint`/`check-types` en verde.
- [x] T5 Web: route handler `/api/catalogo/eventos` con `revalidateTag` y stream propio.
- [x] T6 Web: `CatalogLive` montado en las dos páginas del catálogo.
- [x] T7 Verificación: `turbo run lint check-types build --filter=web` y build de `api`.

## Acceptance criteria

- Con la API y la web corriendo, crear un servicio en el panel hace que `/catalogo` lo muestre en segundos, sin recargar.
- Desactivar o eliminar un servicio lo saca de la grilla en el siguiente evento.
- Si la API se cae, la web sigue sirviendo el último catálogo cacheado y el `EventSource` reintenta solo.

## Checks

- `bunx turbo run lint check-types test --filter=api`
- `bunx turbo run lint check-types build --filter=web`
- Manual: `EventSource` en devtools recibe `event: catalogo` al guardar un servicio.

## Progress

- API: bus en memoria, SSE público con heartbeat y emisión en las cuatro mutaciones.
- Web: proxy SSE que expira `catalog` con `revalidateTag(..., { expire: 0 })` y reenvía `event: catalogo`; `CatalogLive` hace `router.refresh()`.
- Verificado: `api` lint/check-types/test (279 tests), `web` lint/build (ruta `/api/catalogo/eventos` marcada dinámica).
- Pendiente de prueba manual con la API y la web levantadas: la prueba e2e del stream requiere Postgres y Redis.
- `odd/tasks/orthopro-catalogo.md` (K5) debe documentar `GET /catalogo/eventos`.

## Next step

Probar end-to-end con el stack levantado; luego K5.
