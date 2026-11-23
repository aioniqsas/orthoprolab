# web-impeccable-refinement

Objective: refine (not redesign) `apps/web` using the impeccable skill (`~/.github/skills/impeccable/SKILL.md`; run its `scripts/impeccable context --target <file>` once, read `reference/polish.md`, `reference/adapt.md`, `reference/audit.md` and `reference/craft-floor.md` before editing).
Branch: `feat/web-impeccable-refinement`. Delivery: work-unit commits, no push. Checks (inside `apps/web`): `bun run lint`, `bun run build`, `~/.github/skills/impeccable/scripts/impeccable detect --json <changed files>`.

## Specs

- S1: Preserve the incumbent identity (`@repo/theme` tokens, brand, images), copy, routes, metadata/JSON-LD and every `fetchContenido`/`texto` key and default. Do not invent new copy or claims.
- S2: `polish` on `/` (`app/page.tsx`: hero, services bento, process, "antes del primer caso", map): hierarchy, spacing rhythm, typography and AA contrast.
- S3: `polish` on `/catalogo`, `/nosotros`, `/pagos` and header/nav/footer, aligned to one shared system (radius, shadows, CTAs unified instead of per-page local constants).
- S4: `adapt`: no horizontal scroll at 360px, touch targets >= 44px, usable mobile nav.
- S5: `audit` a11y: visible focus, `prefers-reduced-motion` respected in `Reveal` and hover motion, correct alt text and landmarks.
- S6: Lint and build green; `impeccable detect` reports no new findings on changed files; final report states which S# is covered, with evidence.

## Tasks

- [x] T1 (S1, S2) home — commits `01ea4f2`, `35c69f5`, `3f12a9d`: sin cambios de copy/rutas/metadata (S1 intacto); tracking al piso del craft-floor, `text-balance` en títulos, motion con `motion-safe:`
- [x] T2 (S1, S3) inner pages + layout components — commits `01ea4f2`, `3f12a9d`: `lib/ui.ts` unifica RADIUS/TINTED_SHADOW/CTA_BASE en las cinco páginas y en location-map/price-download-button
- [x] T3 (S4, S5) adapt + a11y — commits `35c69f5`, `0518587`: touch targets 44px (nav, footer, trigger, volver), focus-visible global en anchors, reduced-motion respetado, callout de /pagos a 1px
- [x] T4 (S6) verification — lint y build verdes en `apps/web`, `impeccable detect` sin hallazgos nuevos; ver Log L5

## Log

- L1 (2026-11-22, user): "Vamos a usar la skill de impeccable para hacer un rework a [web](app/apps/web) No edites archivos tú. Guarda el plan aprobado en odd/tasks/<feature>.md. Lanza un hilo con t3_thread_launch: modelSelection: el proveedor Pi (usa su instanceId) y su modelo; workspaceStrategy: worktree; message: \"Lee odd/tasks/<feature>.md completo e impleméntalo. Corre los tests y reporta qué criterio quedó cubierto.\" Después usa t3_thread_wait y t3_thread_read, revisa el diff, corre tú al menos un test y mándale correcciones con t3_thread_send (máximo 2 rondas)."
- L2 (2026-11-22, user): chose "Refinamiento" over full redesign; approved plan S1–S6, T1–T4.
- L3: no unit tests exist in `apps/web`; lint, build and impeccable detect are the applicable checks.
- L4 (2026-11-23, Pi): refinamiento completo en la rama `feat/web-impeccable-refinement-pi` (4 commits de unidad de trabajo). S1 preservado: cero cambios a claves `texto`/`fetchContenido`, defaults, rutas, metadata/JSON-LD e imágenes. Sin PRODUCT.md: se ofrece `/impeccable init` como seguimiento.
- L5 (2026-11-23, Pi): verificación final. `bun run lint` verde en los 6 workspaces del monorepo; `bun run build` en `apps/web` con exit 0; `impeccable detect --json` sobre los 11 archivos tocados devuelve `[]`. El upgrade de Next.js y demás dependencias queda fuera de esta tarea: lo lleva el usuario en paralelo.
