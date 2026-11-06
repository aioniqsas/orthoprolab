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

## Logs

El portal Admin registra **una línea JSON por evento** en `logs/admin.log` (`apps/admin/lib/logger.ts`). Se escribe con `appendFileSync` antes de responder: si el proceso muere en la línea siguiente, el evento ya está en disco. La terminal recibe el mismo JSON como espejo, no como fuente de verdad.

```json
{"ts":"...","nivel":"warn","ambito":"cuentas-cobro.enviarEmail","ref":"ab12cd34","mensaje":"respuesta-no-ok","datos":{"ruta":"/cuentas-cobro/3/enviar","status":400,"duracionMs":812,"cuerpo":"..."}}
```

- Rotación a los 5 MB, conservando los 5 archivos rotados; `LOG_DIR` mueve el directorio (por ejemplo a un volumen persistente). `logs/` está en `.gitignore`.
- `ref` es el identificador corto que también se muestra al usuario cuando algo falla: sirve para cruzar el mensaje de la pantalla con esta salida (`grep ab12cd34`).
- Las server actions de `cuentas-cobro/[id]` corren bajo `conRegistro()`, que registra inicio, fin, duración y error; una excepción inesperada se convierte en un resultado serializable en lugar de romper la respuesta.
- `pedirApi()` deja el estado HTTP y hasta 500 caracteres del cuerpo cuando la API responde distinto de 2xx.
- `instalarCapturaDeCaidas()` se instala desde `instrumentation.ts`: registra `uncaughtException` y termina el proceso, y registra `unhandledRejection` sin tumbarlo.
- `app/(portal)/error.tsx` captura los fallos que nunca llegan a la acción —el caso «An unexpected response was received from the server», que ocurre cuando `proxy.ts` redirige a `/login` por sesión vencida o cuando la respuesta es HTML— y muestra el `digest` de Next, que es la misma clave que Next imprime en la terminal.
