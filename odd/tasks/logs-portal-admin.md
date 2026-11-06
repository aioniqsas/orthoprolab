# Logs del portal Admin

Cada server action y el límite de error del portal dejan una línea JSON con una `ref` que el usuario también ve, para poder explicar un fallo sin adivinar.

**Scope**: `apps/admin` (logger, acciones de cuentas de cobro, frontera de error), pruebas y documentación.

## Specs

- **S1** — `apps/admin/lib/logger.ts` produce una línea JSON por evento con `ts`, `nivel`, `ambito`, `ref`, `mensaje` y `datos`.
- **S2** — `conRegistro()` envuelve una acción: registra inicio, resultado y duración con la misma `ref`, y convierte una excepción inesperada en `{ ok: false, error: "Error inesperado (ref …)" }` en vez de romper la respuesta.
- **S3** — Las llamadas a la API de `cuentas-cobro/[id]` registran estado HTTP y un fragmento del cuerpo cuando la respuesta no es 2xx.
- **S4** — `app/(portal)/error.tsx` captura los fallos que no llegan a una acción, registra el `digest` de Next y lo muestra al usuario con un botón de reintento.

## Tasks

- [x] T1 — `logger.ts` + pruebas (formato, `ref`, resultado controlado, excepción).
- [x] T2 — `conRegistro` y `pedirApi` en `generarPdf` y `enviarEmail`.
- [x] T3 — Frontera de error del portal.
- [x] T4 — Documentación en `docs/portals.md`.

### Verificación observada

- `vitest run --pool=threads lib/logger.spec.ts` → 5/5.
- `tsc --noEmit` limpio en `apps/admin`.
- **No verificado**: el aspecto de la pantalla de error en el navegador; para provocarla, vence la cookie `auth_token` y envía el formulario.

## Log

- **L1** — «Necesito un sistema de logs para saber porqué pasa eso» ante el error de runtime `An unexpected response was received from the server` en `cuentas-cobro/[id]`.
- **L2** — Diagnóstico: las acciones de esa pantalla ya capturaban sus errores y devolvían objetos serializables, así que el mensaje no viene de ellas sino de una respuesta que no es payload de acción (redirección de `proxy.ts` a `/login` o HTML de un 500). De ahí que el sistema cubra los dos lados: log en la acción y frontera de error en el cliente.
