# Conversación real en el bot de WhatsApp

C1–C3. Continúa `whatsapp-ia.md` (IA1–IA11) y `whatsapp-bot.md` (T1–T13).

## Specs

**S1 — El entendimiento es del modelo; la autorización es del código.**
Texto del usuario: "Tenemos que guiar al bot para que no sea determinista, hay que darle unas cuantas habilidades de entender una conversación real".
Cualquier frase puede expresar una intención y traer los datos: el modelo interpreta, extrae y propone. Lo que nunca pasa por el modelo: de qué clínica son los datos (sale del contacto verificado), si se puede escribir (regla del código), y cuándo se escribe (solo tras confirmación literal). Dejar de ser determinista no es darle el volante.

**S2 — Se entiende la orden por paciente, no solo por número.**
Texto del usuario: "te pueden llegar mensajes tipo: en la orden de Sara Jimenez ya no vamos a hacer el diente 42".
Un nombre de paciente identifica sus órdenes. La búsqueda ignora mayúsculas y tildes y acepta el nombre parcial. Si hay más de una orden, se pregunta cuál por su estado y su fecha, sin listas numeradas. Si no hay ninguna, se dice y se ofrecen las que sí existen de ese paciente.

**S3 — Una orden existente se modifica hablando.**
Quitar o agregar dientes, cambiar cantidad o color, sobre una orden que la clínica pueda editar. El bot muestra qué va a cambiar (antes → después), pide confirmación y solo entonces escribe. Si la orden ya no admite cambios por su estado, lo dice con esas palabras y no escribe.

**S4 — No se pregunta lo que ya se dijo, en ningún paso.**
Texto del usuario: "la idea es que sea usado por humanos no técnicos que no entienden el flujo porque no lo conocen".
Un humano no técnico escribe de corrido: paciente, dientes, color, fecha y la corrección en el mismo mensaje. Cada turno reinterpreta el mensaje completo contra el borrador; nunca se reinicia lo que ya estaba.

**S5 — El que no conoce el flujo nunca queda sin salida.**
Toda respuesta que no pueda avanzar dice qué sí se entiende, con un ejemplo de frase, sin vocabulario técnico y sin enumerar opciones. Nunca "No entendí" a secas.

**S6 — Se identifica por número, por paciente o por ambos.**
Texto del usuario: "La orden se debe identificar tanto por paciente como por número, porque la gente no necesariamente se va a adaptar a una sola forma de escribir".
Cualquiera de las dos formas sirve y se aceptan juntas ("la orden 18 de Sara"). Un número manda sobre un nombre si los dos vienen y no coinciden: se dice la discrepancia antes de tocar nada.

**S7 — Se razona con fechas, y el modelo nunca las inventa.**
Texto del usuario: "Para la fecha, démosle ya sea la habilidad de que la consulte o pasémosla en el system prompt [...] ¿qué pasó con la orden que te hice el martes [...] el pedido del miércoles, qué pasó con él".
El prompt del sistema lleva siempre la fecha de hoy y la zona horaria del laboratorio, calculadas en código, nunca deducidas por el modelo. Las órdenes llevan su fecha de creación al modelo. Referencias relativas ("el martes", "del miércoles", "de ayer", "la de esta mañana") se resuelven contra esa fecha. Si hay varias de esa clínica en ese día, se ofrecen una por línea en lenguaje natural, con paciente y estado, sin numerar; la persona elige escribiendo el paciente, el número o el estado.

**S8 — Ventana de gracia para corregir, y una sola regla.**
Texto del usuario: "solo se pueden editar las órdenes cuando están recibidas, creadas y máximo en proceso. Pero ese proceso no puede llevar más de 5 horas. ¿Por qué pongo esa restricción? Para dar un tiempo de gracia [...] Eso es hacer perder material al laboratorio."
Editable: `creada`, `recibida`, `devuelta_correccion` (el laboratorio la devolvió justo para corregir) y `en_proceso` solo dentro de las 5 horas siguientes a haber entrado a ese estado, medido con `historial_estado_orden.fecha_cambio`. `en_entrega`, `terminada` y `cancelada` no. La ventana se cuenta desde la entrada a `en_proceso`, no desde la creación: el material se compromete cuando el trabajo empieza. La regla vive en un solo lugar (la API) y el bot y los portales la leen; el bot nunca la reimplementa.

## Tasks
| ID | Tarea | Specs | Ruta |
| --- | --- | --- | --- |
| C1 | Buscar órdenes por nombre de paciente (difuso, sin tildes) y responder su estado; herramienta nueva en el catálogo cerrado | S1,S2 | worker |
| C2 | Modificar una orden existente por conversación: quitar/agregar dientes, cantidad y color, con vista de antes→después y confirmación; `PUT /mi-clinica/ordenes/:id` en el allowlist del bot | S1,S3 | worker |
| C4 | Identificar la orden por número, por paciente o ambos, y responder referencias temporales ("el martes", "del miércoles") con la fecha de hoy en el prompt y la fecha de creación en los datos | S6,S7 | worker |
| C5 | Ventana de gracia de edición: `creada`, `recibida`, `devuelta_correccion` y `en_proceso` dentro de 5 h de haber entrado; expuesta como un campo en la orden para que bot y portales no dupliquen la regla | S8 | worker |
| C3 | Cada turno reinterpreta el mensaje completo contra el borrador, y toda salida sin avance dice qué sí se entiende con un ejemplo | S4,S5 | worker |

## Constraints

- **`apps/whatsapp` es desechable.** Es una preview con una librería no oficial (Baileys) para vender la idea; con la autorización del cliente se reemplaza por la API oficial de WhatsApp y esa carpeta se borra. Por eso **toda regla de negocio vive en `apps/api`**: ventana de edición, estados, qué se puede escribir, qué campos exige una orden, qué cuentas de cobro se pueden enviar, confirmación antes de escribir e idempotencia. En el bot solo queda el transporte: sockets, QR, LID, presencia, ritmo y redacción.
- Si un cambio futuro necesita una regla nueva, primero se pregunta dónde vive; la respuesta por defecto es la API.

- Las escrituras siguen yendo por la API con el token del bot; ninguna herramienta recibe `clinica_id`.
- El catálogo de herramientas sigue cerrado y probado: una herramienta nueva se agrega al test que fija el catálogo.
- Nada se escribe sin confirmación literal previa, y la idempotencia se mantiene.
- Voz llana: nada de vocabulario técnico ni nombres de funciones en los mensajes.

## Log

**L1 — pedido (textual):** "Tenemos que guiar al bot para que no sea determinista, hay que darle unas cuantas habilidades de entender una conversación real, porque te pueden llegar mensajes tipo: en la orden de Sara Jimenez ya no vamos a hacer el diente 42; y si el se queda en un estado determinista, nunca va a ser buena herramienta. Recuerda: la idea es que sea usado por humanos no tecnicos que no entienden el flujo porque no lo conocen"

**L2 — corrección (textual):** "La orden se debe identificar tanto por paciente como por número, porque la gente no necesariamente se va a adaptar a una sola forma de escribir. Para la fecha, démosle ya sea la habilidad de que la consulte o pasémosla en el system prompt. De manera que de pronto, si alguien te dice, ve, ¿qué pasó con la orden que. Que te hice el martes, que es de tal paciente [...] y puedes darle la lista de opciones en caso de que se hayan creado varias órdenes de esa clínica ese día. Entonces, tenemos que cambiar un poco cómo funciona el bot por dentro."

**L4 — decisión (textual):** "Si me lo preguntas a mí, solo se pueden editar las órdenes cuando están recibidas, creadas y máximo en proceso. Pero ese proceso no puede llevar más de 5 horas. ¿Por qué pongo esa restricción? Para dar un tiempo de gracia. Porque supongamos pasaron 2 días, la orden ya está en proceso, ya están terminando. Y van y le dicen: No es que me equivoqué, no era este diente, sino que era este otro. Eso es hacer perder material al laboratorio. Entonces, por lógica de negocio, hablo pues desde mi intuición: no debería poder permitirse una cosa de esas."

## Qué sobrevive al cambiar de transporte

El bot se reemplaza por la API oficial de WhatsApp y `apps/whatsapp` se borra. **Ninguna tabla se borra**: lo que se creó para el bot guarda datos de negocio.

| Se queda | Por qué |
| --- | --- |
| `whatsapp_contacto` | "¿este número es de esta clínica?" sigue existiendo; muere el OTP `VINCULAR`, porque la API oficial entrega el número ya verificado |
| `whatsapp_llamada` | es una solicitud real del laboratorio, no un artefacto de transporte (conviene añadir `canal`) |
| `whatsapp_sesion_auditoria` | auditoría de accesos; una integración oficial también la necesita |
| `clinica.usuario_bot_id` | la integración sigue actuando a nombre de una cuenta designada |
| `configuracion_bot` | el nombre visible es producto, editable por el administrador |

| Depende de una decisión | Por qué |
| --- | --- |
| rol `whatsapp_bot`, grants y RLS | sobrevive si se mantiene "el modelo elige entre herramientas cerradas sobre SQL restringido"; muere si la integración oficial pasa a flujos fijos |

Ninguna migración se revierte para "limpiar": `down()` existe, pero destruiría solicitudes de llamada, auditoría y el mapeo número→clínica. Si una columna queda sin uso, se borra con una migración que primero verifica que esté vacía.

Regla para lo nuevo: si el dato importa dentro de un año, la tabla se nombra por negocio (`solicitud_llamada`, `canal_contacto`), no por transporte (`whatsapp_*`). Lo efímero (nonces, límites, idempotencia) vive en Redis y no toca el esquema.
