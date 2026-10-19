# orthopro-web

Branch: `feat/orthopro-web` · Baseline commit: `229804a`

## Objective
Implement the public website of the dental lab "Orthopro Lab" in `apps/web`, from the Stitch project `15000302671765893488` ("Orthopro Lab Website", dark mode), using shadcn/ui components shared across the monorepo.

## Scope
Sections: Landing (Inicio), Sobre nosotros (Misión, Visión), Catálogo (one subroute per service type; prices NOT shown, a "Ver precios" button downloads the catalog PDF), Pagos (NO payment gateway; show official bank accounts to deposit into).

## Constraints / decisions
- shadcn: no preset (`--defaults`-style base config), Next template, shared in the monorepo via `packages/ui` (existing stubs `button/card/code` are used by `apps/docs` and must keep working).
- Fonts: Outfit (headings) + **Poppins** (body). User overrode Stitch's Plus Jakarta Sans.
- Colors/tokens come from `@repo/theme` (surface #171717, surface-alt #b6bebf, body #f5f5f5, title #56898f, highlight #48fbc1); Stitch design system uses the same palette.
- Artifacts (code, UI copy) in English identifiers; UI copy language follows the Stitch design (Spanish).
- Next.js here is a newer version: read `apps/web/node_modules/next/dist/docs/` before writing Next code.
- No commit trailers / AI attribution (user global rule).

## Tasks
- [x] T1 shadcn infrastructure shared via `packages/ui` + wired into `apps/web` (components.json in both, aliases, tailwind @source, docs still builds)
- [ ] T2 Theme mapping: shadcn CSS variables ← `@repo/theme` tokens; Outfit + Poppins in `apps/web` layout
- [ ] T3 Shared layout (navbar, footer) + Landing page from Stitch screen "Inicio"
- [ ] T4 Sobre nosotros page (Misión, Visión)
- [ ] T5 Catálogo: index + dynamic subroute per service type; "Ver precios" downloads PDF (placeholder PDF in `public/`)
- [ ] T6 Pagos page: bank account cards with copy-to-clipboard (placeholder account data, flagged)
- [ ] T7 Final verification: lint, check-types for web, build

## Route declaration
Delegated writers for T1, T3–T6 (2+ non-trivial files each); T2 inline if small. Evidence: Stitch HTML screens are 4–9k px tall each → mapping delegated.

## Open items
- Real bank account data and the real catalog PDF are not provided → placeholders, to be replaced by the client.

## Progress / evidence
T1 (delegated writer, route: delegated): shadcn `base-nova` components.json hand-written in `packages/ui` and `apps/web` (init not usable in existing monorepo); components in `packages/ui/src/components/` (accordion, badge, button, card, navigation-menu, separator, sheet); import convention `@repo/ui/components/<name>`, `@repo/ui/lib/utils`. Old stubs kept (`@repo/ui/button` → docs). Checks observed: bun install OK; check-types ui+docs OK; `next build` web OK; `build --filter=docs` OK. FAILED (pre-existing, same with changes stashed): `turbo lint --filter=@repo/ui` → missing `@babel/preset-typescript`. TDD exception: infra/config, no meaningful RED. Review assessment: pending after commit.
Gotcha: shadcn variables (`--background`, `--primary`, …) were NOT added; T2 must define them from `@repo/theme`.

## Next step
T2
