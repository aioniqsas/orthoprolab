# Control de trabajos descargable desde el portal Clientes

La clínica puede descargar el control de trabajos de una orden terminada desde el portal, sin depender del correo.

**Scope**: `apps/api` (endpoint de descarga) + `apps/clientes` (botón en el detalle), pruebas y documentación.

## Specs

- **S1** — `GET /mi-clinica/ordenes/:id/control-trabajos` (rol `clinica`) devuelve el PDF como adjunto con nombre `control-de-trabajos-orden-<id>.pdf`.
- **S2** — Solo se entrega cuando la orden está `terminada`; en cualquier otro estado responde 400 con «El control de trabajos está disponible cuando la orden está terminada.»
- **S3** — La descarga respeta el aislamiento entre clínicas: se resuelve la orden con el usuario autenticado, igual que el resto del módulo.
- **S4** — El detalle de la orden en el portal Clientes muestra el botón «Control de trabajos» solo en órdenes terminadas.

## Tasks

- [x] T1 — `MiClinicaService.controlTrabajos` + endpoint con `StreamableFile`. (S1–S3)
- [x] T2 — Botón de descarga en el detalle del portal Clientes. (S4)
- [x] T3 — Pruebas y verificación. (S1–S4)

### Verificación observada

- `vitest run --pool=threads src/mi-clinica/` → 4/4: entrega el PDF de una orden terminada, rechaza `en_entrega` y `cancelada` (sin generar el documento), y resuelve la orden con el usuario autenticado.
- `tsc --noEmit` limpio en `apps/api` y `apps/clientes`; `oxlint` y `eslint` sin hallazgos.
- **No verificado**: la descarga real en el navegador a través del rewrite `/api-proxy` (requiere las apps y el API en marcha).

## Log

- **L1** — «Que esos controles de trabajo asociados a las órdenes desde el portal de clientes sean también visibles y descargables por si se quieren abrir desde otro dispositivo y no tienen acceso al correo.»
- **L2** — Decisión de diseño: se genera al momento de la descarga en lugar de almacenarlo. Una orden `terminada` no admite cambios de estado ni de datos, así que el documento es equivalente al que se envió; se evita almacenamiento y migración. Si más adelante se necesita un archivo inmutable, se guarda en la finalización.
