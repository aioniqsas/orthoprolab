# El bot entiende la entrega y nunca se queda en "No entendí"

Objetivo: que "urgente para el jueves" se entienda y se guarde, y que la confirmación nunca responda "No entendí" a secas. Rama `feat/whatsapp-bot`. Runner: `bun test` en `apps/whatsapp`. Test-first deshabilitado por el humano (ver whatsapp-bot.md); una ronda adversarial por tarea.

## Specs

**S1 — La fecha de entrega y la urgencia se entienden y se guardan.**
Texto del usuario: "cuando ya confirmó o tiene un borrador de la orden, si se le hace una observación como por ejemplo la fecha entrega […] no la está teniendo en cuenta". Transcripción: "necesito crear una orden […] es urgente para el jueves" y en la confirmación "Necesito que sea urgente para el jueves" → "No entendí".
En cualquier momento (primer mensaje, confirmación, orden existente) "urgente", "para el jueves", "para mañana" se entienden. La fecha de entrega se resuelve hacia adelante desde hoy (zona del laboratorio, calculada en código). Viaja a la API: `fechaEntrega` y `urgente` ya existen en `CreateOrdenDto` y `UpdateOrdenDto`.

**S2 — El resumen muestra entrega y urgencia.**
La línea de entrega aparece en el resumen de la orden nueva y en el antes→después de una orden existente, en fecha larga y con "(urgente)" cuando aplica.

**S3 — La confirmación nunca dice "No entendí" a secas.**
Toda respuesta sin avance dice qué sí puede hacer (cambiar dientes, cantidad, color, fecha de entrega, una nota) y que un sí crea la orden. El pie "Responde sí…" no se repite dos veces en el mismo mensaje (transcripción: salió duplicado).

**S4 — Identificar por día ≠ entregar un día.**
"la orden del martes" sigue buscando hacia atrás (creación); "para el viernes" es entrega, hacia adelante. Un mismo mensaje puede traer las dos.

## Tasks
| ID | Tarea | Specs | Ruta |
| --- | --- | --- | --- |
| H1 | Entrega y urgencia: extracción en tiempo.ts, resumen, payloads (crear y editar), prompt; sin "No entendí" a secas en confirmación | S1–S4 | inline — hecho, ver commit |

## Log

**L1 — pedido (textual):** "Primero vas a revisar en Engram el progreso y vamos a mejorar todo el flujo del bot, desde cómo responde la inteligencia, porque la verdad se siente un bot tonto e inservible. Tienes que recordar que la idea es que este bot va a ser usado por odontólogos y laborataristas, que muy probablemente muchos de ellos no sean. Técnicos desde el lado de la tecnología, entonces el lenguaje del bot, la manera en cómo entiende lo que se le dice, porque hay que tratar de hacer que todo sea muy humano, teniendo en cuenta los errores, ya que no tiene en cuenta que de pronto, cuando ya confirmó o tiene un borrador de la orden, si se le hace una observación como por ejemplo la fecha entrega, no hay poder humano que haga que estas van a ser. Para una fecha, no la está teniendo en cuenta y en general no me está gustando el bot. Te encargo, por favor, que hagas de ese bot algo real, muy similar a lo humano y algo inteligente que no se sienta tan artificial."

Descubrimiento: la API ya acepta `fechaEntrega` (IsDateString) y `urgente` (IsBoolean) en crear y actualizar (`pedidos.service.ts:226-227,348-353`); el bot nunca los mandaba. La nota previa en Engram ("fechaEntrega/prioridad no existen en orden") estaba desactualizada.

**L2 — verificación (2026-11-13):** `bun test` 370 pass / 0 fail; `tsc --noEmit` limpio. Nuevo `test/entrega.test.ts` reproduce la transcripción: "urgente para el jueves" en el primer mensaje y en la confirmación llegan al resumen y al POST, sin "No entendí" y con un solo pie. "Para el viernes" dicho un viernes es el de la semana siguiente. Se mantuvo la confirmación literal ("dale"/"ok" no crean): es una regla previa de seguridad (whatsapp-conversacion, constraints).
