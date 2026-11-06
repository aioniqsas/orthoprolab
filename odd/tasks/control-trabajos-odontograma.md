# Control de trabajos: clases de trabajo, odontograma y pruebas

El PDF del control de trabajos pasa a mostrar el detalle de cada clase de trabajo, una figura PNG del odontograma de la orden, y después las pruebas/devoluciones con su fecha.

**Scope**: `packages/api-client` (figura del odontograma), `apps/api` (rasterizado + PDF), pruebas y documentación.

## Specs

- **S1** — El PDF lista las clases de trabajo una sola vez, con su información por línea: clase, cantidad, dientes y color.
- **S2** — Después de las clases y antes de las pruebas, el PDF incluye una imagen PNG del odontograma de la orden, con los dientes seleccionados resaltados.
- **S3** — La sección «Pruebas / Devoluciones» va al final y cada prueba muestra su fecha y su motivo.
- **S4** — El orden de las secciones es: clases de trabajo → odontograma → pruebas/devoluciones.

## Tasks

- [x] T1 — Figura del odontograma como SVG determinista, sin dependencias: vive en `apps/api/src/pedidos/odontograma-svg.ts` (no en `@repo/api-client`, porque el API no resuelve ese paquete sin `bun install`) + 6 pruebas. (S2)
- [x] T2 — `apps/api/src/pedidos/odontograma-png.ts`: rasteriza con `sharp` cargada dinámicamente. `sharp@0.35.5` instalada con `bun add sharp` en `apps/api`; sin ella el PDF se emite sin la figura y deja un aviso. (S2)
- [x] T3 — PDF: clases de trabajo con detalle por línea, imagen del odontograma y pruebas con fecha, en ese orden. (S1, S3, S4)
- [x] T4 — Docs y verificación. (S1–S4)

### Verificación observada

- `vitest run --pool=threads src/pedidos/odontograma-svg.spec.ts src/pedidos/pdf-control-trabajos.service.spec.ts` → 8/8: 32 dientes con numeración FDI, solo los de la orden resaltados, color configurable, SVG determinista, arcadas que no se superponen, PDF válido (`%PDF-` … `%%EOF`) con y sin líneas/devoluciones.
- `tsc --noEmit` limpio en `apps/api`; `oxlint --type-aware src/pedidos/` sin hallazgos.
- La ruta degradada se observó de verdad: con `sharp` ausente el log emite «Odontograma omitido del PDF: Cannot find package 'sharp'» y el PDF igual se genera.
- Con `sharp` instalada: `odontograma-png.spec.ts` verifica un PNG real de 600×420, y la prueba del PDF confirma que el documento incrusta una imagen (`/Subtype /Image`).
- `bun install --frozen-lockfile` → «Checked 852 installs across 983 packages (no changes)»: el lockfile quedó consistente para CI.
- La figura se rasterizó a PNG y se inspeccionó visualmente: dos arcadas con paladar, corona y fisura por tipo de diente, rotación hacia el centro, numeración FDI fuera del arco y los dientes de la orden resaltados. Es el mismo diseño del odontograma de las órdenes (`packages/ui/src/components/odontograma.tsx`), con los colores adaptados al papel blanco.
- **No verificado**: la composición visual del PDF completo (no hay visor de PDF en el entorno); la imagen sí se verificó por separado.

## Log

- **L1** — «En las pruebas de evoluciones también vamos a incluir qué clase de trabajo era y su información, vamos a incluir un PNG del odontograma de la orden, y luego de eso sí vendrán las pruebas y de evoluciones.»
- **L2** — Decisión del cliente: PNG generado desde un SVG propio y rasterizado con `sharp` (una dependencia nueva).
- **L3** — Decisión del cliente: el detalle de clases de trabajo va una sola vez, arriba; cada prueba queda con fecha + motivo.
- **L4** — Estado del entorno: `sharp@0.35.5` está en el store del monorepo como dependencia opcional de Next, pero no es resoluble desde `apps/api`; declararla exige `bun install`, que no existe en el entorno del agente.
- **L5** — Corregido antes de commitear: las dos arcadas usaban centros distintos y se solapaban; ahora comparten una línea de mordida y hay una prueba que lo fija.
- **L6** — El cliente señaló que la figura esquemática (rectángulos) no era el odontograma de las órdenes. Se portó la geometría y las formas reales: coronas por tipo de diente (4 variantes), fisuras (4 variantes), paladar, rotación por posición y numeración fuera del arco.
