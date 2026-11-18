# Soft delete selectivo y baja de clínica

Borrado lógico solo donde no existe ya un mecanismo de ciclo de vida, más `clinica.activo` para que dar de baja una clínica vuelva inaccesible todo lo suyo sin tocar sus tablas hijas.
Base: clasificación hecha contra el esquema real (`information_schema`), no contra suposiciones.

## Specs

**S1 — Solo donde es estrictamente necesario.**
Texto del usuario: "Vamos a tener el soft delete en las tablas donde sea estrictamente necesario" / "Ese campo solo lo pondremos en las salas [tablas] donde sea estrictamente necesario."

**S2 — Sin redundancia: el estado del padre manda.**
Texto del usuario: "si desactivo una clínica, ya su información no debería de ser accesible ya que la clínica no está activa. Entonces, no necesito hacer la redundancia de tanto la clínica como sus órdenes decirles que no están activas. Simplemente pregunto el estado de la clínica y si la clínica está activa, su información relacionada también lo va a estar."
Ninguna tabla hija de `clinica` recibe un flag propio: el acceso se resuelve preguntando por la clínica en un solo lugar.

**S3 — Tablas que reciben `eliminado_en`.**
Decisión del usuario: `detalle_orden`, `paciente_doctor`, `cuenta_cobro_orden` y `paciente`. Nada más.
Quedan fuera por tener ya ciclo de vida: `doctor`, `usuario`, `servicio`, `metodo_pago_bancario` (`activo`); `orden` (`estado_id`); `cuenta_cobro`, `envio_cuenta_cobro`, `whatsapp_contacto` (`estado`); `pago` (`anulado`); `historial_estado_orden` (historial). Queda fuera por semántica: `contenido_web` (la ausencia de fila significa "usa el texto por defecto").

**S4 — La baja de clínica es `activo = false`.**
Decisión del usuario: agregar `clinica.activo`, igual que `doctor`/`usuario`/`servicio`. El borrado físico de clínica desaparece.

## Tasks

| ID | Tarea | Specs | Ruta |
| --- | --- | --- | --- |
| SD1 | Migración: `eliminado_en timestamptz` en las 4 tablas, `clinica.activo boolean NOT NULL DEFAULT true`, e índice único parcial de `paciente.cedula_hash` que excluya las filas eliminadas | S3,S4 | worker |
| SD2 | Código: reemplazar los 4 borrados físicos por `softDelete`; al revincular un `paciente_doctor` o `cuenta_cobro_orden` se restaura la fila (la PK impide insertar una nueva); la edición de orden deja las líneas anteriores como eliminadas en vez de borrarlas | S3 | worker |
| SD3 | Regla de acceso por clínica: `resolveClinicaId` (y su equivalente en el admin) rechaza clínicas inactivas; dar de baja una clínica pasa a ser `activo = false` | S2,S4 | worker |

## Constraints

- TypeORM con `synchronize: false`: todo va en migración escrita a mano.
- Las PK compuestas de `paciente_doctor` y `cuenta_cobro_orden` no admiten duplicados aunque la fila esté eliminada: por eso revincular restaura, no inserta.
- `@DeleteDateColumn` hace que las consultas normales excluyan las filas eliminadas; `withDeleted()` queda reservado para auditoría.

## Entrega

Misma rama que el bot (`feat/whatsapp-bot`), un commit por tarea (SD1, SD2, SD3). Decisión del usuario: no se abren ramas por rebanada; al publicar, la revisión se corta por rango de commits.

## Log

**L1 — pedido (textual):** "Agregaremos algo a las tareas en todas las tablas. Vamos a hacer soft delete de modo que no vamos a perder trazabilidad de la información"

**L2 — corrección de alcance (textual):** "Vamos a tener el soft delete en las tablas donde sea estrictamente necesario, es decir, si desactivo una clínica, ya su información no debería de ser accesible ya que la clínica no está activa. Entonces, no necesito hacer la redundancia de tanto la clínica como sus órdenes decirles que no están activas. Simplemente pregunto el estado de la clínica y si la clínica está activa, su información relacionada también lo va a estar. De manera que donde debamos hacer soft delete. Ese campo solo lo pondremos en las salas donde sea estrictamente necesario."

**L3 — decisiones:** `eliminado_en` en `detalle_orden`, `paciente_doctor`, `cuenta_cobro_orden`, `paciente`; baja de clínica con `clinica.activo`.

**L4 — evidencia de la clasificación:** `clinica` no tiene `activo` y su única baja es `clinicaRepo.delete(id)`; `detalle_orden` se borra en `pedidos.service.ts:353`; `contenido_web` borra filas en `contenido.service.ts:94`; `servicios.remove` borra en `catalogo/servicios.service.ts`.
