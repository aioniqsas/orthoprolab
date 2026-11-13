# El bot conversa como agente y recuerda la conversación

Objetivo: dejar los flujos guiados por regex y pasos; el modelo conduce con herramientas de la API y recuerda la conversación en Redis (24 h desde la última interacción). Rama `feat/whatsapp-bot`. Runner: `bun test` en `apps/whatsapp` (Vitest en `apps/api`). Test-first deshabilitado por el humano (ver whatsapp-bot.md); una ronda adversarial por tarea. Entrega: PRs encadenados por fase, sin merge hasta cerrar la fase.

## Specs

**S1 — Memoria de la conversación en Redis, 24 h desde la última interacción.**
Texto del usuario: "sí quiero que sea más inteligente y que pueda conservar memoria de la conversación. No sé si con Bailey hay alguna forma de leer los últimos 10 mensajes, por ejemplo, de manera que se le pueda dar un mejor contexto." y "Nos vamos con Redis y la TTL de 24 horas está bien, pero entonces va a aplicar desde la última interacción con el bot, es decir, cada interacción invalida la cache antigua y genera una nueva."
Aceptación: cada mensaje del usuario y cada respuesta del bot quedan en Redis por número, también los que atiende un flujo; el TTL de 86 400 s se renueva en cada interacción; la memoria sobrevive a un reinicio del bot; al modelo le llegan los últimos 10 intercambios (supuesto: "10 mensajes" = 10 pares usuario/bot). Supuesto: con Redis caído el bot sigue respondiendo sin memoria, nunca se cae.
No se usa `fetchMessageHistory` de Baileys: es asíncrono, depende del teléfono y no existe en la API oficial (decisión del 2026-11-13, ver Log L2).

**S2 — Sin flujos: el modelo conduce la conversación.**
Texto del usuario: "lo que quiero es que no vaya por flujos, sino que sea más inteligente y operativo. Sé que es darle un poco más de libertades, pero si nos fijamos en los permisos que tiene el rol de la gente en la base de datos, no estamos corriendo mayor riesgo, ya que no puede hacer operaciones destructivas".
Aceptación: el modelo decide qué hacer con herramientas que llaman a la API (consultar, borrador, crear, editar, PDFs, llamada); las reglas (ventana de edición, campos obligatorios, permisos por clínica) las aplica la API y el modelo explica la negativa con sus palabras.

**S3 — Las restricciones de infraestructura se quedan.**
Texto del usuario: "pero sí que hay las restricciones de que no puede dar información de en donde corre, lenguaje, despliegue, etcétera. Eso se queda."
Aceptación: las negativas de infraestructura, identidad y suplantación siguen pasando sus tests actuales.

**S4 — Confirmación antes de crear o editar (restricción que se mantiene).**
Regla previa de whatsapp-conversacion (confirmación literal): ninguna orden se crea ni se modifica sin que el usuario confirme el resumen.

**S5 — Cuando el modelo no responde, mensaje fijo (decisión del 2026-11-13, Log L4).**
Aceptación: si el modelo falla, tarda o no está configurado, el bot responde con un texto fijo que ofrece reintentar; no cae a flujos ni a menú numerado, y no deja la conversación muda.

## Tasks
| ID | Tarea | Specs | Ruta |
| --- | --- | --- | --- |
| T1 | Memoria en Redis (cliente Redis de Bun), TTL deslizante, registrar todos los turnos, degradar sin Redis | S1 | inline — hecho |
| T2 | Mapa del motor actual (flujos, herramientas, endpoints) para diseñar el agente | S2–S4 | hecho — `odd/tasks/whatsapp-t2-mapa.md` (198 líneas), sin cambios de código |
| T3 | Motor de agente: el modelo es la única entrada (sin `prechequeoRuta` ni `flows.handle`), herramientas sobre la API, puerta de confirmación en código, mensaje fijo si el modelo falla | S2–S5 | hecho — `ClienteGroq.manejar`, catálogo/validación y ejecutores `atenderRuta` conservados; ver L5 |
| T4 | Limpieza del despacho por pasos: retirar el menú numerado, `menu.ts`, `state.ts`, el prechequeo por regex y sus pruebas; reubicar estado/mensajes y retirar despacho por pasos en `flows.ts`; **conservar** ejecutores/herramientas (`write-flows.ts`, `orden-existente.ts`, `api.ts`, `herramientas.ts`) y helpers en uso; actualizar `apps/whatsapp/README.md` y `apps/api/docs/whatsapp.md` | S2, S5 | hecho — ver L6 |

## Log

**L1 — pedido (textual, 2026-11-13):** "Bueno, lo que quiero es que no vaya por flujos, sino que sea más inteligente y operativo. Sé que es darle un poco más de libertades, pero si nos fijamos en los permisos que tiene el rol de la gente en la base de datos, no estamos corriendo mayor riesgo, ya que no puede hacer operaciones destructivas, pero sí que hay las restricciones de que no puede dar información de en donde corre, lenguaje, despliegue, etcétera. Eso se queda. Pero sí quiero que sea más inteligente y que pueda conservar memoria de la conversación. No sé si con Bailey hay alguna forma de leer los últimos 10 mensajes, por ejemplo, de manera que se le pueda dar un mejor contexto."

**L2 — decisión (textual, 2026-11-13):** "Nos vamos con Redis y la TTL de 24 horas está bien, pero entonces va a aplicar desde la última interacción con el bot, es decir, cada interacción invalida la cache antigua y genera una nueva."
Evidencia: Baileys 7.0.0-rc.6 trae `fetchMessageHistory(count, oldestMsgKey, oldestMsgTimestamp)`, que solo pide el historial al teléfono; llega luego por `messaging-history.set`. `makeInMemoryStore` ya no existe. Hoy `StoreLlm` (`apps/whatsapp/src/llm.ts:333`) guarda 8 turnos en un Map de 15 min y solo registra los turnos que pasan por el modelo. Bun 1.4.2 trae cliente Redis propio: sin dependencia nueva. Redis en `compose.yaml` (127.0.0.1:6380, `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` en la API).


**L3 — T1/S1 memoria en Redis (2026-11-13):**
- `apps/whatsapp/src/memoria.ts`: `MemoriaConversacion` con cliente Redis nativo de Bun (`Bun.RedisClient`, sin dependencia nueva). Clave por número `whatsapp:memoria:<telefono>` (lista JSON de turnos user/assistant) y `whatsapp:memoria:tokens:<telefono>` para tokens acumulados. `registrarIntercambio` hace RPUSH + LTRIM a 20 mensajes (10 intercambios) + EXPIRE 86400 s en cada interacción (TTL deslizante). URL desde `WHATSAPP_REDIS_URL`/`REDIS_URL` o `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`.
- `apps/whatsapp/src/llm.ts`: `StoreLlm` pasa a ser async y se respalda en `MemoriaConversacion` (historial desde Redis, tokens persistidos con TTL 24 h) con caché en memoria y degradación silenciosa; `MAX_TURNOS_HISTORIAL` sube a 10 intercambios. `ClienteGroq.manejar` y sus lecturas/escrituras de estado quedan `await`.
- `apps/whatsapp/src/main.ts`: instancia `MemoriaConversacion` y la inyecta en `StoreLlm`; registra cada intercambio (mensaje del usuario y respuesta del bot, texto/caption de documentos, `[audio]`/`[medio]` cuando aplica) en todas las rutas de respuesta, incluidos flujos, rutas del modelo, vinculación, identidad/config/rate-limit y medios.
- Degradación: sin cliente o ante cualquier fallo de Redis las operaciones devuelven vacío/0 sin lanzar, así que el bot responde sin memoria y no se cae. Persistencia: una instancia nueva lee la misma clave en Redis (sobrevive reinicio).
- Pruebas: `apps/whatsapp/test/memoria.test.ts` cubre registro por número, turnos de flujo, renovación del TTL 86400 s, recorte a 10 intercambios, supervivencia a reinicio (nueva instancia/mismo Redis), degradación con Redis caído (cliente null y cliente que falla) y que el modelo recibe los últimos 10 intercambios del historial persistido; `apps/whatsapp/test/llm.test.ts` adaptado al `StoreLlm` async.
- Variable nueva: ninguna. Usa las mismas variables de Redis (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`, con soporte opcional de `WHATSAPP_REDIS_URL`/`REDIS_URL`).

**L4 — decisión (2026-11-13):** cuando el modelo no responde, el bot no cae a flujos: "Sin respaldo: mensaje fijo cuando el modelo falla" (opción elegida por la persona). Se agrega S5 y T3 incluye ese mensaje fijo; el respaldo determinista actual (menú numerado y `flows.handle`) desaparece junto con el prechequeo por regex.
Evidencia del orquestador (no de OpenCode): con Redis muerto, `registrarIntercambio` bloqueaba 31 169 ms antes de rechazar y la respuesta se retrasaba ese tiempo; se corrigió acotando cada operación en `PLAZO_REDIS_MS = 250` y ahora tarda 251 ms. Verificado contra el Redis vivo en 127.0.0.1:6380: TTL real 86400, tope 20 mensajes, otra instancia lee, números aislados.

**L5 — T3/S2-S5 motor de agente (2026-11-13):**
- `apps/whatsapp/src/llm.ts`: se eliminó `prechequeoRuta` del camino de `ClienteGroq.manejar` (la función/export se conserva para pruebas directas). Se agregó `FALLO_MODELO` (texto fijo de reintento, sin menú numerado) y todos los fallos del proveedor (excepción/timeout, HTTP!=200, respuesta malformada, sin respuesta utilizable tras las rondas) devuelven `FALLO_MODELO`. Catálogo cerrado de herramientas y validación estricta (`herramientas.ts`, `llm.ts`) sin cambios.
- `apps/whatsapp/src/main.ts`: el texto autenticado va directo al modelo; se removieron `prechequeoRuta` y el despacho/fallback `flows.handle` del camino normal. Las negativas S3 (infraestructura/identidad/suplantación, con `clasificarNegativa`/`redactar`) se responden antes del modelo; sin `GROQ_API_KEY` o con `WHATSAPP_LLM_ENABLED=false`/fallo se responde `FALLO_MODELO`. Las rutas de intención devueltas por el modelo se ejecutan vía `flows.atenderRuta` (ejecutores conservados para T4); medios siguen por aviso de medio.
- `apps/whatsapp/src/confirmacion.ts` (nuevo): `PuertaConfirmacion` con estado explícito y verificable por teléfono (`proponer` resumen en turno previo, `confirmar` con "sí"/"no", `confirmada` por tipo) para S4; sin confirmación previa verificada la escritura no se ejecuta.
- `apps/whatsapp/src/write-flows.ts`, `apps/whatsapp/src/orden-existente.ts`: integración de la puerta en crear/editar (proponer al mostrar resumen, exigir confirmación verificada antes de `api.crearOrden`/`api.actualizarOrden`, consumir/re-proponer al cancelar o fallar). Flujos/`menu.ts`/`state.ts` y sus pruebas se conservan (suite completa verde); T4 los retirará.
- Pruebas: `apps/whatsapp/test/t3.test.ts` (S5: no configurado/`FALLO_MODELO` sin menú, timeout, HTTP, malformada, sin respuesta útil; S2: camino normal consulta al modelo aunque `prechequeoRuta` coincidiría; S4: puerta explícita y bloqueo/permiso de escritura crear/editar). Ajustes por comportamiento especificado en `test/llm.test.ts` y `test/sabotaje-vivo.test.ts`.
- Variable nueva: ninguna. No se leyó/editó `.env*`. No se tocó documentación. Verificación: `bun test` 409 pass, 0 fail, 3161 expect() (23 files), exit 0; `bun run check-types` exit 0 (`apps/whatsapp`).

**L6 — T4/S2,S5 limpieza del camino viejo (2026-11-13):**
- Borrados: `apps/whatsapp/src/menu.ts` (menú numerado/saludo viejo) y `apps/whatsapp/src/state.ts` (módulo de máquina de pasos). Reemplazos: `apps/whatsapp/src/mensajes.ts` (`SALUDO`, `PREGUNTA_ACLARAR` sin menú numerado) y `apps/whatsapp/src/estado.ts` (`ConversationStore`, `UltimaOrdenVista`) para los ejecutores que siguen usando estado conversacional.
- `apps/whatsapp/src/flows.ts`: se retiró el despacho por pasos/menú (`handle`, `handleInterno`, `intencionDe`, cancelación/ayuda por paso, `buildMenu`); se conservan `ReadFlows.atenderRuta`, `media`, `formatoOrden`, `nombreArchivoSeguro`, constantes/preguntas y ejecutores de lectura/PDF/llamada usados por el agente.
- `apps/whatsapp/src/llm.ts`: se eliminó `prechequeoRuta` y sus helpers/uso exclusivo (`normalizar`, `esPedidoDeOrden`, `numeroDeOrdenDeTexto`, import de `numeroEnPalabras`); se conservan `Ruta`/`rutaDe`, validación, redacción, catálogo, `manejar` y comportamiento S3/S4/S5. `apps/whatsapp/src/main.ts`, `write-flows.ts`, `orden-existente.ts` actualizan imports a `mensajes`/`estado`.
- No retirados (en uso): ejecutores/herramientas `write-flows.ts`, `orden-existente.ts`, `api.ts`, `herramientas.ts`, `confirmacion.ts`, y helpers vivos (`formatoOrden`, `SALUDO`/`PREGUNTA_ACLARAR`, `ConversationStore`/`UltimaOrdenVista`, `PASO_CAMBIO`, `repetirPaso`, etc.); sin duplicación.
- Pruebas borradas/reducidas (solo menú numerado, pasos/dispatch de `ReadFlows.handle` o `prechequeoRuta` por regex): bloques de menú/escape/cancelación/"sin modelo → menú" en `ia7.test.ts`, `usabilidad.test.ts` (conservados `extraerNumero` y `media` adaptados), `flows.test.ts` (conservados `formatoOrden`/`nombreArchivoSeguro`; lecturas/PDF adaptadas a `atenderRuta`), `pure.test.ts` (conservados `ConversationStore`, seguridad/lid/reconexión), `llamada.test.ts` (adaptada a enrutado `pedir_llamada`), `write-flows.test.ts` (entrada por `atenderRuta` en vez de opción 4), `ia11.test.ts` y `numeros.test.ts` (quitadas aserciones `prechequeoRuta`; conservados ejecutores/parseo), `t3.test.ts` (S2 sin llamar `prechequeoRuta`), `conversacion.test.ts` (turnos por `atenderRuta`/ejecutor, sin `prechequeoRuta`/`handle`). Conservadas/adaptadas pruebas S3/S4/S5 y cobertura viva de ejecutores (`sabotaje-vivo`, `prompt`, `llm`, `t3`, `conversacion`, `edicion`, `continuidad`, `entrega`, `write-flows`, etc.).
- Documentación: `apps/whatsapp/README.md` y `apps/api/docs/whatsapp.md` describen agente sin flujos/menú numerado, memoria en Redis (TTL 24 h deslizante, últimos 10 intercambios, degrada sin Redis), mensaje fijo si el modelo falla/no está configurado y confirmación explícita en código.
- Variable nueva: ninguna. No se leyó/editó `.env*`. No se tocó `apps/api/src` ni otros docs. Verificación: `bun test` 378 pass, 0 fail, 2999 expect() (23 files), exit 0; `bun run check-types` exit 0 (`apps/whatsapp`).

**L6 — corrección T4 (2026-11-13), hallada por el orquestador:**
- Defecto 1: el copy seguía prometiendo el menú retirado (`LIMITE_COSTO` en `llm.ts` y varios textos de `flows.ts` decían "escribe 0 y volvemos al menú").
- Defecto 2: el escape determinista había desaparecido de `main.ts`, así que "0/cancelar/menú/volver/inicio" no reiniciaba nada y una confirmación pendiente no se podía cancelar por esa vía.
- Corrección: `ES_ESCAPE` + `REINICIO` en `main.ts:69-70,283-288`; el escape no llama al modelo, limpia `ConversationStore`, `StoreLlm` y las confirmaciones pendientes, y responde un texto fijo. Todo el copy que prometía menú se reescribió. Prueba nueva: "escape determinístico (reinicio sin modelo)".
- Verificación del orquestador: `bun test` 380 pass, 0 fail (24 files), `check-types` exit 0; `grep` confirma que ya no queda copy con "volver al menú".
- Riesgo asumido: el escape reinicia el contexto completo del teléfono, y `PREGUNTA_AYUDA` conserva "0 = no" para rechazar la llamada (semántica distinta). Queda anotado, no corregido.

**Slices de entrega (2026-11-13):** `977b66c` memoria en Redis (S1, 521 líneas) · `3c9766a` motor de agente y limpieza del despacho (S2–S5, 715 inserciones / 833 borrados) · este commit de documentación. T3 y T4 no se pueden separar retroactivamente porque comparten hunks en `main.ts`, `llm.ts`, `write-flows.ts` y `orden-existente.ts`; por eso el slice del medio es grande y conviene revisarlo con el mapa de T2 al lado. Sin merge ni push: los PRs encadenados los abre la persona.
