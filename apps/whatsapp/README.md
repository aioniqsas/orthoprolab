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
- `WHATSAPP_LAB_EMAIL`: dirección del laboratorio para las notificaciones de
  la opción 0 (solicitud de llamada). Es una variable de la API
  (`apps/api`): si falta, `POST /internal/whatsapp/llamada` responde 503 y el
  bot ofrece la vía directa.
- `WHATSAPP_PDF_HOSTS`: hosts (separados por comas) de los que el bot puede
  descargar un PDF de cuenta de cobro. Por defecto `res.cloudinary.com`.
  Solo se aceptan URLs `https:` de esos hosts; cualquier otra URL se rechaza
  con un mensaje en palabras, y los hosts privados o internos nunca pasan.

Si falta `WHATSAPP_SERVICE_TOKEN` o `WHATSAPP_HMAC_SECRET`, el bot responde a
cada mensaje que no está configurado y no crashea.

## Inteligencia con Groq (IA3, IA7)

La entrada no es un menú numerado: el bot saluda con una frase fija que nombra
sus capacidades (IA7). En el saludo, todo lo que la persona escriba («1», «la
A», «quiero ver mi pedido», «mándame la cuenta de la 1234», «hazme un pedido»)
lo enruta el modelo con herramientas de intención (`ver_pedido`,
`nuevo_pedido`, `pedir_llamada`, `enviar_control`, `enviar_cuenta`); los flujos
deterministas siguen siendo los ejecutores y el modelo nunca escribe ni
confirma. El escape es con palabras naturales (`menú`, `volver`, `inicio` y
`0`); un mensaje sin acción recibe una sola pregunta de aclaración. Sin modelo
disponible (sin llave, bandera apagada, timeout, HTTP != 200 o respuesta
malformada) el menú numerado responde como red de seguridad: el bot nunca
queda mudo. La sesión y las escrituras siguen siendo deterministas; el modelo
también elige entre las herramientas de lectura del catálogo cerrado
(`src/herramientas.ts`). El nombre con el que el bot responde quién es viene de
la base (`configuracion_bot`, `clave='nombre'`), leído dentro de la transacción
con el GUC de clínica y cacheado unos minutos; si falta o falla la lectura, cae
a `Aioniq` (IA8).

- `GROQ_API_KEY`: llave de Groq. Si falta, el bot vuelve al menú
  determinista sin anunciar nada.
- `WHATSAPP_LLM_MODEL`: modelo de Groq; por defecto
  `openai/gpt-oss-20b`.
- `WHATSAPP_LLM_ENABLED`: por defecto `true`; con `false` el bot vuelve al
  menú sin desplegar.

El cliente (`src/llm.ts`) usa `fetch` contra
`https://api.groq.com/openai/v1/chat/completions`, con timeout configurable
(12 s) y máximo un reintento ante error de red. Ante timeout, HTTP != 200 o
respuesta malformada, el mensaje lo atiende el menú determinista igual que
con la IA apagada: el bot nunca queda fuera de servicio por Groq.

Cada llamada del modelo se valida contra el catálogo antes de ejecutarse
(herramienta existente, argumentos exactos y tipados, sin `clinica_id`: la
clínica sale siempre del contacto verificado). El bucle es de máximo 2
rondas por mensaje, el consumo de tokens se acumula por conversación con un
tope cortés, el historial enviado al modelo se recorta y los teléfonos,
tokens y DSN se redactan antes de salir del bot. Por mensaje al modelo se
audita intención, herramienta, tokens y desenlace, jamás el cuerpo.

## Vinculación por código (T8)

Un contacto escribe `VINCULAR <código>` (6 dígitos, mayúsculas o minúsculas) y
el bot lo canjea en `POST /internal/whatsapp/vincular` con las mismas cuatro
cabeceras de firma del resto de endpoints internos. El código lo genera la
clínica desde su portal (`POST /mi-clinica/whatsapp/codigo`) y vive solo en
Redis de la API: vence a los 10 minutos, sirve una sola vez y un puñado de
intentos errados por teléfono lo bloquea. **No hay variables de entorno
nuevas** para esta función: usa el mismo Redis y los mismos dos secretos que
ya tenía el bot.

La sesión contiene credenciales de WhatsApp y queda fuera del repositorio por
configuración. No se debe copiar ni compartir.

## Desarrollo

```sh
bun run dev
bun run test
bun run check-types
```
