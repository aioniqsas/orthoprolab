<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# OrthoPro Lab — agent guide

Repository-wide guidance for coding agents. `apps/admin`, `apps/clientes` and `apps/web` have their own `AGENTS.md` with the managed Next.js block; read the closest one first.

## What this is

OrthoPro Lab is a dental laboratory in Medellín, Colombia. This repository is its Turborepo monorepo: a public marketing site, two authenticated portals, the API behind them, and shared packages. Bun workspaces (`apps/*`, `packages/*`), Node >= 24, Bun 1.4.2, TypeScript everywhere.

Domain language — routes, DB tables and columns, DTO fields, UI copy — is Spanish. Match the language of the file you are editing: repository docs are English, `apps/api/docs` is Spanish.

## Layout and ports

| Path                                                   | What it is                                                                                                | Port |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---- |
| `apps/web`                                             | Public marketing site (Next.js, Tailwind v4, shadcn/Base UI). Landing, nosotros, catálogo, pagos.         | 3000 |
| `apps/admin`                                           | Admin portal (Next.js) for `administrador`. Órdenes, cuentas de cobro, clínicas, catálogo, usuarios, CMS. | 3002 |
| `apps/clientes`                                        | Clinic portal (Next.js) for `clinica`. Doctores, pacientes, órdenes, cuentas de cobro.                    | 3001 |
| `apps/api`                                             | NestJS API (ESM) with TypeORM/PostgreSQL and BullMQ/Redis.                                                | 3003 |
| `packages/api-client`                                  | `@repo/api-client`: typed API client, schemas, session helpers.                                           | —    |
| `packages/ui`                                          | `@repo/ui`: shadcn/Base UI components, auth composites, odontogram.                                       | —    |
| `packages/theme`                                       | `@repo/theme`: Tailwind v4 tokens and shadcn variables.                                                   | —    |
| `packages/eslint-config`, `packages/typescript-config` | Shared lint and TypeScript configs.                                                                       | —    |
| `e2e/`                                                 | Playwright visual checks for the odontogram.                                                              | —    |
| `odd/tasks/`                                           | Feature specs and progress (Spanish). `odd/copy-needs.md`: claims declined for lack of evidence.          | —    |

PostgreSQL 17 listens on 5432 and Redis 7 on 6380 (host ports, published on `127.0.0.1`).

## Commands

From the repo root:

```sh
bun install
bun run dev        # every app in watch mode
bun run build
bun run lint       # oxlint for the API, ESLint elsewhere
bun run check-types
bun run format     # Prettier over **/*.{ts,tsx,md}
```

Target one workspace with `--filter`: `bunx turbo run dev --filter=web` (`web`, `admin`, `clientes`, `api`, `@repo/ui`, `@repo/api-client`). There is no root `test` script; run `bunx turbo run test` or a package's own `bun run test`.

Infrastructure runs on rootless Podman (`systemctl --user start podman.socket` once per session):

```sh
cp .env.example .env                    # compose variables
cp apps/api/.env.example apps/api/.env  # API variables; set DATABASE_PASSWORD and JWT_SECRET
bun run infra:up                        # also infra:down, infra:logs, infra:ps
```

Each app has its own git-ignored `.env`; only `.env.example` is tracked. Portals read `NEXT_PUBLIC_API_URL`; the site reads `NEXT_PUBLIC_SITE_URL` and `API_BASE_URL`.

## API — `apps/api`

NestJS 12 on ESM, TypeORM + PostgreSQL, BullMQ + Redis, Vitest.

- ESM: relative imports need the `.js` extension.
- Modules under `src/`: `auth`, `usuarios`, `clinicas`, `doctores`, `mi-clinica`, `pacientes`, `pedidos` (routes under `/ordenes`), `catalogo`, `contenido`, `cuentas-cobro`, plus `crypto`, `security`, `queues`, `health`, `config`, `database`.
- Auth: two httpOnly cookies — `auth_token` (JWT, 15 min) and `refresh_token` (7 days, rotated, stored hashed in `sesion_refresco`). A global JWT guard protects every route; opt out with `@Public()` and restrict with `@Roles('administrador' | 'clinica')`. The admin portal requires `administrador`; the clientes portal requires `clinica` with a clinic assigned. There is no public registration route: administrators create accounts, and the first one comes from `bun run admin:create` (never over HTTP).
- HTTP hardening lives in `src/app.setup.ts` and is shared with the e2e suite: helmet, CORS allow-list plus Origin check, validation pipe, JSON-only body parser with a 10 kB limit, no-store on auth responses, Redis throttling, per-email login lockout.
- Config is validated in `src/config/env.validation.ts`. `JWT_SECRET` is required; `ENCRYPTION_KEY` and `BLIND_INDEX_KEY` protect personal data (AES-256-GCM plus a blind index for the cédula). Losing `ENCRYPTION_KEY` makes stored personal data unrecoverable.
- Schema: TypeORM never synchronizes (`synchronize: false`). Every change is a migration in `src/database/migrations`, generated with `bun run migration:generate -- src/database/migrations/<Name>` and applied with `migration:run`; `src/database/data-source.ts` feeds the CLI. Seeds (roles, order states, catalog services) are migrations too.
- `GET /health` returns 503 when PostgreSQL or Redis is unreachable.
- Queues use the BullMQ prefix `orthopro`: `system` (wiring ping), `mail` (outbound email with attachments) and `http-retry` (replay failed requests; `POST /internal/retry`).
- Catalog and content: public `GET /catalogo/servicios[/:slug]` (never prices), SSE at `GET /catalogo/eventos`, generated `GET /catalogo/pdf`, admin CRUD under `/admin/catalogo/servicios`; content overrides at `GET /contenido` and `GET`/`PUT /admin/contenido`. Details: `apps/api/docs/catalogo.md` and `contenido.md`.
- Images upload to Cloudinary and answer 503 when the three `CLOUDINARY_*` variables are unset.

## Portals — `apps/admin`, `apps/clientes`

Next.js 16 with `cacheComponents` and `partialPrefetching` enabled. Both use Tailwind v4 through `@tailwindcss/turbopack`, `@repo/theme`, `@repo/ui` and `@repo/api-client`.

- Session: `proxy.ts` is an optimistic gate (redirect to `/login?next=…` when `auth_token` is missing, single-flight refresh when it is expired). The authoritative check is a server-side `GET /auth/me` in `lib/session.ts` (`getAccess`, deduplicated per request), used by the `(portal)` layout and by pages that render protected data.
- Data: server components and server actions call the API directly, forwarding the `auth_token` cookie (`lib/data/repository.ts`). Browser requests go through the Next rewrite `/api-proxy/:path*` so cookies stay same-origin. Writes live in `actions.ts` files next to their routes and revalidate paths after success.
- `apps/admin`: `/ordenes` (list, stats, detail, create, edit, cancel, state changes), `/cuentas-cobro` (attach orders, register/void payments, PDF, send), `/clinicas`, `/catalogo`, `/usuarios`, `/cms`. `/` redirects to `/ordenes`.
- `apps/clientes`: `/` (home), `/doctores`, `/pacientes`, `/ordenes` (create, edit/cancel while `creada`, return for correction, confirm), `/cuentas-cobro` (upload payment receipt). `/preview/odontograma` is a dev-only visual harness for Playwright, blocked in production by `proxy.ts`.
- Both portals share `@repo/ui/auth/*` (`PortalFrame`, `PortalLogin`, `SilentSession`, `LogoutButton`, `AccessNotice`) and `safeRedirectPath`. Never accept an open redirect: `next` must stay a same-origin relative path.

## Website — `apps/web`

Next.js 16 with `cacheComponents`; the public site must keep working when the API is down.

- Catalog data comes from `GET /catalogo/servicios` through `lib/api-catalog.ts`; `lib/catalog.ts` is the fallback used when the API is unreachable. Prices are never rendered — "Ver precios" downloads the PDF generated by the API, proxied at `/api/catalogo/pdf`.
- Live updates: `app/api/catalogo/eventos` bridges the API SSE stream and calls `/api/catalogo/revalidar`, which expires the `catalog` and `contenido` tags; `components/catalog-live.tsx` refreshes open tabs.
- Editable copy: `lib/content.ts` reads `GET /contenido`; a missing key means the literal in the page applies. The editor is `/cms` in `apps/admin`.
- Env: `API_BASE_URL` (server fetches, default `http://localhost:3003`) and `NEXT_PUBLIC_SITE_URL` (canonical links, Open Graph, `sitemap.xml`, `robots.txt`, JSON-LD; default `https://orthoprolab.com`).
- Payments: no gateway. `lib/payments.ts` holds the bank accounts shown on `/pagos`.
- Images are local files in `apps/web/public/images`; the hero and page headers are preloaded.

## Shared packages

- `@repo/api-client` — typed fetch client (`auth`, `request`, retry helpers), error classes, Zod schemas mirroring API rules, `safeRedirectPath`, `toAuthResult`, `resolvePortalAccess`, `fetchSessionOnServer`, tooth helpers. Subpath exports: `.`, `./schemas`, `./redirect`, `./reintentos`.
- `@repo/ui` — shadcn/Base UI components. Import through the export map: `@repo/ui/components/button`, `@repo/ui/auth/portal-login`, `@repo/ui/lib/utils`, `@repo/ui/odontograma`, `@repo/ui/section`, `@repo/ui/action-button`. The shadcn style is `base-nova`, so triggers use the Base UI `render` prop, not `asChild`. Add components from `apps/web` with `bunx --bun shadcn@latest add <component>`; fix `from "cn"` imports to `@repo/ui/lib/utils`.
- `@repo/theme` — Tailwind v4 tokens and shadcn variables in `theme.css` (colors `surface`, `surface-alt`, `body`, `title`, `highlight`; `font-heading` Outfit, `font-sans` Poppins). Each app loads both fonts with `next/font/google` using `--font-outfit` / `--font-poppins`.
- `@repo/eslint-config`, `@repo/typescript-config` — shared configs. The API has its own TypeScript and `oxlint` setup.
- Workspace packages use `moduleResolution: Bundler` and extensionless imports (Turbopack does not map `./x.js` to `.ts`); the API is the opposite: ESM with `.js` extensions.

## Tests and checks

| Suite              | Location                               | Command                                              |
| ------------------ | -------------------------------------- | ---------------------------------------------------- |
| API unit           | `apps/api/**/*.spec.ts`                | `cd apps/api && bun run test`                        |
| API integration    | `apps/api/test/**/*.e2e-spec.ts`       | `cd apps/api && bun run test:e2e` (needs `infra:up`) |
| Admin              | `apps/admin/lib/**/*.spec.ts`          | `cd apps/admin && bun run test`                      |
| API client         | `packages/api-client/src/**/*.spec.ts` | `cd packages/api-client && bun run test`             |
| UI                 | `packages/ui/src/**/*.spec.tsx`        | `cd packages/ui && bun run test`                     |
| Odontogram visuals | `e2e/odontograma.spec.ts`              | `bunx playwright test` (starts `clientes` on 3001)   |

- Single test: `bunx vitest run <file>` inside the package (or `bunx vitest run -t "<name>"`).
- `apps/web` and `apps/clientes` have no unit-test suite; `apps/clientes` has the dev preview used by Playwright.
- `bun run lint` fans out per workspace. `bun run check-types` only covers workspaces that define the script (`api`, `admin`, `@repo/ui`, `@repo/api-client`).

## Hard rules

- Never read, print, edit, or commit a real `.env`. Only `.env.example` is tracked. Do not run `keys:generate` unless explicitly asked.
- Never enable TypeORM `synchronize`; write a migration. Never hand-edit `apps/api/docs/schema.sql` — regenerate it with `bun run db:schema` inside `apps/api` (needs `infra:up`).
- Keep the managed blocks (`BEGIN:turborepo-agent-rules`, `BEGIN:nextjs-agent-rules`) in place and committed; `turbo` and `next dev` re-add them.
- Before changing Next.js configuration or writing Next.js code, read the bundled guide in that app's `node_modules/next/dist/docs/`. Before changing Turbo config or commands, read `docs/README.md` in the installed `turbo` package.
- The public site must not show prices; they exist only in the generated PDF.
- Do not invent business claims, figures, certifications, or contact channels. `odd/copy-needs.md` lists the claims already declined and the evidence needed to publish them.
- Substantial work is tracked in `odd/tasks/*.md` (Spanish). Update `docs/portals.md` and the relevant `apps/api/docs/*.md` when behavior changes.

## Where to read more

- `README.md` — setup and feature overview.
- `docs/portals.md` — portal routes, session model, known limitations.
- `apps/api/docs/auth.md`, `catalogo.md`, `contenido.md`, `database-model.md` — module references.
- `odd/tasks/*.md` — feature specs and progress; `odd/copy-needs.md` — pending copy.
- `README.md` and `docs/portals.md` describe earlier milestones in places; when they disagree with the code or `apps/api/docs`, the code and the API docs win.
