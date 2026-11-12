# Bot de WhatsApp

Proceso de Bun que conecta Baileys con WhatsApp y todavía no llama a la API.
Al iniciar muestra el QR de emparejamiento en la terminal.

## Variables

- `WHATSAPP_AUTH_DIR`: directorio externo para `auth_info`; por defecto
  `~/.orthopro-lab/whatsapp/auth_info`.
- `WHATSAPP_AUTH_DIR` nunca debe apuntar al repositorio.

La sesión contiene credenciales de WhatsApp y queda fuera del repositorio por
configuración. No se debe copiar ni compartir.

## Desarrollo

```sh
bun run dev
bun run test
bun run check-types
```
