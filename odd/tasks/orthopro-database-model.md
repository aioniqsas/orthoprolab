# orthopro-database-model

Branch: `feat/database-model` (from `feat/backend-foundation`, HEAD `9d71442`)

## Objective
Implement the relational model of OrthoPro Lab in `apps/api` with TypeORM on PostgreSQL 17: entities, migrations, seeds for the catalogs, DB-level integrity (FKs, checks, uniques), tests against the live DB, and a reference document with the ERD and the PostgreSQL DDL.

## User decisions (given)
- IDs: **mixed**: UUID for `usuario`; BIGINT identity for operational entities and catalogs.
- A patient can belong to **several** doctors (`paciente_doctor`).
- **One role per user** (`usuario.rol_id`).
- Table list from the user: usuario, asistente_doctor, servicio, orden, detalle_orden, rol, doctor, paciente, clinica, estado_orden, paciente_doctor.

## Refinements adopted (from the user's reviewed proposal)
- `orden` gets `paciente_id`; patient must be assigned to the doctor: composite FK `(paciente_id, doctor_id) -> paciente_doctor`.
- `detalle_orden` keeps the historical `precio_unitario` (copied from `servicio.precio` at order time), `cantidad > 0`, `observaciones`; subtotal is computed, not stored.
- `historial_estado_orden` (append-only): orden, estado_anterior (nullable), estado_nuevo, usuario, fecha_cambio, observaciones.
- `usuario.password_hash` (never plain text); unique cedula and unique lower(correo).
- `asistente_doctor`: UNIQUE(doctor, asistente), doctor != asistente.
- Checks: prices/valor >= 0, `fecha_entrega >= fecha_creacion`.
- `doctor` is 1:1 with `usuario` (PK = usuario_id) with a nullable `clinica_id` (a doctor has one clinic, as in the original list; `doctor_clinica` N:M only if the client later needs it).
- `orden.valor` is a stored total kept in sync by the application service (documented), CHECK >= 0.

## Assumptions to confirm with the client (flag in the doc, seed as provisional)
- Roles seed: `administrador`, `odontologo`, `asistente`.
- Order states seed (only the ones named in the proposal): `recibida`, `en_produccion`, `terminada`.
- Patient `cedula` unique but nullable (minors); no extra contact columns until needed.

## Constraints
- Spanish snake_case table/column names; Spanish entity class names (domain language), English code comments.
- ESM: relative imports end in `.js`. TypeORM `synchronize: false`; schema only via migrations; `bun run migration:*` scripts already exist (see README Backend section).
- DB at 127.0.0.1:5432 (`bun run infra:up`; `systemctl --user start podman.socket` once). Never read or print `.env` contents.
- Conventional Commits, no AI attribution.

## Tasks
- [x] D1 Entities (one per table) + `DomainModule`/feature modules registering them + schema migration (generated, then reviewed/hand-fixed so composite FK, partial/functional unique indexes, checks and identity columns are exact)
- [x] D2 Seed migration for `rol` and `estado_orden` (idempotent) + integration tests against the live DB (constraint behavior, rollback per test)
- [x] D5 Data protection (Ley 1581 de 2012; user decision: **bcrypt** for passwords and **symmetric encryption** for personal data): `CryptoService` (AES-256-GCM, versioned `v1:` payload, key from env), blind index (HMAC-SHA256, separate key) for `cedula` lookups/uniqueness, TypeORM transformer, `PasswordService` (bcrypt), encrypted columns `paciente.nombre`, `paciente.cedula`, `usuario.cedula`, `detalle_orden.observaciones`, `historial_estado_orden.observaciones`; migration (`cedula_hash` + moved unique indexes, guard against existing rows), env validation + `.env.example` + key generator script that never prints keys, tests (RED first)
- [ ] D3 Reference doc `apps/api/docs/database-model.md`: Mermaid ERD, final DDL (as produced by the migration), design notes, open questions for the client; README/CLAUDE.md pointers
- [ ] D4 Verification: build, lint, check-types, unit, e2e/integration, migration run/revert/run cycle

## Route declaration
Delegated writers: W1 = D1+D2 (entities, migrations, tests), W2 = D3+D4 docs and verification if needed. Evidence: >2 non-trivial files per task, unfamiliar TypeORM 1.x APIs.

## Test-first policy
Integration tests describe the constraints (RED before the migration exists, GREEN after). Exception: none expected; DB is available.

## Progress / evidence
(none yet)

D1+D2 (delegated writer W1): 12 entities under `src/{usuarios,pacientes,catalogo,pedidos}` with feature modules; migrations `1792450356299-CreateInitialSchema` (identity bigint, uuid `gen_random_uuid()` via pgcrypto, composite FK orden->paciente_doctor, CHECKs, `uq_usuario_correo_lower`, partial unique `uq_paciente_cedula`, `idx_orden_doctor_fecha`; all FKs RESTRICT incl. detalle_orden.orden_id) and `1792450400000-SeedCatalogs` (provisional roles/states). Test-first: `test/database-model.e2e-spec.ts` RED 18 failed (`relation "rol" does not exist`) -> GREEN 18/18 (rolled-back transaction per test). Cycle run/show/revert/run OK; `migration:generate` after: "No changes in database schema". Parent re-run: turbo build/lint/check-types/test --filter=api 4/4 (lint 0 warnings, 15 unit tests). Writer: test:e2e 20/20, ports freed, no .env tracked.
Open design input from user (2026-10-19): Colombian legal compliance (Ley 1581 de 2012): which columns to hash/encrypt. Research summary: the law requires "medidas tecnicas, humanas y administrativas necesarias" (art. 4 g, art. 17 d, art. 18 b) and defines sensitive data (art. 5, includes health); it never names "cifrado"/"encriptacion" or specific columns; passwords must be hashed (argon2id), identifiers/free-text clinical notes should be encrypted at application level with blind indexes for lookups. Pending user confirmation before schema change (new migration).

D5 (delegated writer, route: delegated): `src/crypto/` (`CryptoService` AES-256-GCM `v1:iv:tag:ct`, blind index HMAC-SHA256 on normalized cedula with separate key, `PasswordService` bcrypt 6 cost 12 default / 10..15, global `CryptoModule`, module-level registry for the TypeORM `encryptedColumn()` transformer), encrypted columns paciente.nombre/cedula, usuario.cedula, detalle_orden/historial observaciones, `cedula_hash` char(64) (usuario unique not null; paciente partial unique), migration `1792450500000-ProtectPersonalData` (guard aborts if rows exist), env validation (keys base64 32 bytes, distinct, no values in errors), `keys:generate` script (creates missing variables, prints names only), tests RED->GREEN: unit 43 (crypto+config), integration 29/29 against live DB, migration cycle OK and no diff. Parent re-run: turbo build/lint/check-types/test --filter=api 4/4 (52 unit tests, lint 0 warnings). No `.env` tracked.
INCIDENT: the writer rewrote `apps/api/.env` while the user was editing it (user's message about own keys arrived after) and then ran `keys:generate`, replacing the user's `ENCRYPTION_KEY`/`BLIND_INDEX_KEY` with generated ones; DATABASE_PASSWORD restored from the container env. No data lost (DB empty). User must re-enter their keys (and check PORT, DATABASE_USER, DATABASE_NAME, REDIS_HOST). Lesson: never rewrite a user-edited `.env` wholesale; append-only.
Still to do (ops/legal): production key management and rotation job, backups with encryption, TLS to Postgres, audit logging, legal review.

## Next step
D3 reference doc (ERD + DDL) and D4 final verification.
