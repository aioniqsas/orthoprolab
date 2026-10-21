# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Turborepo monorepo (Bun workspaces: `apps/*`, `packages/*`) bootstrapped from `create-turbo`. Requires Node >=24 and Bun 1.4.2. TypeScript throughout.

## Commands

Run from the repo root (Turbo fans out to every workspace):

- `bun run dev` — all dev servers (`turbo run dev`)
- `bun run build` / `bun run lint` / `bun run check-types`
- `bun run format` — Prettier over `**/*.{ts,tsx,md}`
- Single workspace: `bunx turbo run dev --filter=web` (or `cd apps/<name> && bun run dev`)

Infrastructure: `bun run infra:up|down|logs|ps` runs PostgreSQL (5432) and Redis (6380) with `podman compose -f compose.yaml` (rootless Podman needs `systemctl --user start podman.socket` once). Real `.env` files are git-ignored; only `.env.example` is tracked. Only `apps/api` has tests (`bunx turbo run test --filter=api`); the Next apps have none.

## Architecture

Next.js apps plus shared packages:

- `apps/admin` (3002), `apps/clientes` (3001), `apps/web` (3000) — Next.js projects using Tailwind v4 (`@tailwindcss/turbopack`). The two portals use the API cookies (`auth_token`/`refresh_token`), `proxy.ts` gating plus a server-side `/auth/me` check, `@repo/api-client` and `@repo/ui/auth/*`; the admin catalog (`/catalogo`) is backed by the API, while orders, clinics, users and CMS still read sample data from `apps/admin/lib/data/repository.ts`. Details in `docs/portals.md`. They share the theme via `@repo/theme`, have no `check-types` script (Turbo's `check-types` skips them). `apps/web` is the public website and also consumes `@repo/ui`.
- `apps/api` (port 3003) — NestJS 12 ESM API: `ConfigModule` with `validateEnv` (`src/config`), `DatabaseModule` (TypeORM + PostgreSQL, `synchronize: false`, migrations via `bun run migration:*`), `QueuesModule` (BullMQ, `system` queue), `HealthModule` (`GET /health`), `SecurityModule` (helmet, CORS + Origin check, Redis throttler), `AuthModule` (`src/auth`: JWT from the `auth_token` httpOnly cookie, rotating `refresh_token` stored hashed in `sesion_refresco`, Redis login lockout; the JWT guard and `RolesGuard` are global, so routes opt out with `@Public()` and restrict roles with `@Roles()`; new env vars `JWT_SECRET` (required), `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `SESSION_MAX_LIFETIME_DAYS`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_SECONDS`, `REFRESH_REUSE_GRACE_SECONDS`, `COOKIE_SAMESITE`, `CORS_ORIGINS`, `TRUST_PROXY`, `THROTTLE_*`; details in `apps/api/docs/auth.md`). First administrator: `bun run admin:create` in `apps/api` (hidden password prompt or `--password-stdin`, never HTTP). Never read or edit `.env` files or run `keys:generate` unprompted. Schema reference: `apps/api/docs/database-model.md` (ERD, rules) and generated `apps/api/docs/schema.sql` (`bun run db:schema`). Catalog reference (public/admin routes, SSE, Cloudinary, PDF): `apps/api/docs/catalogo.md`. Relative imports need `.js`. Tests are Vitest (`bun run test`, `test:e2e` needs the containers). It has its own `typescript`/`oxlint` setup, not the shared eslint config.
- `packages/theme` (`@repo/theme`) — shared Tailwind v4 tokens in `theme.css`: colors `surface`, `surface-alt`, `body`, `title`, `highlight`, and fonts `font-heading` (Outfit) / `font-sans` (Poppins). Apps import it with `@import "@repo/theme/theme.css";` after `@import "tailwindcss";`. The CSS only references the `--font-outfit` / `--font-poppins` variables, so each app's `layout.tsx` must load both fonts with `next/font/google` using those variable names.
- `packages/ui` (`@repo/ui`) — stub React component library (`button`, `card`, `code` in `src/`); the root `src/*.tsx` stubs (`button`, `card`, `code`) are leftovers from the starter and unused.
- `packages/eslint-config`, `packages/typescript-config` — shared lint/TS configs.

`turbo.json`: `build` depends on `^build` and outputs `.next/**`; `dev` is persistent and uncached.

## Version caveats

The repo's `AGENTS.md` files state that Turborepo and Next.js here differ from training data. Before changing Turbo config/commands, read `docs/README.md` in the installed `turbo` package (resolve with `node -p "require.resolve('turbo/package.json')"` from a workspace). Before writing Next.js code in `apps/admin`, `apps/clientes`, or `apps/web`, read the relevant guide in that app's `node_modules/next/dist/docs/`.
