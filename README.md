# OrthoPro Lab

Monorepo for OrthoPro Lab, a dental (orthodontic and prosthetic) laboratory in Medellín, Colombia. The public website lives in `apps/web`.

Turborepo with Bun workspaces. Requires Node >= 24 and Bun 1.4.2.

## Apps and packages

| Path | What it is |
|---|---|
| `apps/web` | Public marketing site (Next.js, Tailwind v4, shadcn/ui). Pages: landing, nosotros, catálogo (one route per service), pagos. |
| `apps/admin` | Admin portal (Next.js): login, orders, clinics, users, catalog, CMS. Runs on sample data, see `docs/portals.md`. |
| `apps/api` | NestJS backend API (port 3003). |
| `apps/clientes` | Client portal (Next.js): login and registration, placeholder home. See `docs/portals.md`. |
| `packages/api-client` | `@repo/api-client`: typed client for the API (auth, refresh, schemas). |
| `packages/theme` | `@repo/theme`: shared Tailwind v4 tokens and the shadcn semantic variables (`theme.css`). |
| `packages/ui` | `@repo/ui`: shadcn/ui components shared across apps (`@repo/ui/components/*`, `@repo/ui/lib/utils`). |
| `packages/eslint-config`, `packages/typescript-config` | Shared lint and TypeScript configs. |

## Getting started

```sh
bun install
bun run dev                      # every app
bunx turbo run dev --filter=web  # only the website
```

Default ports: `web` 3000, `clientes` 3001, `admin` 3002, `api` 3003 (`PORT` overrides the API port), PostgreSQL 5432, Redis 6380.

Other commands, all from the repo root:

```sh
bun run build
bun run lint
bun run check-types
bun run format
```

## Backend (`apps/api`)

NestJS 12 (ESM) with TypeORM (PostgreSQL) and BullMQ (Redis). PostgreSQL 17 and Redis 7 run in containers with Podman.

```sh
systemctl --user start podman.socket   # once per session, needed by `podman compose`
cp .env.example .env                   # compose variables (root)
cp apps/api/.env.example apps/api/.env # app variables; set DATABASE_PASSWORD
bun run infra:up                       # also: infra:down, infra:logs, infra:ps
bun run dev --filter=api               # or: bunx turbo run dev --filter=api
curl localhost:3003/health             # database and redis checks
```

Both `.env` files are git-ignored; keep the same database password in each.

| Task | Command (from `apps/api`) |
|---|---|
| Unit tests | `bun run test` |
| Integration tests (needs `infra:up`) | `bun run test:e2e` |
| First administrator | `bun run admin:create -- --correo <email> --cedula <digits> --nombres <text> --apellidos <text>` (hidden password prompt) |
| Migrations | `bun run migration:generate -- src/database/migrations/<Name>`, `migration:run`, `migration:revert`, `migration:show` |

- TypeORM never synchronizes the schema (`synchronize: false`); every change goes through a migration. `src/database/data-source.ts` feeds the TypeORM CLI.
- Queues use BullMQ with the `orthopro` prefix. The `system` queue and its `ping` processor exist to prove the wiring; add real queues as modules under `src/queues`.
- `GET /health` returns 503 when the database or Redis is unreachable.
- Relative imports need the `.js` extension (ESM).
- Auth: JWT in httpOnly cookies (`auth_token` 15 min, `refresh_token` 7 days with rotation and reuse detection), every route protected unless `@Public()`, per-email lockout (3 failures, 5 minutes), per-endpoint rate limits, helmet, CORS allow-list and Origin check. Requires `JWT_SECRET` in `apps/api/.env`. The first administrator is created with `bun run admin:create` (never over HTTP): the password is prompted twice with hidden input, or piped as one line with `--password-stdin` for automation. Full reference (flows, cookies, env variables, threat notes, follow-ups): [`apps/api/docs/auth.md`](apps/api/docs/auth.md).
- Database model: ERD, data dictionary, integrity rules and data-protection notes in [`apps/api/docs/database-model.md`](apps/api/docs/database-model.md); generated DDL in `apps/api/docs/schema.sql` (`bun run db:schema` from `apps/api`, needs `infra:up`).

## Website (`apps/web`)

- **Environment:** `NEXT_PUBLIC_SITE_URL` sets the base URL for canonical links, Open Graph, `sitemap.xml`, `robots.txt` and JSON-LD. It defaults to `https://orthoprolab.com`, the planned domain. See `apps/web/.env.example`.
- **Cache Components** are enabled (`cacheComponents: true`). Avoid `new Date()` or random values during prerender, and do not export `dynamicParams`. The footer year uses `"use cache"` (`components/current-year.tsx`).
- **Theme:** colors and fonts come from `@repo/theme`. Each app loads Outfit (headings) and Poppins (body) with `next/font` in its `layout.tsx`, using the `--font-outfit` and `--font-poppins` variables.
- **Catalog:** services are defined in `apps/web/lib/catalog.ts`. Prices are never shown on the site; "Ver precios" downloads `public/catalogo-orthopro-lab.pdf`, currently a placeholder.
- **Payments:** there is no payment gateway. `apps/web/lib/payments.ts` holds the bank accounts shown on `/pagos`, currently placeholders.
- **Images:** local files in `apps/web/public/images`. The hero and page headers are preloaded, the rest load lazily.

## Pending content

Content that still needs real data (bank accounts, catalog PDF, mission and vision, turnaround policy, testimonials, contact channels) is tracked in `odd/copy-needs.md`. Feature progress is in `odd/tasks/orthopro-web.md`.

## Adding shadcn components

Run the CLI from `apps/web`; files land in `packages/ui/src/components`:

```sh
cd apps/web
bunx --bun shadcn@latest add <component>
```

If the CLI writes `from "cn"` imports, change them to `@repo/ui/lib/utils`. The shadcn style here is `base-nova`, so triggers use the Base UI `render` prop instead of `asChild`.

## Agent guidance

`CLAUDE.md` and the per-app `AGENTS.md` files describe the repo for coding agents. The Next.js and Turborepo versions used here differ from older docs, so read the guides bundled in `node_modules` before changing configuration.
