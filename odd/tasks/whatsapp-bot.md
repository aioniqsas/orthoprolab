# Prototipo: bot de WhatsApp para clínicas

Prototipo con Baileys sobre un número desechable. Atiende a clínicas y al laboratorio: estado de pedido, control de trabajos, cuenta de cobro emitida y creación de órdenes de una línea, con la identidad resuelta por número de teléfono.
Usuario objetivo: quien no es alfabetizado digitalmente y prefiere escribir a un número antes que usar el portal.

## Specs

**S1 — Vínculo número ↔ persona: allowlist + OTP opcional.**
Un número desconocido nunca se procesa: no entra al bot sin vínculo previo. El vínculo se crea (a) por pre-registro de quien tiene autoridad —admin de la clínica o laboratorio— o (b) por auto-vinculación con código OTP de 6 dígitos generado desde el portal autenticado y enviado como `VINCULAR <código>` desde el WhatsApp. El `pushName` de WhatsApp no es identidad. Preguntar "¿quién eres?" en el mensaje no autentica nada.

**S2 — Granularidad: mixta, personal y compartido.**
`whatsapp_contacto.doctor_id` con valor = número personal 1:1 (no se pregunta el doctor). `doctor_id` NULL = número compartido de recepción (se elige el doctor de una lista numerada de los doctores de esa clínica).

**S3 — Alcance derivado del contacto, jamás del mensaje.**
`clinica_id` sale del contacto verificado. Ninguna respuesta ni PDF puede referirse a otra clínica, aunque el texto lo pida.

**S4 — Lectura incluye las cuentas de cobro.**
Texto del usuario: "las cuentas de cobro entrarían en la parte de lectura. [...] Lo que pediste es enviar una cuenta de cobro cuando la clínica la solicita, no crearla ni registrar pagos. Es una lectura: el bot manda el PDF de una cuenta que el laboratorio ya emitió. El portal de clínicas ya aplica las mismas reglas: listCuentasCobro excluye los borradores (estado != 'borrador') y getCuentaCobro rechaza cuentas de otra clínica. El bot reutilizaría esas reglas. [...] Lo que sí dejaría fuera es registrar pagos o subir comprobantes por chat."

**S5 — Creación de órdenes: una línea por conversación.**
Texto del usuario: "Una orden de una sola línea por conversación. Varias líneas, después." / "El paciente se elige de la lista del doctor o se crea con cédula y nombre, reutilizando la lógica actual." / "Dientes: el bot acepta los números ("26 27") y los repite con nombre en el resumen ("26 – primer molar superior izquierdo"), aprovechando lo que ya hace el odontograma para nombrar los dientes. Así se ve el error antes del CONFIRMAR." / "Fallback: si la persona se enreda, el bot ofrece "Escribe 0 para que el laboratorio te llame", y se notifica al admin."

**S6 — Escritura con resumen + CONFIRMAR.**
Ninguna orden se crea sin que el bot muestre el resumen completo (doctor, paciente, servicio, cantidad, dientes con nombre, color) y reciba `CONFIRMAR`. Cualquier otro mensaje cancela o corrige.

**S7 — Identidad del bot ante la API: cuenta de clínica designada.**
Cada clínica designa una cuenta de portal; el bot obtiene para ella un JWT de vida corta desde un endpoint interno protegido por secreto de servicio, y llama a `/mi-clinica/*` como esa cuenta. No se agregan roles ni guards nuevos: la tenencia sigue saliendo de `resolveClinicaId`.

**S8 — Datos personales.**
El teléfono se guarda cifrado (AES-256-GCM) con blind index para búsqueda, igual que la cédula. La auditoría guarda intención, contacto y resultado, no el cuerpo completo del mensaje: la conversación contiene datos de paciente que no se persisten en claro.

**S9 — Número desechable.**
Baileys corre sobre un número sin valor comercial; si WhatsApp lo banea no se pierde la línea del laboratorio. La sesión de Baileys (`auth_info`) vive fuera del repo y está ignorada por git.

**S10 — Blindaje del endpoint interno: conocer el secreto no basta.**
Texto del usuario: "Vamos a hacer el blindaje necesario para que aun sabiendo el secreto, no se pueda pedir sesión de la clinica."
Cuatro capas independientes, de modo que filtrar una no abra la puerta:
1. **Alcance del token.** El JWT que emite el endpoint lleva `scope: 'whatsapp-bot'` y solo es aceptado en las rutas del bot; el guard global rechaza ese token en cualquier otra ruta. Un secreto filtrado no compra una sesión de portal completa.
2. **Firma por solicitud.** Además del token de servicio, cada llamada envía un HMAC de `telefono|timestamp|nonce` con `WHATSAPP_HMAC_SECRET`, distinto del token de servicio, con ventana de ±120 s y nonce de un solo uso en Redis. Dos secretos en dos lugares: saber el de ruteo no alcanza.
3. **Límite por clínica.** Máximo de sesiones emitidas por clínica por minuto y por contacto por ventana; se responde 429 y se registra el intento.
4. **Elegibilidad y auditoría.** Solo contactos `verificado`, nunca `bloqueado`, con clínica activa y cuenta designada; cada emisión se registra (clínica, contacto, resultado) sin datos personales, para detectar barridos.

**S11 — Flujo para alguien con poca soltura digital.**
Decisiones del usuario, textuales: "El 0 debe significar siempre lo mismo. Dejaría 0 como 'volver al menú' en todas partes, pasaría 'que me llamen' a la opción 5, y haría que escribir 'ayuda' pregunte antes: '¿Quieres que el laboratorio te llame? 1 sí / 0 no'." / "La confirmación debería ser 1 = crear, 0 = cancelar, y además aceptar 'sí', 'si' y 'confirmar' sin importar mayúsculas. Lo que protege es ver el resumen, no la palabra exacta. Y si no entiende la respuesta, debe decirlo ('No entendí. Escribe 1 para crear o 0 para cancelar') en vez de repetir el resumen en silencio." / "Con audios, imágenes o stickers, responder 'No puedo escuchar audios, escríbeme por favor' y repetir la pregunta del paso en curso, no el menú." / "'Paso 3 de 6', aceptar números dentro de texto ('orden 1234', '#1234') y el menú en lenguaje llano".
Sin cambios: allowlist, `clinica_id` desde el contacto, resumen antes de escribir e idempotencia.

**S12 — Repetir trabajo y color, no la orden entera.**
Texto del usuario: "El análisis asume que 'la mayoría de las órdenes repiten al mismo paciente con los mismos dientes', pero no hay datos que lo respalden [...] Lo que sí suele repetirse es el tipo de trabajo y el color del mismo doctor. Propondría '¿Mismo trabajo y color que tu última orden (corona zirconio, A2)? 1 sí / 2 no': se ahorran 3 pasos, y paciente y dientes se siguen preguntando siempre."

**S13 — Sin menú numerado: el modelo enruta la conversación.**
Texto del usuario: "ya no necesitamos tener un menú de opciones, sino simplemente darle un listado no ordenado y decirle: Mira, estas son mis funcionalidades. Y ya dependiendo de lo que responda el usuario, bien sea la opción A, la opción 1, o quiero hacer esto, quiero hacer aquello, que el modelo enrute" / "estamos haciendo que parezca un bot. La idea es que parezca una persona detrás".
Reglas: el saludo lista las capacidades en una frase natural, sin números ni incisos. Cualquier entrada del usuario —«1», «la A», «quiero ver mi pedido», «mándame la cuenta»— la enruta el modelo a una de las cinco acciones. Los flujos deterministas siguen siendo los ejecutores: el modelo elige la puerta, no escribe ni confirma. La escalera de escape pasa a palabras naturales (`menú`, `volver`, `inicio`, y `0` como alias) y vuelve al saludo. Sin modelo disponible, el bot responde con el menú numerado como red de seguridad: nunca queda mudo.

## Tasks

| ID | Tarea | Specs | Ruta |
| --- | --- | --- | --- |
| T1 | Migración `whatsapp_contacto` (teléfono cifrado + blind index, `clinica_id`, `doctor_id` nullable, `estado`, `verificado_en`) y entidad | S1,S2,S8 | worker |
| T2 | Servicio de identidad: normalizar E.164 (+57), buscar por blind index, resolver `clinica_id`/`doctor_id`, rechazar y auditar desconocidos | S1,S2,S3 | worker |
| T3 | Endpoint interno `POST /internal/whatsapp/sesion` (secreto de servicio → JWT corto de la cuenta designada) + límites | S7 | worker |
| T4 | `apps/whatsapp`: proceso Baileys, sesión en disco ignorada, menú numerado, estado por contacto con expiración | S1,S9 | worker |
| T5 | Flujos de lectura: estado de pedido, control de trabajos (PDF), cuenta de cobro emitida (PDF). Rutas reales: `GET /mi-clinica/ordenes/:id`, `GET /mi-clinica/ordenes/:id/control-trabajos`, `GET /mi-clinica/cuentas-cobro/:id` y `GET /mi-clinica/cuentas-cobro/:id/pdf`. La lista de pacientes es `GET /mi-clinica/pacientes?doctorId=:id`, no `/doctores/:id/pacientes`. | S3,S4 | worker |
| T6 | Flujo de escritura: orden de una línea con resumen + `CONFIRMAR`; extraer la tabla de nombres FDI a `@repo/api-client` | S5,S6 | worker |
| T7 | Fallback `0` → aviso al admin; rate limit por número; auditoría sin texto plano | S5,S8 | worker |
| T8 | OTP de vinculación desde el portal (código 6 dígitos, 10 min, un uso) | S1 | worker |
| T9 | Docs: `apps/api/docs/whatsapp.md`, `docs/portals.md`, `.gitignore` de la sesión | S9 | inline |

| T10 | Blindaje del endpoint interno: token de alcance `whatsapp-bot` con allowlist de rutas, HMAC por solicitud con nonce de un solo uso, límite por clínica y auditoría de emisiones | S10 | worker |

| T11 | Ruta de PDF de cuenta de cobro para clínicas (`GET /mi-clinica/cuentas-cobro/:id/pdf`, generar o servir), para que el bot no descargue desde una URL de Cloudinary ni dependa de un enlace público | S4 | worker |

| T12 | Bloque de usabilidad: `0` = volver al menú en todo el flujo, "que me llamen" pasa a `5`, `ayuda` confirma antes de llamar, confirmación tolerante (`1`/`sí`/`si`/`confirmar`), "No entendí…" explícito, respuesta a audios/imágenes/stickers repitiendo la pregunta del paso, "Paso X de Y", dígitos dentro del texto y menú en lenguaje llano | S11 | worker |
| T13 | Precarga de trabajo y color desde la última orden del doctor: "¿Mismo trabajo y color que tu última orden (`corona zirconio`, `A2`)? 1 sí / 2 no"; paciente y dientes se preguntan siempre | S12 | worker |

| IA7 | Quitar el menú numerado como entrada: saludo conversacional con las capacidades, enrutado por el modelo para las cinco acciones, escape con palabras naturales y menú numerado solo como respaldo cuando no hay modelo | S13 | worker |

**Requisitos derivados de la ronda adversarial de T1 (obligatorios en T2):**

- Toda lectura y escritura de `telefono_hash` usa `normalizeTelefono` del módulo `whatsapp`, canónica `+57` + 10 dígitos. `blindIndex` por sí solo (`normalizeCedula`) conserva `+` y paréntesis, así que `+573001234567`, `573001234567`, `3001234567` y `(300) 1234567` producen hashes distintos.
- El teléfono solo cambia por `save()` sobre la entidad, nunca por `Repository.update()` ni `QueryBuilder.update()`: esos caminos no ejecutan los listeners y dejan `telefono_hash` viejo.
- La violación del índice único (`telefono_hash`) se traduce a 409 con mensaje claro, no se propaga el error crudo de Postgres.

## Entrega

Una sola rama: `feat/whatsapp-bot`, con un commit por tarea (decisión del usuario: no se abren ramas por rebanada).

Al publicar, la revisión se puede cortar por rango de commits sin reescribir historia:

| Rebanada | Commits |
| --- | --- |
| Allowlist e identidad | `de648db` T1, `a9f15e9` T2 |
| Sesión corta para el bot | T3 |
| Runtime de Baileys y lectura | T4, T5 |
| Creación de órdenes y salvaguardas | T6, T7 |
| OTP y documentación | T8, T9 |

El soft delete (`odd/tasks/soft-delete.md`) viaja en la misma rama por la misma decisión, aunque toca tablas de todo el producto.

**L7 — proceso (textual):** "De ahora en adelante, vamos a desactivar Test Drive en development ya que, como estamos haciendo es de testing adversarial. Vamos a ahorrar así mucho en token y en tiempo de desarrollo."
Se desactiva el ritual test-first: no se captura evidencia RED ni se revierte producción para probar que un test falla. Los tests se siguen escribiendo junto con la implementación, porque son los que fijan cada defecto que la ronda adversarial encuentre; lo que se elimina es la ceremonia, no la red de regresión. La ronda adversarial única por tarea se mantiene.

## Log

**L1 — pedido original (textual):**
"Bueno, viene lo importante. Vamos a mergear primero estos cambios a main. No te preocupes por lo de la cuenta, pues es una base de datos local, no afecta nada. Ahora vamos a hacer algo: vamos a hacer un prototipo de un bot para WhatsApp. Ya que es un prototipo, podemos utilizar la aplicación de Bailey y este bot de WhatsApp lo que se va a encargar es de recibir. La creación de órdenes y el informe de estado de pedidos, el envío de cuentas de cobro y de control de trabajo. Cuando desde una clínica lo soliciten. Pero antes de tocar código, ¿cómo vamos a manejar la autenticación? Para saber quién es la persona que nos está escribiendo y vincularla dentro de la base de datos, en caso de que no sea alguien que tenga cuenta. Porque puede pasar que de pronto desde la clínica o desde el laboratorio no sea una persona alfabetizada digitalmente y le quede más fácil escribir a un número de WhatsApp. No sé cómo podemos manejarlo. ¿Crees que sería bueno tener una tabla de números permitidos, asociarlos a una clínica y no sé, de pronto relacionarlos a un doctor o de pronto pedir el nombre del doctor en el mensaje?"

**L2 — decisiones del usuario:**
- Vínculo: "Allowlist + OTP opcional".
- Granularidad: "Mixto: personal y compartido".
- Línea: "Número desechable".
- Alcance y corrección (textual): "Elegiría Lectura + órdenes con confirmación, con una corrección: las cuentas de cobro entrarían en la parte de lectura. [...] La creación de órdenes es lo difícil, no lo riesgoso. [...] Primera versión, en resumen: Estado de un pedido (Lectura) / Enviar control de trabajos (PDF) (Lectura) / Enviar cuenta de cobro emitida (PDF) (Lectura) / Crear orden de una línea (Escritura con resumen + CONFIRMAR)."

**L3 — identidad del bot ante la API:** "Cuenta de clínica designada".

**L4 — verificación previa (no decisiones):** `listCuentasCobro` filtra `borrador` y `getCuentaCobro` filtra por `clinicaId` en `apps/api/src/mi-clinica/mi-clinica.service.ts`; `createOrden` valida el doctor contra la clínica del llamante; `doctor` y `usuario` son entidades distintas.

**L6 — ronda adversarial de T1 (una, la única permitida):**

- Confirmado (ejecutado): `blindIndex` reusa `normalizeCedula`, que solo quita espacios, puntos y guiones. Formatos del mismo móvil colombiano dan hashes distintos → la allowlist puede no encontrar un número registrado. Corregido con `normalizeTelefono` canónica usada por el hook.
- Confirmado: `clinica_id` con `ON DELETE RESTRICT` contra un borrado duro de clínica (`clinicaRepo.delete`) → una clínica con contactos ya no se puede borrar. Corregido a `ON DELETE CASCADE`.
- No confirmado por ejecución: `Repository.update()` no dispara los listeners y dejaría `telefono_hash` obsoleto. Anotado como requisito de T2.
- Menor, se mantiene por convención del repo: `estado` sin CHECK en base (igual que `cuenta_cobro.estado`); la violación del índice único debe mapearse a 409 en T2. "Luego de cada tarea, vamos a hacer una ronda de test adversarial, solo una permitida por tarea." Una sola ronda por tarea, al terminar la implementación. Presupuesto acotado y fijo; los defectos confirmados dentro del alcance de esa misma tarea se corrigen antes de pasar a la siguiente, y el arreglo no abre una segunda ronda (se re-verifica con los checks normales de la tarea siguiente). Un defecto fuera de alcance se reporta y espera decisión.
