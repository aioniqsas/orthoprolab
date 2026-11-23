# web-redesign-seo

Objective: implement in `apps/web` the approved design in `odd/artifacts/web-redesign-seo/design/` (7 pages as `.dc.html` mockups, plus `canvas.json` whose `notes` hold the JSON-LD drafts). The mockups are the source of truth for layout, copy and structure; they are static HTML with inline styles, so translate them into the existing Next.js/Tailwind/`@repo/ui` code, never copy the inline styles.
Branch: `feat/web-redesign-seo` (your worktree branch is cut from it). Delivery: work-unit commits (~400 changed lines each), Conventional Commits, no push, no PR. No Co-Authored-By or AI attribution in commits.
Checks (inside `apps/web`): `bun run lint`, `bun run build`, `~/.github/skills/impeccable/scripts/impeccable detect --json <changed files>`. There are no unit tests in `apps/web`.
Before editing UI: run `~/.github/skills/impeccable/scripts/impeccable context --target apps/web/app/page.tsx` once, and read `~/.github/skills/impeccable/reference/craft-floor.md`. `apps/web/PRODUCT.md` already exists. Reuse `lib/ui.ts` (RADIUS, TINTED_SHADOW, CTA_BASE, SECTION_*, HEADING_GAP) and `components/reveal.tsx`.

## Specs

- S1: Keep the identity the user asked for: "Quiero mantener la misma gama de colores y el tipo de hero que tengo". Same `@repo/theme` tokens (dark ground, mint `highlight`), same fonts (Outfit headings, Poppins body), same full-bleed `hero.jpg` hero with gradient and bottom-left text. The mockups already use these; map their hex values to the theme tokens, do not hardcode hex.
- S2: Alignment rule, from the user: "Eso no debe pasar, todo debe estar bien alineado". In every card grid, images, titles and "Ver …" links must line up across cards even when one title wraps to two lines (reserve two title lines, e.g. `min-h-[2.5em]`, with `items-start` on the grid; do NOT use `subgrid`/`grid-row: span`, it stretched rows in the first attempt). Verify with the real service names at 1440px.
- S3: Home (`app/page.tsx`) follows `Main.dc.html`. The H1 must read "Laboratorio dental" large, then "con ortodoncia y prótesis en Medellín" smaller with "en Medellín" in `text-highlight`, as ONE `<h1>` (user: "debe predominar laboratorio dental"). Order: hero, services (4 lines), "Envía tu primer caso" (steps + WhatsApp card), team section, "Preguntas frecuentes" (8 questions, see S9), footer.
- S4: Services render from real data (`fetchServices()` / `lib/catalog.ts` / `lib/api-catalog.ts`), never hardcoded in markup. Names and slugs: ortodoncia-fija, ortodoncia-removible, alineadores-invisibles, retenedores-y-ferulas. Existing `SERVICE_IMAGES` mapping stays. `/catalogo` follows `Catalogo.dc.html` (four horizontal feature rows), `/catalogo/[servicio]` follows `Servicio.dc.html` (the mockup shows ortodoncia-removible as the example; build it for every slug: visible breadcrumb Inicio / Catálogo / <línea>, H1 "<Línea> en Medellín", products as H3 with "Cuándo se indica", "Otras líneas del laboratorio" excluding the current one).
- S5: `/nosotros` follows `Nosotros.dc.html`, `/pagos` follows `Pagos.dc.html`. Pagos keeps reading the account from `lib/payments.ts` (BANK_ACCOUNTS) and the QR from the existing content key `pagos.qr.imagen`; the mockup shows the real values only as an example. Keep the existing copy-to-clipboard component's behavior (a "Copiado" state for ~2s), restyled to the mockup. Do not add accounts. Do not show NIT unless `account.taxId` exists (existing rule).
- S6: WhatsApp, user decision: "no hagámoslo del seguimiento de leads así nos ahorramos esa parte legal". There is NO lead form, NO name field, NO consent checkbox. CTAs ("Abrir WhatsApp", "Escribir por WhatsApp", "Enviar comprobante por WhatsApp", "Enviar un caso") are plain links to `https://wa.me/<number>?text=<encoded message>`; the number comes from env `NEXT_PUBLIC_WHATSAPP_NUMBER` read once in `lib/site.ts` (export a `whatsappUrl(message)` helper). If the env var is empty, fall back to `https://wa.me/?text=<message>`. Messages: home/general "Hola, quiero enviar un caso a OrthoPro Lab."; pagos "Hola, ya realicé el pago y envío el comprobante.". Do not create or edit any `.env` file.
- S7: New page `/privacidad` follows `Privacidad.dc.html` (Política de tratamiento de datos personales). Bracketed items in the design (`[RAZÓN SOCIAL Y NIT]`, `[CORREO]`, `[TELÉFONO]`, `[CARGO / ÁREA]`, `[FECHA]`, `[Otros encargados…]`, `[Otras finalidades…]`) are placeholders the client must fill: render them as `texto("privacidad.<clave>", "<texto con corchetes>")` content keys so they are editable, keep the brackets in the defaults, and set `robots: { index: false }` on this page and leave it out of the sitemap until they are filled. List every placeholder in your final report. Footer link "Política de privacidad" on every page.
- S8: New article page `/laboratorio-dental-ortodoncia` follows `Articulo.dc.html`. Title: "Laboratorio dental de ortodoncia: qué debes saber antes de elegir". Target keyword "laboratorio dental ortodoncia". Visible breadcrumb Inicio / Laboratorio dental de ortodoncia, plus `BreadcrumbList` JSON-LD. Add it to the sitemap (`app/sitemap.ts`) and link it from the home FAQ intro.
- S9: FAQ, single source of truth: one typed array of `{ pregunta, respuesta }` per page (`lib/faq.ts`), used both to render the `<details>` list and to build the `FAQPage` JSON-LD (they must always match, Google requires it). Home: 8 questions in the order of `Main.dc.html` (3 operational + 5 about prótesis/clínicas/costo/servicios/cómo elegir). Article: the 5 general ones of `Articulo.dc.html`. Spanish text exactly as in the mockups, except: in the home answer to "¿Cómo les llegan las impresiones?" drop the bracket "[Recogida o envío: confirmar.]" and keep only "Recibimos las impresiones del caso para trabajar sobre ellas.". Wrap the answers in `texto()` keys so they stay editable. Reuse the helper already in `components/json-ld.tsx`.
- S10: SEO, user brief: "Palabra clave objetivo: laboratorio dental ortodoncia". Exactly one `<h1>` per page containing the local search intent ("… en Medellín" where the mockup has it); keep existing metadata/canonical/OG per page (`pageSocial`) and update titles/descriptions to match the new H1s ("Laboratorio dental en Medellín" for the home, already `SITE_TITLE`); keep existing `LocalBusiness` JSON-LD; alt texts as in the mockups; the hero image keeps `priority` and no entrance animation on the LCP element. Do NOT change `SITE_URL` or any deployment setting: production is `https://orthoprolab-frontend.vercel.app` and the owner sets `NEXT_PUBLIC_SITE_URL` in Vercel.
- S11: Preserve existing behavior: every `fetchContenido`/`texto` key that still has the same copy keeps its key and default; routes `/`, `/catalogo`, `/catalogo/[servicio]`, `/nosotros`, `/pagos` and the API proxy routes stay; `Reveal` must not leave content hidden with `prefers-reduced-motion`; touch targets >= 44px; visible focus; no horizontal scroll at 360px; DOM order = visual order.
- S12: Do not touch `apps/api`, `apps/admin`, `apps/clientes`, `packages/*`, Vercel/env files, `.env*`, lockfiles or dependencies. Do not invent copy, prices, claims, numbers or testimonials; if the mockup has a gap, use a bracketed content-key default and list it in the report. Prices stay out of the pages (the catalog PDF is the only place); do not add price displays.
- S13: Verification: `bun run lint` and `bun run build` green in `apps/web`; `impeccable detect --json` over the changed files with no findings; run `next start` and take Playwright screenshots at 1440px and 360px of the 7 pages (save under `odd/artifacts/web-redesign-seo/after/`, do not commit them); report horizontal-overflow = 0 for each; open the home at 1440px and confirm the 4 service cards are aligned (S2).

## Image map (mockup blob → file in `apps/web/public/images/`)

- `4b7094a4…` → `hero.jpg`
- `4628f7e7…` → `expansor-ortodoncia-tornillo-central.webp` (ortodoncia fija)
- `e430afb0…` → `placas-removibles-ortodoncia-con-tornillo.webp` (ortodoncia removible)
- `b20a0144…` → `alineadores-transparentes-sobre-modelos-dentales.webp` (alineadores)
- `d1aa432b…` → `placa-acrilico-removible-sobre-modelo.webp` (retenedores y férulas)
- `b8ea7b47…` → `tecnico-laboratorio-dental-ajustando-protesis.webp` (equipo / nosotros)
- `e0bb6d7c…` → `tecnicos-laboratorio-dental-trabajando-medellin.webp` (hero de nosotros)
- `5a01c0e9…` → `qr-cuenta.webp`
- `c3bd1d2a…`, `a6690080…` are no longer used.
Prefer the existing mapping in `lib/catalog.ts` where it already assigns these.

## Tasks

- [ ] T1 (S6, S9, S10, S11) shared base: `whatsappUrl` in `lib/site.ts`, `lib/faq.ts`, `FAQPage` helper in `components/json-ld.tsx`, header (home keeps the transparent-over-hero nav) and footer with the address, service links, "Política de privacidad".
- [ ] T2 (S1, S2, S3, S4, S9) home.
- [ ] T3 (S2, S4) `/catalogo` and `/catalogo/[servicio]`.
- [ ] T4 (S5, S6) `/nosotros` and `/pagos`.
- [ ] T5 (S7, S8, S10) `/privacidad`, `/laboratorio-dental-ortodoncia`, sitemap.
- [ ] T6 (S13) verification and screenshots.

Commit after each task and record the commit hash here when you close it. Report which `S#` each task covered, with evidence.

## Log

- L1 (2026-11-23, user): "Listo, ahora sí vamos a implementar esto, pero no lo vas a hacer tú. Delégale a Pi con el modelo DeepSeq 4.1 Flash con un nivel de pensamiento bajo y que sea él quien implemente todos los cambios del artefacto a la web. No sé cómo le vas a pasar el artefacto, pero hazlo."
- L2 (2026-11-23, user): "Quiero mantener la misma gama de colores y el tipo de hero que tengo"
- L3 (2026-11-23, user): "En la página del home vamos a cambiar laboratorio de ortodontia y prótesis en Medellín para Laboratorio dental con ortodoncia y  prótesis en Medellín o alguna frase parecido, pero debe predominar laboratorio dental."
- L4 (2026-11-23, user): "Mejor hagamos algo, no hagámoslo del seguimiento de leads así nos ahorramos esa parte legal y simplemente hacemos que la automatización del bot de WhatsApp en casos de preguntas muy concretas como por ejemplo qué valor tienes este servicio, qué servicios prestan pueda responder sin que haya una auténticación primeramente." (This task only covers the website; the bot is out of scope.)
- L5 (2026-11-23, user): "Las preguntas frecuentes al home"
- L6 (2026-11-23, parent): the design in `odd/artifacts/web-redesign-seo/design/` is the published canvas version `1795459385-b474` of the Artifact "OrthoPro Lab Redesign SEO". Known open points for the client, not for you to decide: WhatsApp number, privacy-policy placeholders (S7), the home FAQ answer about how impressions arrive, and whether the two off-topic FAQ questions (clinics in Colombia, consultation cost) stay.
