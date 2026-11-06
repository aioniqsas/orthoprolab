# Portals (admin and clientes)

Two Next.js apps share the auth API (`apps/api`) and the UI packages.

| App | Port | Audience | Routes |
|---|---|---|---|
| `apps/admin` | 3002 | administrators | `/login`, `/ordenes` (+ `/[id]`), `/clinicas` (+ `/[id]`), `/usuarios` (+ `/[id]`), `/catalogo` (+ `/[id]`), `/cms`; `/` redirects to `/ordenes` |
| `apps/clientes` | 3001 | dentists and assistants | `/login`, `/registro`, `/` (placeholder home) |

The API listens on 3003. Copy `apps/<app>/.env.example` to `.env`; the only variable is `NEXT_PUBLIC_API_URL` (default `http://localhost:3003`).

## Shared packages

- `@repo/api-client`: typed fetch client (`auth.register/login/refresh/logout/me`, `request`), error classes, zod schemas that mirror the API rules, `safeRedirectPath`, `toAuthResult`, `resolvePortalAccess`, `fetchSessionOnServer`.
- `@repo/ui`: shadcn components (`@repo/ui/components/*`) and the auth composites (`@repo/ui/auth/*`: `AuthShell`, `LoginForm`, `RegisterForm`, `PortalLogin`, `SilentSession`, `LogoutButton`, `AccessNotice`, `PortalFrame`).
- `@repo/theme`: Tailwind v4 tokens and shadcn variables.

## Session model

The API sets two httpOnly cookies: `auth_token` (JWT, 15 minutes, `Path=/`) and `refresh_token` (7 days sliding, `Path=/auth`). JavaScript never sees tokens.

- Protected pages are gated twice: `proxy.ts` redirects to `/login?next=...` when `auth_token` is missing (a UX gate), and the `(portal)` layout calls `GET /auth/me` on the server with the forwarded cookie (the authoritative check, inside `<Suspense>` because `cacheComponents` is enabled).
- The browser renews sessions: the client retries a 401 once after a single-flight `POST /auth/refresh`. An expired session landing on a protected page goes to `/login`, which tries a silent refresh before showing the form.
- `next` accepts only same-origin relative paths (`safeRedirectPath`).
- Admin portal requires role `administrador`; clientes allows `odontologo` and `asistente`. Other roles see an access notice with logout.
- Login: administrators are created with `bun run admin:create` (see `apps/api/docs/auth.md`); clientes registration creates the role `odontologo` (policy to be revisited with the client).

## Admin screens: catalog and CMS live, the rest on sample data

The catalog (`/catalogo`) is fully backed by the API: list, create, edit, deactivate, delete and image upload, with a live SSE bridge to `apps/web`. The CMS screen (`/cms`) edits the site's fixed copy and hero images: it reads and saves through `GET`/`PUT /admin/contenido`, and `apps/web` fetches `GET /contenido`, expiring that cache on the same SSE bridge. Reference: `apps/api/docs/contenido.md`. Orders, clinics and users read the API through `apps/admin/lib/data/repository.ts` (`SAMPLE_DATA = false`); the sample-data branch remains as an offline fallback. To connect a section, keep the repository signatures and replace the bodies with `api.request(...)` (forward the `auth_token` cookie on the server). Catalog reference: `apps/api/docs/catalogo.md`.

## Órdenes: estados finales y cancelación

`cancelada` y `terminada` están marcadas con `es_final` en la tabla `estado_orden`. Los dos portales ofrecen "Cancelar orden" en el detalle mientras el estado no sea final (`creada`, `recibida`, `en_proceso`, `en_entrega`, `devuelta_correccion`): el diálogo pide observaciones y el cambio queda en `historial_estado_orden`. Editar la orden sigue limitado a `creada`.

Una orden final no se reabre: el API responde 403 al cambiar de estado desde `cancelada` o `terminada`, rechaza `cancelada` como destino de `PATCH /ordenes/:id/estado` (la anulación solo ocurre por `DELETE /ordenes/:id` o `DELETE /mi-clinica/ordenes/:id`, que guardan el motivo) y el detalle del portal Administrador sustituye el formulario de estado por un aviso de estado definitivo. Referencia: `apps/api/docs/database-model.md` (§6, pregunta 4).

En la lista, la columna Estado del Administrador muestra un distintivo en las órdenes finales y un selector solo en las que admiten cambio; el selector no ofrece `cancelada` y revierte al estado real si el API rechaza el cambio.

### Filtros por grupo

Las dos listas filtran por tres grupos definidos en `@repo/api-client` (`GRUPOS_ORDEN` / `grupoDeEstado`): **Activas** (`creada`, `recibida`, `en_proceso`, `en_entrega`, `devuelta_correccion`), **Terminadas** (`terminada`) y **Canceladas** (`cancelada`), más la opción que desactiva el filtro. Ambos portales abren en **Activas**; los contadores por estado del Administrador siguen contando todas las órdenes. El valor inicial se declara con `initialFilterValues` en `DataTable` (`@repo/ui`).

## Cuentas de cobro: tiempo real, grupos y paginación

Las dos listas usan `DataTable` (`@repo/ui`) con **un** filtro agrupado, definido en `@repo/api-client` (`GRUPOS_CUENTA` / `grupoDeCuenta`): **Pendientes** (`borrador`, `emitida`, `pagada_parcial`), **Pagadas** (`pagada`) y **Canceladas** (`anulada`), más la opción sin filtro. Ambos portales abren en **Pendientes**. Un borrador todavía no se emitió y un pago parcial todavía debe dinero, así que los dos son trabajo pendiente. La clínica nunca recibe `borrador`: `GET /mi-clinica/cuentas-cobro` lo excluye. Paginación y búsqueda son de cliente; el endpoint devuelve la lista completa.

Al adjuntar órdenes, `GET /cuentas-cobro/:id/ordenes-disponibles` devuelve solo las que no pertenecen a ninguna cuenta activa —incluida la cuenta abierta—, así que una orden ya adjunta no vuelve a ofrecerse; una cuenta `anulada` sí las libera. El formulario tiene un checkbox para seleccionar todas las órdenes de la clínica de una vez; el valor de cada una se sigue escribiendo a mano porque el total lo decide el administrador.

`CuentasCobroEventosService` avisa cuando una cuenta cambia (creada, actualizada, pago registrado o anulado, PDF, envío) y dos streams SSE protegidos por el guard de sesión lo publican: `GET /cuentas-cobro/eventos` (administrador, con `tipo` y `cuentaId`) y `GET /mi-clinica/cuentas-cobro/eventos` (clínica, solo con `tipo`, para no filtrar ids de otras clínicas). Cada portal expone un puente en `app/api/cuentas-cobro/eventos/route.ts` que reenvía la cookie de sesión y un componente `cuentas-live.tsx` que llama `router.refresh()` al recibir el evento `cuenta-cobro`. Mismo patrón que el catálogo del sitio público, con su misma limitación: el bus es en memoria, así que con varias réplicas del API hace falta Redis pub/sub.

## Known limitations and follow-ups

- Unknown ids render the not-found page with HTTP 200 in the admin app (with `cacheComponents`, the layout's auth gate streams first). The portal is `noindex`.
- Tampered or expired cookies on protected pages redirect through a streamed `NEXT_REDIRECT` (HTTP 200 with a meta refresh), not an HTTP 3xx.
- `/` hops through `/ordenes` before `/login` for anonymous visitors.
- No CSP yet (needs nonces). Security headers are set in `next.config.ts`.
- Production topology: the API cookies are host-scoped. The apps cannot see `auth_token` unless the API sets a `Domain` attribute (for example `.orthoprolab.com`) or a reverse proxy serves API and apps from one origin; the refresh cookie's `Path=/auth` also assumes no path prefix. Add `COOKIE_DOMAIN` support to the API before deploying.
- Registration fields from the Stitch design that the API does not accept (clinic data, professional licence, terms acceptance) are omitted; remember-session is not supported.
- Browser-only behaviour (silent refresh effect, redirect after submit, countdown, mobile sidebar) is covered by unit and SSR tests only; run a manual pass in a browser.
- `packages/api-client` and `packages/ui` use `moduleResolution: Bundler` with extensionless imports because Turbopack does not map `./x.js` to `.ts` in transpiled workspace packages.

## Fechas y zona horaria

La base y los tres procesos Node operan en `America/Bogota`: los scripts `dev`/`start`/`build` de cada app fijan `TZ=America/Bogota`, y la migración `SetDatabaseTimezoneBogota` deja `timezone = 'America/Bogota'` como valor por defecto de sesión. `timestamptz` sigue guardando instantes; el `TimeZone` solo decide qué significa «hoy» para `CURRENT_DATE`, `now()::date`, `date_trunc` y los casts a `date`.

El formato y los días se resuelven con `@repo/api-client` (`src/fechas.ts`): `formatearFecha` / `formatearFechaHora` muestran la zona del negocio, y `hoyNegocio()` / `diaNegocio()` la aplican de forma explícita con `Intl.DateTimeFormat(..., { timeZone })`, sin depender del `TZ` del proceso. Los portales no deben usar `toLocaleDateString` / `toLocaleString` para fechas ni `new Date().toISOString().slice(0, 10)` para «hoy». `orden.fecha_entrega` guarda un día calendario a las 12:00 UTC (07:00 en Bogotá) y su CHECK compara días calendario, no instantes.
