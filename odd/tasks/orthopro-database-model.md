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
- [ ] D1 Entities (one per table) + `DomainModule`/feature modules registering them + schema migration (generated, then reviewed/hand-fixed so composite FK, partial/functional unique indexes, checks and identity columns are exact)
- [ ] D2 Seed migration for `rol` and `estado_orden` (idempotent) + integration tests against the live DB (constraint behavior, rollback per test)
- [ ] D3 Reference doc `apps/api/docs/database-model.md`: Mermaid ERD, final DDL (as produced by the migration), design notes, open questions for the client; README/CLAUDE.md pointers
- [ ] D4 Verification: build, lint, check-types, unit, e2e/integration, migration run/revert/run cycle

## Route declaration
Delegated writers: W1 = D1+D2 (entities, migrations, tests), W2 = D3+D4 docs and verification if needed. Evidence: >2 non-trivial files per task, unfamiliar TypeORM 1.x APIs.

## Test-first policy
Integration tests describe the constraints (RED before the migration exists, GREEN after). Exception: none expected; DB is available.

## Progress / evidence
(none yet)

## Next step
D1
