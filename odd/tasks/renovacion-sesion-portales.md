# Renovación de sesión en portales (admin + clientes)

**Objetivo**: que la sesión se renueve del lado del servidor para que los usuarios
de los portales no tengan que volver a iniciar sesión cada 15 minutos.

**Problema**: el access token vive 15 min (`ACCESS_TOKEN_TTL_SECONDS=900`) y el
refresh token 7 días deslizantes, pero el gate de los portales sólo valida la
presencia de `auth_token` (`proxy.ts`) y luego llama `/auth/me` con ese token.
El refresh sólo se dispara desde el cliente (`client.ts`), así que la primera
navegación server-side después de 15 min cae en `/login` aunque el refresh
token siga vivo.

**Causa raíz adicional**: la cookie `refresh_token` está scopeada a `path=/auth`
(`apps/api/src/auth/cookies.ts:36`). Un request a `/ordenes` no la transporta,
por lo que ni el proxy ni los server components pueden renovar. También rompe el
refresh del cliente en admin, que pega a `/api-proxy/auth/refresh`.

**Why no NextAuth**: Auth.js agregaría una segunda capa de sesión, un `AUTH_SECRET`
por app y obligaría a replicar la rotación de tokens que ya funciona en
`apps/api` (rotación + grace + cap absoluto). El bug es de renovación, no de
framework. Decisión del usuario tras revisar el diagnóstico.

**Fuera de scope**: OAuth/social login, MFA, cambios de TTL (`ACCESS_TOKEN_TTL_SECONDS`,
`REFRESH_TOKEN_TTL_DAYS`, `SESSION_MAX_LIFETIME_DAYS`).

## Authorized scope

- `apps/api/src/auth/cookies.ts`
- `apps/api/src/auth/cookies.spec.ts`
- `packages/api-client/src/session-refresh.ts` (nuevo)
- `packages/api-client/src/session-refresh.spec.ts` (nuevo)
- `packages/api-client/src/index.ts`
- `apps/admin/proxy.ts`
- `apps/clientes/proxy.ts`

## Constraints

- Proxy corre en runtime Node por defecto (Next 16, `proxy.ts`); sin `runtime` config.
- Proxy es sólo gate optimista: la verificación autoritativa sigue siendo `/auth/me`.
- El refresh token nunca se expone al cliente JS (`httpOnly`).
- Se reenvían los `Set-Cookie` del API tal cual, para no duplicar atributos.
- `NextResponse.next({ request: { headers } })` para propagar la cookie renovada.

## Tasks

- [x] T1 — API: ampliar la cookie `refresh_token` a `path=/` (set y clear) y actualizar spec.
- [x] T2 — api-client: helper `isJwtExpired` + `renewSessionOnce` (single-flight) + tests.
- [x] T3 — admin: `proxy.ts` renueva cuando el access token expiró y propaga cookies.
- [x] T4 — clientes: mismo cambio en `proxy.ts`.
- [x] T5 — Verificación: `vitest` (api-client, api), `check-types` y `lint` de los tres paquetes.

## Acceptance criteria

- Con `refresh_token` válido y `auth_token` expirado, una navegación a `/ordenes`
  renueva la sesión y renderiza el portal (no redirige a `/login`).
- Con ambos tokens inválidos/ausentes, redirige a `/login?next=...` como hoy.
- El refresh del cliente en admin (`/api-proxy/auth/refresh`) recibe la cookie.
- Sin dependencias nuevas.

## Progress

- 2026-10-30 — implementado el flujo completo.
- `apps/api/src/auth/cookies.ts`: `refresh_token` ahora en `path=/` y se limpia la
  cookie legacy de `path=/auth` en cada escritura y en `clearAll` (evita reuso
  detectado durante la migración).
- `packages/api-client/src/session-refresh.ts`: `isJwtExpired` (skew 30s) y
  `renewSessionOnce` (single-flight por refresh token, timeout 5s, nunca lanza).
- `apps/{admin,clientes}/proxy.ts`: renueva cuando el access token expiró y
  propaga cookies nuevas al request (`cookie` header) y al response (Set-Cookie
  del API tal cual).
- Sin dependencias nuevas. NextAuth descartado con el usuario.

## Verification

- `packages/api-client`: `vitest` 98 passed, `tsc --noEmit` OK, `eslint` OK.
- `apps/api`: `vitest src/auth` 80 passed (5 en `cookies.spec.ts`), `tsc` OK, oxlint sin errores.
- `apps/admin`: `tsc --noEmit` OK, eslint del archivo tocado OK.
- `apps/clientes`: `tsc --noEmit` OK, eslint del archivo tocado OK.
- No verificado en runtime: el flujo real de expiración de 15 min requiere dejar
  correr el access token; queda como prueba manual.
- Nota: `apps/admin` tiene errores de eslint preexistentes en
  `lib/data/types.ts` y otros archivos ajenos a este cambio.
