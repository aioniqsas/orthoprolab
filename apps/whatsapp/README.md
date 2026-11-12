# Bot de WhatsApp

Proceso de Bun que conecta Baileys con WhatsApp y expone los flujos de lectura
contra la API: estado de pedido, control de trabajos (PDF) y cuenta de cobro
(PDF). Al iniciar muestra el QR de emparejamiento en la terminal.

## Variables

- `API_BASE_URL`: base de la API; por defecto `http://localhost:3003`.
- `WHATSAPP_SERVICE_TOKEN`: token de servicio que exige
  `POST /internal/whatsapp/sesion` (cabecera `X-Whatsapp-Service-Token`).
- `WHATSAPP_HMAC_SECRET`: secreto distinto para firmar cada solicitud
  (`telefono|timestamp|nonce`, HMAC-SHA256). Obligatorio.
- `WHATSAPP_AUTH_DIR`: directorio externo para `auth_info`; por defecto
  `~/.orthopro-lab/whatsapp/auth_info`.
- `WHATSAPP_AUTH_DIR` nunca debe apuntar al repositorio.
- `WHATSAPP_PDF_HOSTS`: hosts (separados por comas) de los que el bot puede
  descargar un PDF de cuenta de cobro. Por defecto `res.cloudinary.com`.
  Solo se aceptan URLs `https:` de esos hosts; cualquier otra URL se rechaza
  con un mensaje en palabras, y los hosts privados o internos nunca pasan.

Si falta `WHATSAPP_SERVICE_TOKEN` o `WHATSAPP_HMAC_SECRET`, el bot responde a
cada mensaje que no está configurado y no crashea.

La sesión contiene credenciales de WhatsApp y queda fuera del repositorio por
configuración. No se debe copiar ni compartir.

## Desarrollo

```sh
bun run dev
bun run test
bun run check-types
```
