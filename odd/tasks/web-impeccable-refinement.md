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

- S7: Diagnose first with `~/.github/skills/impeccable/reference/layout.md`: both assessments (squint test, grouping, rhythm, structure, density, adaptation, extremes) plus `impeccable detect --json --scope layout`, and write a "spatial thesis" in this document before editing.
- S8: Home: break the uniformity. Today every section has the same padding and weight. Intentional rhythm (tight and generous intervals), one clear leading section after the hero, and the 4-step process with a structure that shows sequence (not 4 equal columns). The change must be visible in screenshots.
- S9: Inner pages (`/catalogo`, `/nosotros`, `/pagos`): one semantic spacing scale (roles in `lib/ui.ts` or `globals.css`), no one-off values.
- S10: Structural responsive: at 360px content reorders/collapses meaningfully; DOM and focus order match visual order; no horizontal scroll.
- S11: Visual evidence: before/after screenshots at 1440 and 360px of the 4 pages (Playwright against `next start`), lint and build green, detect with no new findings.
- Phase 2 constraint: preserve the visual world (colors, fonts, images, copy, S1). Layout changes structure, not identity. No `ponytail` minimal-change mode: this phase requires a visible change.


## Tasks

- [x] T1 (S1, S2) home — commits `01ea4f2`, `35c69f5`, `3f12a9d`: sin cambios de copy/rutas/metadata (S1 intacto); tracking al piso del craft-floor, `text-balance` en títulos, motion con `motion-safe:`
- [x] T2 (S1, S3) inner pages + layout components — commits `01ea4f2`, `3f12a9d`: `lib/ui.ts` unifica RADIUS/TINTED_SHADOW/CTA_BASE en las cinco páginas y en location-map/price-download-button
- [x] T3 (S4, S5) adapt + a11y — commits `35c69f5`, `0518587`: touch targets 44px (nav, footer, trigger, volver), focus-visible global en anchors, reduced-motion respetado, callout de /pagos a 1px
- [x] T4 (S6) verification — lint y build verdes en `apps/web`, `impeccable detect` sin hallazgos nuevos; ver Log L5

- [x] T5 (S7) diagnosis + spatial thesis — `detect --scope layout` = `[]`; tesis en «Tesis espacial»; capturas base en `odd/artifacts/web-impeccable-p2/before/`
- [x] T6 (S8, S10) home layout — commit `51734a2`: bento 7/5 con pieza ancla, proceso como riel vertical con nodos y línea, «antes» 5/7 apretado
- [x] T7 (S9, S10) inner pages layout — commit `51734a2`: `SECTION_*`/`HEADING_GAP` aplicados a `/catalogo`, `/catalogo/[servicio]`, `/nosotros` y `/pagos`; ningún `py-*` suelto en las páginas
- [x] T8 (S11) verification — lint y build verdes, `detect` = `[]`, capturas antes/después a 1440 y 360px; ver Log L9

## Tesis espacial (S7, antes de editar)

**Evidencia del diagnóstico**

- Escaneo mecánico: `impeccable detect --json --scope layout app components` → `[]`. Ningún defecto mecánico; el problema es de composición, no de valores inválidos.
- Capturas «antes» (Playwright, `next start`, 1440 y 360): `odd/artifacts/web-impeccable-p2/before/`. Overflow horizontal 0 en las 4 páginas a 360px; alturas: home 5665, catalogo 2328, nosotros 4817, pagos 2186 (px a 360).
- Prueba de entornado (squint) sobre `before/home-1440.png`: se identifica el hero (primario) y el bento (secundario), pero del tercer bloque en adelante todo pesa igual — proceso, «antes del primer caso», mapa y cierre son cuatro bloques intercambiables.
- **Ritmo:** cinco secciones consecutivas con `py-20 lg:py-28` exacto. Un solo intervalo repetido: todo tiene el mismo peso.
- **Estructura:** el proceso son 4 columnas iguales con filetes superiores finos; el orden 1→2→3→4 no se lee en la topología, solo en el texto. El bento reparte 2×2 + 2 de forma arbitraria: no hay pieza que lidere.
- **Agrupación:** correcta. Las tarjetas no compensan proximidad; no hay contenedores de más.
- **Densidad:** adecuada al modo Persuade. No se toca.
- **Adaptación:** a 360px todo apila en una columna y el orden del DOM coincide con el visual. No hay reordenamiento con intención: es apilado por defecto.
- **Extremos:** títulos largos ya van con `text-balance` (fase 1); el número de cuenta de `/pagos` ya vive en `flex-wrap`.

**Tesis**

- **Camino primario:** promesa del hero → qué fabricamos (servicios) → cómo viaja el caso (proceso) → qué preparar (antes) → dónde estamos (mapa) → catálogo.
- **Lidera:** servicios. Es el capítulo que hereda el hero: título más grande, más aire y una pieza ancla que domina el bento (7 de 12 columnas) con las otras tres apiladas al lado (5 de 12).
- **Soportan:** proceso (banda estructural con secuencia visible), «antes» (lista de apoyo, deliberadamente apretada), mapa (hito), cierre (remate generoso).
- **Ritmo pretendido (escritorio):** apretado tras el hero (5rem) → generoso al abrir capítulo nuevo (7rem) → apretado en el apoyo (3.5rem) → generoso en el hito (7rem) → remate (8rem). Contraste 3.5rem ↔ 8rem = 2,3×.
- **Escala semántica** (`lib/ui.ts`): `SECTION_LEAD`, `SECTION_BAND`, `SECTION_TIGHT`, `SECTION_CLOSE`, `HEADING_GAP`. Ningún `py-*` suelto en las páginas.
- **Secuencia del proceso:** riel vertical con nodo por paso y línea que los une, título sticky a la izquierda en escritorio. Se usa el icono existente como nodo: sin números inventados y sin copy nuevo.
- **Cambio por viewport:** a 360px el riel se mantiene (la secuencia sigue siendo el contenido), el bento pasa a una columna con la pieza ancla primero y el proceso apila título arriba. El orden del DOM no cambia, así que el orden de foco sigue al visual.
- **Identidad intacta (S1):** mismos tokens, fuentes, imágenes, copy, rutas y metadata. Solo cambia estructura, ritmo y jerarquía.


## Log

- L1 (2026-11-22, user): "Vamos a usar la skill de impeccable para hacer un rework a [web](app/apps/web) No edites archivos tú. Guarda el plan aprobado en odd/tasks/<feature>.md. Lanza un hilo con t3_thread_launch: modelSelection: el proveedor Pi (usa su instanceId) y su modelo; workspaceStrategy: worktree; message: \"Lee odd/tasks/<feature>.md completo e impleméntalo. Corre los tests y reporta qué criterio quedó cubierto.\" Después usa t3_thread_wait y t3_thread_read, revisa el diff, corre tú al menos un test y mándale correcciones con t3_thread_send (máximo 2 rondas)."
- L2 (2026-11-22, user): chose "Refinamiento" over full redesign; approved plan S1–S6, T1–T4.
- L3: no unit tests exist in `apps/web`; lint, build and impeccable detect are the applicable checks.
- L4 (2026-11-23, Pi): refinamiento completo en la rama `feat/web-impeccable-refinement-pi` (4 commits de unidad de trabajo). S1 preservado: cero cambios a claves `texto`/`fetchContenido`, defaults, rutas, metadata/JSON-LD e imágenes. Sin PRODUCT.md: se ofrece `/impeccable init` como seguimiento.
- L5 (2026-11-23, Pi): verificación final. `bun run lint` verde en los 6 workspaces del monorepo; `bun run build` en `apps/web` con exit 0; `impeccable detect --json` sobre los 11 archivos tocados devuelve `[]`. El upgrade de Next.js y demás dependencias queda fuera de esta tarea: lo lleva el usuario en paralelo.
- L6 (2026-11-23, user): "No, no lo detengas, que siga y en paralelo tú haces la update" — dependency upgrade done by parent in `6e1276c` (Next 16.4.6, all deps latest; TypeScript kept on 6/5 because Nest CLI and typescript-eslint do not support 7.0; user: "Quedémonos en t6").
- L7 (2026-11-23, parent): screenshots show the phase 1 refinement is barely visible. Found S5 bug: with `prefers-reduced-motion: reduce` the page renders blank (Reveal SSR opacity 0 persists after hydration); sent to Pi as correction 2/2.
- L8 (2026-11-23, user): "Layout!!" — approved phase 2 (S7–S11, T5–T8).
- L9 (2026-11-23, Pi): fase 2 implementada en `51734a2` (7 archivos, +150/−82). Evidencia:
  - Ritmo: `lib/ui.ts` expone `SECTION_LEAD` (5rem), `SECTION_BAND` (7rem), `SECTION_TIGHT` (3.5rem), `SECTION_CLOSE` (8rem) y `HEADING_GAP` (2.5rem); el contraste apretado↔generoso es 3.5rem ↔ 8rem (2,3×) y ya no queda ningún `py-20 lg:py-28` suelto en `app/`.
  - Estructura: el bento de la home pasa de 2×2+2 a ancla de 7 columnas + tres apiladas de 5; el proceso pasa de 4 columnas iguales a riel vertical con nodo por paso y línea conectora, con el título sticky a la izquierda; «antes del primer caso» pasa a 5/7 y usa `SECTION_TIGHT`.
  - Alturas medidas (360px, antes → después): home 5665 → 5080, catalogo 2328 → 2280, nosotros 4817 → 4599, pagos 2186 → 2154. Overflow horizontal 0 en las 8 vistas (4 páginas × 2 anchos).
  - Capturas: `odd/artifacts/web-impeccable-p2/before/{home,catalogo,nosotros,pagos}-{1440,360}.png` y `.../after/...` (no se commitean: 13,8 MB).
  - `bun run lint` verde; `bun run build` exit 0; `impeccable detect --json` sobre los 7 archivos tocados = `[]`.
- L10 (2026-11-23, Pi): la rama queda en 550 líneas de autoría desde `origin/main`, por encima del corte de ~400. Para publicar conviene partirla en dos: fase 1 (refinamiento + fix de `Reveal`, commits `01ea4f2`..`1bb0010`) y fase 2 (layout, `51734a2`), cada una con su propio PR encadenado.

