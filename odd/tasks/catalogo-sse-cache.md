# Catálogo en vivo: SSE + invalidación del cache de la web

## Objective

Que el catálogo público se actualice casi de inmediato cuando un administrador agrega, edita o elimina un servicio desde `apps/admin`, sin que el visitante tenga que recargar a mano.

## Problem

El flujo ya existía (bus de eventos en la API → `GET /catalogo/eventos` → puente SSE en la web → `router.refresh()` en el navegador) pero en la práctica la página seguía mostrando datos viejos. Había tres fallas encadenadas:

1. **La invalidación nunca se aplicaba.** `revalidateTag`/`revalidatePath` en un Route Handler solo registran el tag en `store.pendingRevalidatedTags`; las revalidaciones se aplican cuando la respuesta termina. El puente SSE es un stream que nunca termina, así que sus invalidaciones se perdían. El dato se refrescaba solo cuando el cache expiraba por tiempo (`cacheLife("hours")`).
2. **La respuesta de la API se cacheaba dos veces.** El `fetch` dentro de `"use cache"` heredaba el `Cache-Control: public, max-age=60, stale-while-revalidate=300` de la API: una capa de cache con su propia ventana de 5 minutos que sobrevivía a la invalidación por tag (la página quedaba "una mutación atrás").
3. **El cache de la ruta.** `/catalogo` es una página prerenderizada: invalidar el tag de datos no borra el HTML prerenderizado, hay que invalidar también la ruta.

## Scope

- `apps/web/next.config.ts`: perfil de `cacheLife` "catalogo" (revalida cada 10 s).
- `apps/web/lib/api-catalog.ts`: `cacheLife("catalogo")` + `next: { revalidate: 10, tags: ["catalog"] }` en el `fetch` a la API.
- `apps/web/app/api/catalogo/revalidar/route.ts` (nuevo): `POST` que expira el tag y las rutas del catálogo.
- `apps/web/app/api/catalogo/eventos/route.ts`: al recibir un evento llama a `/api/catalogo/revalidar` y reenvía el evento al navegador.

## Out of scope

- Suscripción del servidor web al SSE de la API (una conexión por proceso): hoy la invalidación depende de que haya una pestaña del sitio abierta; sin pestañas, el cache se renueva solo cada 10 s.
- Sortear el cache del cliente (mínimo 30 s de `stale` en el router de Next).
- Suscripción por servicio o diffs: el evento es solo un disparador.

## Constraints

- Sin dependencias nuevas.
- La API no cambia: el bus en memoria y `GET /catalogo/eventos` ya funcionaban (verificado con `curl -N`).
- La API sigue siendo de un solo proceso; con varias réplicas haría falta Redis pub/sub.

## Tasks

- [x] T1 Verificar cada salto por separado: API → SSE, SSE → puente, puente → navegador.
- [x] T2 Confirmar por qué `revalidateTag` no surte efecto dentro de un route handler con stream (`pendingRevalidatedTags`).
- [x] T3 Mover la invalidación a un request propio (`POST /api/catalogo/revalidar`).
- [x] T4 Fijar la vida del cache de datos y del `fetch` (perfil "catalogo", `revalidate: 10`, tag explícito).
- [x] T5 Invalidar también la ruta prerenderizada (`revalidatePath`).
- [x] T6 Verificación end-to-end con navegador real: crear un servicio → la página lo muestra sin recargar.

## Acceptance criteria

- Con una pestaña del catálogo abierta, al crear un servicio en el panel la página lo muestra en menos de 5 s, sin recargar.
- Sin ninguna pestaña abierta, la copia cacheada se renueva sola en menos de 15 s.
- El catálogo público nunca muestra datos con más de una mutación de atraso.

## Checks

- `bunx turbo run lint check-types test build`
- Manual: `curl -N http://localhost:3003/catalogo/eventos` (llega `event: catalogo`), `curl -N http://localhost:3000/api/catalogo/eventos` (reenvía el evento).

## Progress

- Diagnóstico confirmado con un endpoint temporal en la API (crear/borrar servicios) y una ruta temporal de invalidación en la web, ambas ya eliminadas.
- Antes: crear un servicio y esperar 4 s dejaba la web "una mutación atrás" o sin cambios. Ahora la web queda sincronizada con la API y la pestaña del navegador muestra el servicio nuevo.
- Los 21 servicios de prueba quedaron borrados; el catálogo volvió a sus 4 servicios reales.

## Next step

Probar desde el panel: crear un servicio en `/admin/catalogo/nuevo` y mirar `/catalogo` en otra pestaña.
