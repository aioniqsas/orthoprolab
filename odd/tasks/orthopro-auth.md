# orthopro-auth

Branch: `feat/auth` (from `feat/database-model`, HEAD `d6d9758`)

## Objective
Login and registration for `apps/api` (NestJS 12 ESM) done securely: JWT via Passport in an httpOnly SameSite cookie, account lockout, no user enumeration, password length rules, per-endpoint rate limiting, hardened headers, strict payload validation. First administrator is created with a CLI script, never over HTTP.

## User decisions (given)
- JWT with Passport; cookies `httpOnly` + `sameSite`.
- Max **3 failed attempts**, then a **5 minute cooldown**.
- Email must be unique, but responses must NEVER reveal whether an email is registered.
- Password: **min 12, max 200** characters.
- **Rate limiting on every endpoint**; protection against malicious headers (helmet); payload validation with `class-validator` + `class-transformer`.
- First user: an **administrator**, created to test.
- Registration: **public for now** (user decision: revisit with the client because doctors belong to a clinic); public sign-ups get a fixed role (`odontologo`) defined in ONE constant (`PUBLIC_REGISTRATION_ROLE`) and also create the `doctor` profile with `clinica_id = NULL`. Nobody can choose a role through the payload. Admin-managed creation of other users is out of scope for now.

## Design defaults chosen by the parent (reasoned; change on request)
- **Token**: single access JWT (HS256, `JWT_SECRET` base64 >= 32 bytes, `JWT_EXPIRES_IN` default `1h`), claims `sub` (usuario id), `rol`; read from the cookie ONLY (never from `Authorization`). Cookie `access_token`: httpOnly, `SameSite=Strict` (env `COOKIE_SAMESITE` strict|lax), `Secure` when `NODE_ENV=production`, path `/`, maxAge = token ttl. Logout clears it (stateless; refresh tokens and server-side revocation are a follow-up).
- **bcrypt 72-byte limit** vs max 200 chars: `PasswordService` pre-hashes with SHA-256 (base64, 44 chars) before bcrypt so every character counts and nothing is truncated or rejected; update its spec (previous behaviour: reject > 72 bytes).
- **Lockout**: Redis counters keyed by normalized email (not by existence of the account, so unknown emails behave identically); 3rd failed attempt starts a 5 minute cooldown (`429` + `Retry-After`), correct password during cooldown is still rejected, counter resets on success. Accounts locked by an attacker are a known trade-off: also throttle per IP.
- **Generic errors**: login failure (unknown email, wrong password, inactive user) -> same `401` body and a dummy bcrypt comparison to equalize timing. Register -> same `202` generic body whether the email or cedula already exists or not; bcrypt hash is computed in both paths; unique-violation races are swallowed.
- **Throttling**: `@nestjs/throttler` global guard (default per IP) with Redis storage, stricter `@Throttle` on login/register; every route covered (health included, generous). `TRUST_PROXY` configurable.
- **Headers/CORS**: helmet (strict API CSP, `frame-ancestors 'none'`, HSTS in production), `x-powered-by` off, CORS allow-list `CORS_ORIGINS` with credentials, an Origin check for unsafe methods (defense in depth with SameSite), JSON body limit 10kb, no urlencoded bodies.
- **Validation**: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), DTOs with trimmed/lower-cased email; cedula digits only; names with length limits.
- **Hard rule for writers**: NEVER read, print, edit or regenerate any `.env` file or run `keys:generate`; the user manages them. New required variables (`JWT_SECRET`) must be documented in `.env.example` and tests must provide test-only values in-process. Report variable NAMES only.

## Tasks
- [ ] A1 Security baseline: deps (`helmet`, `cookie-parser`, `class-validator`, `class-transformer`, `@nestjs/throttler` + Redis storage), `main.ts` bootstrap hardening, global validation pipe, throttler guard with Redis storage, CORS + Origin guard, env validation additions, `PasswordService` SHA-256 pre-hash (spec updated), unit/e2e tests (RED first)
- [ ] A2 Auth module: `passport`, `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt` (cookie extractor); `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`; `RolesGuard` + `@Roles()`; lockout service on Redis; `admin:create` CLI (interactive hidden password prompt) creating the first administrator; e2e tests (RED first)
- [ ] A3 Docs + verification: `apps/api/docs/auth.md` (flows, cookie/JWT settings, lockout, rate limits, env vars, threat notes, follow-ups), README/CLAUDE.md pointers, full verification

## Route declaration
Sequential delegated writers: W1 = A1, W2 = A2, W3/parent = A3 (both writers touch `app.module.ts`/`main.ts`). Evidence: >2 non-trivial files per task, unfamiliar Nest 12 / Passport / throttler APIs.

## Test-first policy
Unit specs for pure logic; integration/e2e with supertest against the live Postgres + Redis. RED observed before GREEN for each task.

## Follow-ups (not in scope)
Refresh tokens and revocation, email verification/password reset (needs a mail provider), common-password / breached-password check, admin endpoint to create users, audit log table, MFA for administrators, decide registration policy with the client.

## Progress / evidence
(none yet)

## Next step
A1
