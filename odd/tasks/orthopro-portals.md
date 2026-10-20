# orthopro-portals

Branch: `feat/portals` (from `main` at `65ae428`)

## Objective
Frontends of the two portals: `apps/admin` (administrators, port 3002) and `apps/clientes` (dentists/clinics, port 3001), built from the Stitch project `15000302671765893488`, integrated with the NestJS auth API (`http://localhost:3003`) and sharing UI/logic through the monorepo.

## Stitch screens found (2026-10-19)
- Public auth: "Iniciar Sesion - OrthoPro Lab" (3 versions: 0ffc4b50..., be373805..., 6234883c...), "Registro de Clinicas y Odontologos - OrthoPro Lab" (3 versions: 45f22048..., 23e397a8..., 9674ecc9...).
- Admin portal: "Gestion de Ordenes de Laboratorio", "CMS y Gestion Web", "Usuarios y Permisos", "Directorio y CRUD de Clinicas", "Gestion de Catalogo & Aranceles" (all "- OrthoPro Admin").
- No dedicated dashboard screens for the clientes portal exist in Stitch.

## User instructions (given)
- Login: REMOVE the "homologacion alta y profesional" block and the text under it from the Stitch template.
- Both portals; login and registration screens plus the admin screens.

## Decisions / defaults chosen by the parent
- Admin portal: login only (administrators are created with `bun run admin:create`; no public registration). Clientes portal: login + registration (registration creates role `odontologo`, per the backend decision to revisit with the client).
- Backend today only has auth (`/auth/register|login|refresh|logout|me`). Admin screens for orders, clinics, users/permissions, catalog/tariffs and CMS have NO backend yet: build them as UI over a typed data layer with clearly marked sample data (so swapping to real endpoints later is local), NOT as fake network calls. Registration fields of the Stitch design that the API does not accept (clinic data, etc.) are omitted from the form and listed as backend follow-ups.
- Cookies are httpOnly (`auth_token` Path=/, `refresh_token` Path=/auth), so JS never sees tokens. The browser calls the API directly (`NEXT_PUBLIC_API_URL`, default `http://localhost:3003`) with `credentials: "include"`; CORS allow-list already covers 3000-3002. Cookies are host-scoped (not port-scoped) so the Next apps on localhost receive `auth_token`; the refresh cookie is only sent to `/auth/*`, therefore token renewal is done by the BROWSER (single-flight `POST /auth/refresh` then retry once), and an expired session landing on a protected page is redirected to `/login?next=...` where a silent refresh is attempted before showing the form.
- Route gating: Next (v16: read `node_modules/next/dist/docs/` for `proxy.ts`/middleware naming) gates on the presence of `auth_token`; the authoritative check is a server-side call to `GET /auth/me` in the protected layout (forwarding cookies). Admin portal additionally requires role `administrador` (others see a "sin permisos" screen with logout). `next` redirect parameter accepts only same-origin relative paths (open-redirect prevention).
- Production topology (open item, document it): cookies set by `api.<domain>` are not visible to the Next apps unless the API sets a `Domain` attribute or a reverse proxy puts API and apps on one origin; also `Path=/auth` assumes the API is not behind a path prefix.
- Shared code: `packages/api-client` (`@repo/api-client`, typed fetch client + zod schemas mirroring the API rules), shadcn components and auth composites in `packages/ui`.
- Design: Stitch is the visual spec; brand tokens from `@repo/theme` (surface/raised/title/highlight, Outfit + Poppins); one radius scale; Spanish copy; no invented claims or numbers.
- Hard rule for writers: never read/print/edit any `.env*` file under `apps/*`, `packages/*` or the root (only `.env.example`); never run `keys:generate`. The Next apps get `.env.example` with `NEXT_PUBLIC_API_URL`.
- No browser is available to the agents: verification is build/lint/types/unit tests plus HTTP-level smoke checks (SSR status codes, redirects, cookie flows with curl against the real API, CORS preflight).

## Tasks
- [x] P0 Shared foundations: `@repo/api-client` (client, errors, single-flight refresh, schemas, unit tests), shadcn `input`/`label`/`alert`/... in `packages/ui`, auth composites (`AuthShell`, `LoginForm`, `RegisterForm`) from the Stitch screens with the login edits applied
- [x] P1 Portal auth wiring: `apps/admin` (login, gating, role check, logout, minimal home) and `apps/clientes` (login, registro, gating, logout, minimal home), silent refresh, safe `next`, `.env.example`, smoke tests against the live API
- [ ] P2a done / P2b pending: P2 Admin shell + screens over a sample-data layer: layout (sidebar/topbar) and Ordenes, Clinicas, Usuarios y permisos, Catalogo y aranceles, CMS web
- [ ] P3 Docs + verification: `docs/portals.md`, README/CLAUDE.md, full checks

## Route declaration
Sequential delegated writers: W1 = P0, W2 = P1, W3.. = P2 (split per screen group if large), parent = P3. Evidence: several non-trivial files per task, new Next 16 APIs.

## Progress / evidence
(none yet)

P0 (delegated writer W1): `packages/api-client` (`createApiClient`, `auth.*`, `request` with single-flight refresh + one retry, `ApiError`/`UnauthorizedError`/`RateLimitedError`, `fetchSessionOnServer`, zod 4 schemas `loginSchema`/`registerSchema`/`registerFormSchema`/`toRegisterPayload`), shadcn `input`/`label`/`alert`, `@repo/ui/auth/*` (`AuthShell`, `LoginForm`, `RegisterForm`, `FormField`, `PasswordField`, `AuthResult` type with kinds credentials|validation|rate-limited|unavailable|network). Evidence: api-client RED (2 files failed, modules missing) -> GREEN 48/48; `@repo/ui` renderToString tests 7/7; parent re-run `turbo build lint check-types test` 16/16 (lint 0 warnings), no `.env` tracked. Stitch choices: login = version `6234883c` (the only one whose text contains "Aun no homologo su escaner intraoral? / Solicitar homologacion clinica", verified by the parent by downloading all 3 versions), removed that block AND the compliance badge row under it (ANMAT/ISO/STL), plus invented telemetry tiles and the "remember session" checkbox (no API support); registration = `23e397a8` (live password rules). Registration fields omitted (backend follow-ups): clinic/practice data, professional licence, terms acceptance, password complexity rules, remember-session. Not verified: DOM behaviour (countdown, aria-busy) only SSR-rendered; no browser available.

P1 (delegated writer W2): `packages/api-client` gains `safeRedirectPath`, `toAuthResult`, `resolvePortalAccess`; `@repo/ui/auth` gains `SilentSession`, `LogoutButton`, `PortalLogin`, `AccessNotice`, `PortalFrame`; `apps/admin` (`/login`, protected `(portal)` group, role `administrador`) and `apps/clientes` (`/login`, `/registro`, protected `(portal)`, roles `odontologo`/`asistente`), `proxy.ts` gating on `auth_token` (307 to `/login?next=`), server-side `/auth/me` check inside Suspense (cacheComponents is enabled in both apps), security headers, `robots: noindex`. Evidence: api-client RED (3 files failed) -> GREEN 89 tests; ui 10 tests; parent re-run `turbo build lint check-types test` 16/16 (lint 0 warnings); smoke with curl against a real stack on 3101-3103 (login/registro 200, redirects, CORS preflight, SSR with admin/doctor cookies, forbidden screens, API-down screen, tampered cookie streams a NEXT_REDIRECT + meta refresh with HTTP 200). Commit df4c6dd. Deviations to review: `tsconfig.json` of `packages/api-client` and `packages/ui` set to `module ESNext` / `moduleResolution Bundler` with extensionless imports (Turbopack could not resolve `./x.js` to `.ts`). Unverified: browser-only behaviour (silent refresh effect, redirect after submit, countdown). Real routes today: admin `/login`, `/`; clientes `/login`, `/registro`, `/`.

P2a (delegated writer W3): admin shell (`apps/admin/app/_components/*`: sidebar/topbar, mobile Sheet nav, `aria-current`), routes `/ordenes` (filters `?estado=`, `?urgente=1`, `?q=`; detail `/ordenes/[id]` with history, line items, total), `/clinicas` (+ `/clinicas/[id]`), placeholders `/usuarios`, `/catalogo`, `/cms` ("Proximamente"), `/` redirects to `/ordenes` (config redirect). Sample data layer `apps/admin/lib/data/` (`SAMPLE_DATA = true`, `listOrdenes/getOrden/listClinicas/getClinica`, integer-cent money helpers; swap = replace bodies with `api.request(...)`), visible "Datos de ejemplo" notice, write actions disabled with explanation. Evidence: helpers RED (no tests, module missing) -> GREEN 12/12; parent re-run `turbo build lint check-types test` 18/18 (lint 0 warnings); smoke on 3102/3103 (redirects, filters, detail, placeholders, doctor-role "Sin permisos", cleanup done). Decision (parent): unknown ids return HTTP 200 with the not-found body + noindex because `cacheComponents` streams the layout gate first; accepted for the noindex admin portal. Unauthenticated `/` hops `/ordenes` then `/login`. Unverified: browser behaviour and visual fidelity (compared by eye).

## Next step
P2b: Usuarios y permisos, Catalogo y aranceles, CMS (sample data), then P3.
