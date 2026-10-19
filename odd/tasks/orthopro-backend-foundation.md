# orthopro-backend-foundation

Branch: `feat/backend-foundation` · Baseline commits: `f8edb77` (api workspace), `59feee2` (ports)

## Objective
Lay the backend foundation in `apps/api` (NestJS 12, ESM, Bun workspace): PostgreSQL + Redis run locally with Podman, data access with TypeORM, background jobs with BullMQ. No domain entities yet (scope comes later from `cotizacion/COTIZACION_ORTHOPROLAB.pdf`).

## Constraints / decisions
- Podman 6.1.4 rootless; `podman compose` delegates to docker-compose provider. A `compose.yaml` at the repo root, usable with `podman compose`.
- Host ports: Postgres **5432** (user decision; nothing listens on 5432/5433 now, the older chatgraph/objetivolegal containers that map them are stopped, so they must not be started together with this stack) and Redis **6380**, both env-overridable. Bind to 127.0.0.1 only. Note: `objetivolegalapp-db-test-1` (stopped) maps 5434.
- Images: `postgres:17-alpine`, `redis:7-alpine`, named volumes, healthchecks.
- Ports of the apps: web 3000, clientes 3001, admin 3002, api 3003.
- ESM: relative imports in `apps/api` need the `.js` extension. Tests: Vitest (not Jest). Lint: oxlint.
- Versions (npm, 2026-10): `@nestjs/typeorm` 12.0.2, `typeorm` 1.1.2, `pg` 8.x, `@nestjs/bullmq` 12.0.0, `bullmq` 6.x, `@nestjs/config` 12.0.1, `@nestjs/terminus` 12.1.0. Use context7 (`mcp__context7__*`) or the packages' docs for current APIs.
- TypeORM: `synchronize: false` always; schema changes via migrations; a `data-source.ts` for the CLI.
- Secrets never committed: `apps/api/.env` is gitignored; `apps/api/.env.example` documents variables.
- No Co-Authored-By / AI attribution in commits (user rule). Conventional Commits.
- Remote operations: none beyond pulling public container images and npm packages.

## Tasks
- [x] B1 Infra: root `compose.yaml` (postgres + redis, healthchecks, volumes, env-driven host ports 5432/6380), root scripts `infra:up|down|logs`, `apps/api/.env.example` + local `.env`
- [x] B2 Config + TypeORM: `@nestjs/config` with validated env, `TypeOrmModule.forRootAsync`, `data-source.ts`, migration scripts, `/health` (terminus: database)
- [ ] B3 BullMQ: `BullModule.forRootAsync` from config, a generic `QueuesModule` with one `system` queue + processor proving the wiring, Redis check in `/health`
- [ ] B4 Docs + verification: README/CLAUDE.md updates, build/lint/check-types/test, end-to-end proof against the live containers

## Route declaration
Delegated writers: W1 = B1+B2, W2 = B3 (sequential; both touch `app.module.ts`). Parent runs verification and commits. Evidence: ≥2 non-trivial files per task; new dependency APIs unfamiliar (Nest 12 / TypeORM 1.x).

## Test-first policy
Unit tests with Vitest where deterministic (env validation, module wiring with mocks): RED before GREEN. Integration proof (DB/Redis) runs against the containers; exception documented when infra is not up.

## Progress / evidence
(none yet)

B1+B2 (delegated writer W1, route: delegated): `compose.yaml` (postgres:17-alpine on 127.0.0.1:5432, redis:7-alpine with AOF on 127.0.0.1:6380, healthchecks, named volumes, `orthopro-*` containers), root scripts `infra:up|down|logs|ps`, `.env.example` (root) + `apps/api/.env.example`; `@nestjs/config` with `validateEnv` (RED observed: "Cannot find module './env.validation.js'", then GREEN 5/5), `DatabaseModule` (TypeORM forRootAsync, synchronize false, autoLoadEntities), `data-source.ts` + `migration:*` scripts (`bun --env-file=.env node_modules/typeorm/cli.js -d src/database/data-source.ts migration:<x>`), `/health` (terminus database check, extension point for Redis), `enableShutdownHooks`, `turbo.json` `test` task. Rootless podman needs `systemctl --user start podman.socket` once.
Observed by writer against live containers: pg_isready OK, redis PONG, `migration:run` "No migrations are pending", `/health` status ok with database up, `/` Hello World. Parent re-run: `turbo run build lint check-types test --filter=api` 4/4 successful (lint 1 warning, 0 errors; 7/7 tests). Not tested: TypeORM retry with the DB down. Parent cleaned a leftover `turbo run dev` (pids 806066 tree) from an earlier port test; ports 3000-3003/5432/6380 free. `.env` files are ignored (verified).

## Next step
B3
