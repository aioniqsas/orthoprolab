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

There is no test runner configured.

## Architecture

Next.js apps plus shared packages:

- `apps/admin`, `apps/clientes`, `apps/web` — standalone `create-next-app` projects using Tailwind v4 (`@tailwindcss/turbopack`). They share the theme via `@repo/theme`, have no `check-types` script (Turbo's `check-types` skips them).
- `apps/docs` (port 3001) — leftover `create-turbo` starter without Tailwind. It consumes `@repo/ui`, lints with `--max-warnings 0`, and uses `next typegen && tsc --noEmit` for `check-types`.
- `packages/theme` (`@repo/theme`) — shared Tailwind v4 tokens in `theme.css`: colors `surface`, `surface-alt`, `body`, `title`, `highlight`, and fonts `font-heading` (Outfit) / `font-sans` (Poppins). Apps import it with `@import "@repo/theme/theme.css";` after `@import "tailwindcss";`. The CSS only references the `--font-outfit` / `--font-poppins` variables, so each app's `layout.tsx` must load both fonts with `next/font/google` using those variable names.
- `packages/ui` (`@repo/ui`) — stub React component library (`button`, `card`, `code` in `src/`), used only by `docs`.
- `packages/eslint-config`, `packages/typescript-config` — shared lint/TS configs.

`turbo.json`: `build` depends on `^build` and outputs `.next/**`; `dev` is persistent and uncached.

## Version caveats

The repo's `AGENTS.md` files state that Turborepo and Next.js here differ from training data. Before changing Turbo config/commands, read `docs/README.md` in the installed `turbo` package (resolve with `node -p "require.resolve('turbo/package.json')"` from a workspace). Before writing Next.js code in `apps/admin`, `apps/clientes`, or `apps/web`, read the relevant guide in that app's `node_modules/next/dist/docs/`.
