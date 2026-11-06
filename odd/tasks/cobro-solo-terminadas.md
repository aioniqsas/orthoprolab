# Cobro solo de órdenes terminadas y controles en el correo de la cuenta

El API rechaza adjuntar a una cuenta de cobro cualquier orden que no esté `terminada`, y el correo de la cuenta de cobro adjunta el control de trabajos de cada orden incluida.

**Scope**: `apps/api` (cuentas de cobro: gate de estado + adjuntos del correo), pruebas y documentación.

## Specs

- **S1** — `POST /cuentas-cobro/:id/ordenes` rechaza con 400 cualquier orden cuyo estado no sea `terminada`, nombrando el estado actual.
- **S2** — `GET /cuentas-cobro/:id/ordenes-disponibles` solo devuelve órdenes `terminada` que no estén ya en otra cuenta activa.
- **S3** — El correo de la cuenta de cobro adjunta el PDF de la cuenta más un PDF de control de trabajos por cada orden incluida (`control-de-trabajos-orden-<id>.pdf`).
- **S4** — Se mantiene el correo de control de trabajos al finalizar la orden: el documento de entrega sigue llegando en el momento de la aceptación.

## Tasks

- [x] T1 — Gate de estado en `adjuntarOrdenes` y filtro en `findOrdenesDisponibles`. (S1, S2)
- [x] T2 — Adjuntos: `enviarPorEmail` genera los controles de las órdenes incluidas y el mailer los envía con la cuenta. (S3)
- [x] T3 — Pruebas: gate del servicio y adjuntos del mailer. (S1–S3)
- [x] T4 — Docs y verificación. (S1–S4)

### Verificación observada

- `vitest run --pool=threads src/cuentas-cobro/` → 8/8: rechaza `en_proceso` y `cancelada` (con el mensaje «Solo se cobran órdenes terminadas»), acepta `terminada` y guarda el snapshot; el mailer adjunta cuenta + un control por orden, y solo la cuenta cuando no hay órdenes.
- `tsc --noEmit` limpio; `oxlint --type-aware src/cuentas-cobro/` sin hallazgos.
- Un control que falla al generarse se omite con un warning y el correo de la cuenta sale igual.

## Log

- **L1** — «Ahora estamos mandando dos correos: uno para la cuenta de cobro y otro para el control de trabajo. Podríamos simplificar el flujo y además, tenemos alguna validación para qué órdenes incluimos en las cuentas de cobro... yo creería que es mejor cobrar solo lo terminado porque te evita líos legales y disputas con los clientes.»
- **L2** — Hallazgo: no existía ninguna validación de estado; se podían facturar órdenes `creada`, `en_proceso` e incluso `cancelada`.
- **L3** — Decisión del cliente: solo `terminada` (coincide con la única aceptación explícita del cliente en el flujo).
- **L4** — Decisión del cliente: se mantienen los dos correos, y el de la cuenta adjunta también los controles de trabajos de las órdenes incluidas.
