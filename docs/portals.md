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

## Admin screens: catalog live, the rest on sample data

The catalog (`/catalogo`) is fully backed by the API: list, create, edit, deactivate, delete and image upload, with a live SSE bridge to `apps/web`. Orders, clinics, users and CMS have no endpoints yet: those screens read `apps/admin/lib/data/repository.ts` (`SAMPLE_DATA = true`) and show a visible "Datos de ejemplo" notice. Write actions are rendered disabled with an explanation; nothing simulates a write. To connect a section, keep the repository signatures, replace the bodies with `api.request(...)` (forward the `auth_token` cookie on the server) and flip `SAMPLE_DATA`. Catalog reference: `apps/api/docs/catalogo.md`.

## Known limitations and follow-ups

- Unknown ids render the not-found page with HTTP 200 in the admin app (with `cacheComponents`, the layout's auth gate streams first). The portal is `noindex`.
- Tampered or expired cookies on protected pages redirect through a streamed `NEXT_REDIRECT` (HTTP 200 with a meta refresh), not an HTTP 3xx.
- `/` hops through `/ordenes` before `/login` for anonymous visitors.
- No CSP yet (needs nonces). Security headers are set in `next.config.ts`.
- Production topology: the API cookies are host-scoped. The apps cannot see `auth_token` unless the API sets a `Domain` attribute (for example `.orthoprolab.com`) or a reverse proxy serves API and apps from one origin; the refresh cookie's `Path=/auth` also assumes no path prefix. Add `COOKIE_DOMAIN` support to the API before deploying.
- Registration fields from the Stitch design that the API does not accept (clinic data, professional licence, terms acceptance) are omitted; remember-session is not supported.
- Browser-only behaviour (silent refresh effect, redirect after submit, countdown, mobile sidebar) is covered by unit and SSR tests only; run a manual pass in a browser.
- `packages/api-client` and `packages/ui` use `moduleResolution: Bundler` with extensionless imports because Turbopack does not map `./x.js` to `.ts` in transpiled workspace packages.
