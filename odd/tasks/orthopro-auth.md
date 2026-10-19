# orthopro-auth

Branch: `feat/auth` (from `feat/database-model`, HEAD `d6d9758`)

## Objective
Login and registration for `apps/api` (NestJS 12 ESM) done securely: JWT via Passport in an httpOnly SameSite cookie, account lockout, no user enumeration, password length rules, per-endpoint rate limiting, hardened headers, strict payload validation. First administrator is created with a CLI script, never over HTTP.

## User decisions (given)
- JWT with Passport; **two cookies**, both `httpOnly` + `sameSite`: `auth_token` (JWT, **15 minutes**) and `refresh_token` (**7 days**, sliding: it is renewed every time it is used).
- Max **3 failed attempts**, then a **5 minute cooldown**.
- Email and cedula must be unique. On registration the service **checks before inserting**; if either already exists it returns a **generic server-failure style error asking to retry** (user decision) instead of saying the email/cedula is registered. Caveat documented: a success-vs-failure difference still lets an attacker infer existence; mitigated by tight rate limits and identical work/timing in both paths; revisit when email verification exists (then both paths can return the same 202).
- Password: **min 12, max 200** characters.
- **Rate limiting on every endpoint**; protection against malicious headers (helmet); payload validation with `class-validator` + `class-transformer`.
- First user: an **administrator**, created to test.
- Registration: **public for now** (user decision: revisit with the client because doctors belong to a clinic); public sign-ups get a fixed role (`odontologo`) defined in ONE constant (`PUBLIC_REGISTRATION_ROLE`) and also create the `doctor` profile with `clinica_id = NULL`. Nobody can choose a role through the payload. Admin-managed creation of other users is out of scope for now.

## Design defaults chosen by the parent (reasoned; change on request)
- **Tokens (user decision)**: `auth_token` = access JWT (HS256, `JWT_SECRET` base64 >= 32 bytes, 15 minutes, claims `sub`, `rol`, `sid`), read from the cookie ONLY (never from `Authorization`). `refresh_token` = opaque random value (32 bytes, base64url), stored only as a SHA-256 hash in a new table `sesion_refresco`. Cookies: httpOnly, `SameSite=Strict` (env `COOKIE_SAMESITE` strict|lax), `Secure` when `NODE_ENV=production`; `auth_token` path `/`, `refresh_token` path `/auth` (sent only to the auth routes). `POST /auth/refresh` validates the refresh cookie, **rotates** it (new refresh token + new auth token, new 7 day expiry = sliding window) and revokes the previous one; **reuse detection**: presenting an already-rotated/revoked refresh token revokes the whole session family and returns 401. Absolute cap on a session family (default 30 days, env `SESSION_MAX_LIFETIME_DAYS`) so a stolen-but-active family cannot live forever. Logout revokes the family and clears both cookies. An expired/invalid `auth_token` returns 401; the client calls `/auth/refresh` (frontend interceptor later).
- **New table `sesion_refresco`** (migration + entity, BIGINT identity): `id`, `usuario_id` UUID FK -> usuario (RESTRICT), `familia_id` UUID NOT NULL, `token_hash` char(64) UNIQUE NOT NULL, `expira_en` timestamptz, `revocada_en` timestamptz NULL, `reemplazada_por_id` BIGINT NULL, `creada_en` timestamptz default now(), `ultimo_uso_en`; indexes on `usuario_id`, `familia_id`, `expira_en`. No IP or user-agent stored (personal data minimization). Cleanup of expired rows via a BullMQ repeatable job is a follow-up. Update `docs/database-model.md` and regenerate `docs/schema.sql` when the table exists.
- **bcrypt 72-byte limit** vs max 200 chars: `PasswordService` pre-hashes with SHA-256 (base64, 44 chars) before bcrypt so every character counts and nothing is truncated or rejected; update its spec (previous behaviour: reject > 72 bytes).
- **Lockout**: Redis counters keyed by normalized email (not by existence of the account, so unknown emails behave identically); 3rd failed attempt starts a 5 minute cooldown (`429` + `Retry-After`), correct password during cooldown is still rejected, counter resets on success. Accounts locked by an attacker are a known trade-off: also throttle per IP.
- **Generic errors**: login failure (unknown email, wrong password, inactive user) -> same `401` body and a dummy bcrypt comparison to equalize timing. **Register** (user decision): validation first (`400`), then password hashing ALWAYS (same cost in every path), then the explicit existence check on `lower(correo)` and `cedula_hash`; if either exists -> `503 Service Unavailable` with the generic body "No pudimos completar el registro en este momento. Intentalo de nuevo mas tarde." (same body for genuine server errors and for unique-violation races); success -> `201` with a neutral body and the two cookies are NOT set (the user logs in afterwards). Unique constraints stay as the safety net. Residual risk (success vs 503) documented in `docs/auth.md`.
- **Throttling**: `@nestjs/throttler` global guard (default per IP) with Redis storage, stricter `@Throttle` on login/register; every route covered (health included, generous). `TRUST_PROXY` configurable.
- **Headers/CORS**: helmet (strict API CSP, `frame-ancestors 'none'`, HSTS in production), `x-powered-by` off, CORS allow-list `CORS_ORIGINS` with credentials, an Origin check for unsafe methods (defense in depth with SameSite), JSON body limit 10kb, no urlencoded bodies.
- **Validation**: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), DTOs with trimmed/lower-cased email; cedula digits only; names with length limits.
- **Hard rule for writers**: NEVER read, print, edit or regenerate any `.env` file or run `keys:generate`; the user manages them. New required variables (`JWT_SECRET`) must be documented in `.env.example` and tests must provide test-only values in-process. Report variable NAMES only.

## Tasks
- [ ] A1 Security baseline: deps (`helmet`, `cookie-parser`, `class-validator`, `class-transformer`, `@nestjs/throttler` + Redis storage), `main.ts` bootstrap hardening, global validation pipe, throttler guard with Redis storage, CORS + Origin guard, env validation additions, `PasswordService` SHA-256 pre-hash (spec updated), unit/e2e tests (RED first)
- [ ] A2 Sessions + auth module: migration/entity `sesion_refresco`; `passport`, `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt` (cookie extractor); `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` (rotation + reuse detection), `POST /auth/logout`, `GET /auth/me`; `RolesGuard` + `@Roles()`; lockout service on Redis (3 failures -> 5 min); e2e tests (RED first)
- [ ] A2b `admin:create` CLI (interactive hidden password prompt, never HTTP) creating the first administrator; session cleanup is a follow-up
- [ ] A3 Docs + verification: `apps/api/docs/auth.md` (flows, cookie/JWT settings, lockout, rate limits, env vars, threat notes, follow-ups), README/CLAUDE.md pointers, full verification

## Route declaration
Sequential delegated writers: W1 = A1, W2 = A2, W3 = A2b+A3 (both writers touch `app.module.ts`/`main.ts`). Evidence: >2 non-trivial files per task, unfamiliar Nest 12 / Passport / throttler APIs.

## Test-first policy
Unit specs for pure logic; integration/e2e with supertest against the live Postgres + Redis. RED observed before GREEN for each task.

## Follow-ups (not in scope)
Cleanup job for expired refresh sessions (BullMQ), email verification/password reset (needs a mail provider), common-password / breached-password check, admin endpoint to create users, audit log table, MFA for administrators, decide registration policy with the client.

## Progress / evidence
(none yet)

## Next step
A1
