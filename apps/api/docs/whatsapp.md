# Bot de WhatsApp (prototipo)

Proceso independiente (`apps/whatsapp`) que atiende a las clínicas por WhatsApp usando Baileys, más los endpoints internos que la API expone para él. La especificación y las decisiones de producto están en `odd/tasks/whatsapp-bot.md`; este documento describe lo que existe hoy.

## Identidad

El bot no confía en el nombre que muestra WhatsApp. La identidad es el número, resuelto contra la allowlist `whatsapp_contacto`:

- `telefono_cifrado` (AES-256-GCM) y `telefono_hash` (blind index único), calculado siempre desde la forma canónica `+57` + 10 dígitos (`normalizeTelefono`).
- `clinica_id` obligatorio y `doctor_id` opcional: `NULL` significa teléfono compartido de recepción y el doctor se elige de una lista de esa clínica.
- `estado`: `pendiente`, `verificado` o `bloqueado`. **Solo `verificado` autoriza.**
- Un número desconocido y uno bloqueado reciben el mismo mensaje: no se puede enumerar la allowlist.

### Vinculación

1. Un usuario de la clínica genera un código en el portal: `POST /mi-clinica/whatsapp/codigo`. La clínica sale de la sesión, nunca del cuerpo. Código de 6 dígitos, 10 minutos, uno por clínica (emitir otro invalida el anterior).
2. Escribe desde WhatsApp `VINCULAR 123456`.
3. La API canjea el código con `GETDEL` (un solo uso incluso en concurrencia) y vincula el número.
4. Reglas: un número `verificado` en otra clínica **no se puede robar**; un contacto `pendiente` sí se mueve. Cada teléfono tiene un tope de 5 intentos fallidos por ventana de 10 minutos, contando también los teléfonos malformados.

## Endpoints internos

Todos son `@Public()` y comparten el mismo contrato de seguridad: cabecera `X-Whatsapp-Service-Token` comparada en tiempo constante, `X-Whatsapp-Timestamp` (±120 s), `X-Whatsapp-Nonce` de un solo uso en Redis y `X-Whatsapp-Signature` = HMAC-SHA256 de `telefono|timestamp|nonce` con `WHATSAPP_HMAC_SECRET`, secreto distinto del token de servicio.

| Endpoint | Para qué |
| --- | --- |
| `POST /internal/whatsapp/sesion` | Devuelve el JWT corto de la cuenta que la clínica designó (`clinica.usuario_bot_id`) |
| `POST /internal/whatsapp/llamada` | Registra que la clínica pide que el laboratorio la llame y encola el aviso |
| `POST /internal/whatsapp/auditoria` | Registra la intención manejada (sin cuerpo, sin nombres) |
| `POST /internal/whatsapp/vincular` | Canjea un código de vinculación |

Códigos de respuesta comunes: 503 si falta configuración (o Redis), 401 con mensaje idéntico para token, firma, ventana o nonce inválidos, 403 para un contacto no autorizado, 429 al superar el tope.

## Autorización del token emitido

El JWT lleva `scope: 'whatsapp-bot'` y el guard global lo rechaza fuera de una lista explícita de rutas de `/mi-clinica/*` (lecturas de órdenes, doctores, pacientes, servicios, cuentas de cobro, el PDF de una cuenta, y la creación de una orden). Un token filtrado no compra una sesión de portal completa.

El bot además limita por número (20 interacciones por minuto, 3 solicitudes de llamada al día) y solo responde chats 1:1: grupos, difusiones y sus propios mensajes se ignoran antes de cualquier límite.

## Cuentas de cobro

`GET /mi-clinica/cuentas-cobro/:id/pdf` sirve o genera el PDF respetando la tenencia de siempre: otra clínica, un borrador y una cuenta inexistente responden el mismo 404. El PDF viaja por la API, nunca como URL de Cloudinary. La generación está deduplicada en proceso y la descarga valida host, tipo y tamaño.

## Variables de entorno

En `apps/api`: `WHATSAPP_SERVICE_TOKEN`, `WHATSAPP_HMAC_SECRET`, `WHATSAPP_LAB_EMAIL` (opcional: sin ella la solicitud de llamada se registra sin notificar). En `apps/whatsapp`: `API_BASE_URL`, `WHATSAPP_SERVICE_TOKEN`, `WHATSAPP_HMAC_SECRET`, `WHATSAPP_AUTH_DIR` (sesión de Baileys, fuera del repositorio y en 0700), `WHATSAPP_PDF_HOSTS`.

## Límites conocidos

- Baileys no es oficial: usa un número desechable. La reconexión tiene backoff y tope para no provocar un baneo.
- La deduplicación del PDF y los límites del bot viven en memoria del proceso: con más de una instancia hacen falta candados distribuidos.
- La suite e2e del repositorio no puede pasar hoy: los specs consultan `doctor.usuario_id`, columna que el esquema actual no tiene. Es deuda anterior a este trabajo y está registrada aparte.
- `enviarPorEmail` (ruta de administración) sigue descargando `pdfUrl` sin la validación de host que ya tiene la ruta de clínicas.

## Rol de base de datos del bot

El bot consulta PostgreSQL con un rol exclusivo de mínimo privilegio: `whatsapp_bot` (se puede cambiar con `WHATSAPP_DB_USER`). Solo `LOGIN`, sin superusuario ni creación de bases/roles, con `default_transaction_read_only = on`, `statement_timeout = '5s'`, `idle_in_transaction_session_timeout = '10s'`, `work_mem = '16MB'` y `search_path` limitado a `public`.

El script de despliegue (tarea IA1) es idempotente y concede `SELECT` — solo `SELECT` — sobre el allowlist de tablas de negocio (`orden`, `detalle_orden`, `estado_orden`, `cuenta_cobro`, `cuenta_cobro_orden`, `pago`, `doctor`, `paciente`, `paciente_doctor`, `servicio`, `clinica`), con `GRANT CONNECT` a la base y `USAGE` en `public`. No hay `GRANT ALL`, ni escrituras, ni secuencias; cualquier privilegio heredado se revoca en cada corrida. Quedan denegadas `usuario`, `sesion_refresco`, `whatsapp_contacto`, `whatsapp_sesion_auditoria`, `whatsapp_llamada`, `migrations`, `historial_estado_orden`, `rol`, `contenido_web`, `envio_cuenta_cobro` y `metodo_pago_bancario`.

Cada tabla concedida tiene `ROW LEVEL SECURITY` con una política `FOR SELECT` de la clínica del contacto verificado (GUC `app.clinica_id`, fijado con `SET LOCAL` por el pool del bot). Las tablas con `clinica_id` filtran directo; `orden` llega a la clínica vía su doctor, `detalle_orden` vía la orden, `pago` y `cuenta_cobro_orden` vía la cuenta de cobro, `paciente` y `paciente_doctor` vía el doctor; `servicio` y `estado_orden` son catálogos globales legibles solo con contexto de clínica. No se usa `FORCE ROW LEVEL SECURITY`: el usuario de la API es dueño de las tablas y sigue intacto.

```sh
bun run db:bot-role            # crear/converger el rol
bun run db:bot-role -- --rotate  # además re-aplica la contraseña
```

Conexión administrativa: `WHATSAPP_DB_ADMIN_URL` si existe, si no las `DATABASE_*` de la API. `WHATSAPP_DB_PASSWORD` es obligatoria y nunca se imprime ni se escribe en archivos. Si la conexión no tiene `CREATEROLE`, el script termina con código distinto de cero y le dice al operador exactamente qué ejecutar como administrador.
