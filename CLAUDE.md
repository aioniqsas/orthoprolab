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

- `apps/admin`, `apps/clientes`, `apps/web` — standalone `create-next-app` projects using Tailwind v4 (`@tailwindcss/turbopack`). They share the theme via `@repo/theme`, have no `check-types` script (Turbo's `check-types` skips them). `apps/web` is the public website and also consumes `@repo/ui`.
- `apps/api` (port 3003) — NestJS 12 ESM API: `ConfigModule` with `validateEnv` (`src/config`), `DatabaseModule` (TypeORM + PostgreSQL, `synchronize: false`, migrations via `bun run migration:*`), `QueuesModule` (BullMQ, `system` queue), `HealthModule` (`GET /health`). Relative imports need `.js`. Tests are Vitest (`bun run test`, `test:e2e` needs the containers). It has its own `typescript`/`oxlint` setup, not the shared eslint config.
- `packages/theme` (`@repo/theme`) — shared Tailwind v4 tokens in `theme.css`: colors `surface`, `surface-alt`, `body`, `title`, `highlight`, and fonts `font-heading` (Outfit) / `font-sans` (Poppins). Apps import it with `@import "@repo/theme/theme.css";` after `@import "tailwindcss";`. The CSS only references the `--font-outfit` / `--font-poppins` variables, so each app's `layout.tsx` must load both fonts with `next/font/google` using those variable names.
- `packages/ui` (`@repo/ui`) — stub React component library (`button`, `card`, `code` in `src/`); the root `src/*.tsx` stubs (`button`, `card`, `code`) are leftovers from the starter and unused.
- `packages/eslint-config`, `packages/typescript-config` — shared lint/TS configs.

`turbo.json`: `build` depends on `^build` and outputs `.next/**`; `dev` is persistent and uncached.

## Version caveats

The repo's `AGENTS.md` files state that Turborepo and Next.js here differ from training data. Before changing Turbo config/commands, read `docs/README.md` in the installed `turbo` package (resolve with `node -p "require.resolve('turbo/package.json')"` from a workspace). Before writing Next.js code in `apps/admin`, `apps/clientes`, or `apps/web`, read the relevant guide in that app's `node_modules/next/dist/docs/`.
