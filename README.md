# OrthoPro Lab

Monorepo for OrthoPro Lab, a dental (orthodontic and prosthetic) laboratory in Medellín, Colombia. The public website lives in `apps/web`.

Turborepo with Bun workspaces. Requires Node >= 24 and Bun 1.4.2.

## Apps and packages

| Path | What it is |
|---|---|
| `apps/web` | Public marketing site (Next.js, Tailwind v4, shadcn/ui). Pages: landing, nosotros, catálogo (one route per service), pagos. |
| `apps/admin` | Admin app (Next.js, Tailwind v4). Starter only for now. |
| `apps/api` | NestJS backend API (port 3003). |
| `apps/clientes` | Client portal (Next.js, Tailwind v4). Starter only for now. |
| `packages/theme` | `@repo/theme`: shared Tailwind v4 tokens and the shadcn semantic variables (`theme.css`). |
| `packages/ui` | `@repo/ui`: shadcn/ui components shared across apps (`@repo/ui/components/*`, `@repo/ui/lib/utils`). |
| `packages/eslint-config`, `packages/typescript-config` | Shared lint and TypeScript configs. |

## Getting started

```sh
bun install
bun run dev                      # every app
bunx turbo run dev --filter=web  # only the website
```

Default ports: `web` 3000, `clientes` 3001, `admin` 3002, `api` 3003 (`PORT` overrides the API port).

Other commands, all from the repo root:

```sh
bun run build
bun run lint
bun run check-types
bun run format
```

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
