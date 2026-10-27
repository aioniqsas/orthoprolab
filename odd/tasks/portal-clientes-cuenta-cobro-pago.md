# Portal clientes: detalle de cuenta de cobro y registro de pago

## Objetivo

En `apps/clientes` (puerto 3001), la ruta `/cuentas-cobro/:id` muestra el detalle de la cuenta, los métodos bancarios oficiales con su QR y permite subir un comprobante de pago. El envío notifica por correo a los administradores.

## Contexto

- El portal ya lista cuentas en `/cuentas-cobro`; el enlace de detalle no existía.
- El backend ya tenía cuentas de cobro y `pago`, pero solo para el rol `administrador`.
- No existía una tabla de métodos bancarios ni el QR en base de datos: se crea
  `metodo_pago_bancario` y se siembra con la cuenta oficial vigente.
- El comprobante se guarda en Cloudinary y se agrega a la fila de `pago`
  (`comprobante_url`, `comprobante_nombre`).

## Alcance

- Migración: `metodo_pago_bancario`, columnas de comprobante en `pago`, seed.
- API: `GET /mi-clinica/cuentas-cobro/:id`, `GET /mi-clinica/metodos-pago-bancarios`,
  `POST /mi-clinica/cuentas-cobro/:id/pagos` (multipart, rol `clinica`,
  verificación de pertenencia a la clínica).
- Correo a todos los usuarios activos con rol `administrador`.
- Portal: página de detalle, tarjetas de banco con QR, formulario de comprobante.

## Fuera de alcance

- CRUD de métodos bancarios desde el portal admin (se administran por SQL/migración).
- Verificación/aprobación del pago por parte del administrador: el pago queda
  registrado y el administrador puede anularlo desde el panel existente.
- Copia del QR al portal (`apps/clientes/public/images/qr-cuenta.webp`) para que
  la ruta relativa guardada en la base sea servible.

## Tareas

- [x] T1 Migración y entidades (`metodo_pago_bancario`, comprobantes en `pago`).
- [x] T2 Endpoints de clínica + subida a Cloudinary + correo a administradores.
- [x] T3 Portal: tipos, repositorio y página de detalle con QR.
- [x] T4 Formulario de comprobante (server action) y verificación.

## Evidencia

- Migración `1792631000000-CreateMetodosPagoYComprobantes` ejecutada.
- `GET /mi-clinica/metodos-pago-bancarios` y `GET /mi-clinica/cuentas-cobro/1`
  responden 200 con token de clínica.
- `POST /mi-clinica/cuentas-cobro/1/pagos` respondió 201, guardó el comprobante
  en Cloudinary y dejó la fila en `pago`. Se limpió el dato de prueba
  (`delete from pago where referencia='TEST-QA'`, estado de la cuenta restaurado).
- `bun run check-types` en `apps/api` sin errores; `detectComprobanteType` con
  test unitario.
- Pendiente: revisión visual en navegador del portal y confirmación de recepción
  del correo en la bandeja de administradores.

