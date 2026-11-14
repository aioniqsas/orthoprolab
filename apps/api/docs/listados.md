# Listados paginados y respuestas HTTP

Contrato de las rutas de lista de `apps/api`: paginación en el servidor, filtros, ordenamiento, búsqueda, serialización y compresión. Aplica a los portales (`apps/admin`, `apps/clientes`) y, con una excepción explícita, al sitio público.

## 1. Contrato de paginación

Todas las rutas de la tabla de abajo aceptan la misma pareja de parámetros y responden el mismo objeto. Ninguna devuelve un array suelto.

| Parámetro | Valores    | Por defecto          |
| --------- | ---------- | -------------------- |
| `page`    | entero ≥ 1 | `1`                  |
| `size`    | entero ≥ 1 | `10`, con tope `100` |

- Un `size` mayor que 100 **se recorta a 100**: no es un error.
- Un `page` o `size` no entero, `0` o negativo no pasa la validación del DTO y responde 400.
- La respuesta siempre tiene la misma forma:

  ```json
  { "data": [ ... ], "total": 128, "page": 3, "size": 10 }
  ```

- `total` es la cantidad de filas del conjunto **filtrado**, no de la tabla completa ni de la página.
- Una página más allá del final devuelve `data: []` con el `total` real y HTTP 200; nunca 404 ni 500.
- El orden es determinista: cada ruta ordena por su columna principal y **desempata por el id** de la fila (`o.id`, `cc.id`, `u.id`, `c.id`, `s.id`, `paciente.id`, `pacienteId`). Así dos páginas consecutivas no repiten ni saltan filas.
- `order` solo acepta `asc` o `desc`. Con `sort` y sin `order`, la dirección es `asc`.

La normalización vive en `src/common/pagination.ts` (`normalizePagination`, `paginatedResult`) y el orden en `src/common/list-query.ts` (`orderByWhitelist`). El `sort` pedido se mapea a la columna real en un objeto de orden de TypeORM: el valor de la petición nunca se interpola en SQL, y una clave fuera de la lista blanca cae al orden por defecto del endpoint (el DTO la rechaza antes con 400).

## 2. Filtros y orden por endpoint

`sort` es una lista blanca por ruta. Un valor fuera de ella, un `order` distinto de `asc`/`desc`, o un filtro con un valor no admitido responden **400** (`BadRequest`), no se ignoran.

| Ruta                            | Búsqueda `q`                                                    | Filtros                                                                               | `sort` (lista blanca)                           | Orden por defecto       |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------- |
| `GET /ordenes`                  | número (`9` o `#9`), nombre del doctor, paciente (índice ciego) | `grupo`: `activas`, `terminadas`, `canceladas`; `urgente`: `true`/`false`; `estadoId` | `orden`, `creada`, `entrega`, `total`, `doctor` | `creada` `desc`         |
| `GET /mi-clinica/ordenes`       | igual que `/ordenes`, más el nombre del estado                  | `grupo`; `urgente`                                                                    | `orden`, `creada`, `entrega`, `total`, `doctor` | `creada` `desc`         |
| `GET /cuentas-cobro`            | número, nombre o correo de la clínica                           | `grupo`: `pendientes`, `pagadas`, `canceladas`; `doctorId`                            | `numero`, `fecha`, `total`, `estado`, `clinica` | `fecha` `desc`          |
| `GET /mi-clinica/cuentas-cobro` | número                                                          | `grupo`                                                                               | `numero`, `fecha`, `total`, `estado`, `clinica` | `fecha` `desc`          |
| `GET /usuarios`                 | nombres + apellidos, correo                                     | `activo`: `true`/`false`                                                              | `nombre`, `correo`, `rol`, `activo`, `creado`   | `nombre` `asc`          |
| `GET /clinicas`                 | nombre, dirección, nombre de un doctor                          | —                                                                                     | `nombre`, `creado`                              | `nombre` `asc`          |
| `GET /admin/catalogo/servicios` | nombre, descripción                                             | `activo`: `true`/`false`                                                              | `nombre`, `precio`, `activo`, `creado`          | `nombre` `asc`          |
| `GET /mi-clinica/pacientes`     | nombre (trigramas) o cédula; `doctorId` opcional                | `doctorId`                                                                            | — (ver §4)                                      | `paciente.nombre` `asc` |
| `GET /mi-clinica/servicios`     | —                                                               | —                                                                                     | —                                               | `nombre` `asc`          |
| `GET /catalogo/servicios`       | —                                                               | —                                                                                     | —                                               | `nombre` `asc`          |

Los grupos replican los de `@repo/api-client` (`GRUPOS_ORDEN`, `GRUPOS_CUENTA`) y están definidos en `src/pedidos/orden-grupo.ts` y `src/cuentas-cobro/cuenta-grupo.ts`:

- Órdenes: **activas** = `creada`, `recibida`, `en_proceso`, `en_entrega`, `devuelta_correccion`; **terminadas** = `terminada`; **canceladas** = `cancelada`.
- Cuentas de cobro: **pendientes** = `borrador`, `emitida`, `pagada_parcial`; **pagadas** = `pagada`; **canceladas** = `anulada`.

Filtros y búsqueda se aplican en SQL **antes** de paginar, así que `total` y los contadores reflejan el conjunto filtrado. En `GET /mi-clinica/cuentas-cobro` el `borrador` se excluye siempre: la clínica nunca lo ve.

## 3. Búsqueda en el servidor

El texto viaja en `q` y el navegador no filtra nada: los portales envían el término y el servidor consulta sus índices.

- Órdenes: el número, el nombre del doctor (en ambos órdenes), el paciente a través del índice ciego de `paciente_busqueda` y, en el portal de clientes, también el nombre del estado.
- Pacientes: cédula exacta o últimos cuatro dígitos por el índice ciego; nombres por trigramas cifrados (HMAC) y comprobación de palabras sobre los pocos candidatos. La cédula y el nombre nunca se descifran en el navegador.
- Clínicas, usuarios, cuentas de cobro y catálogo: `LIKE` insensible a acentos sobre las columnas de texto de cada tabla.

## 4. Lo que no se ordena, y por qué

- `GET /mi-clinica/pacientes` no acepta `sort`: el nombre y la cédula del paciente están cifrados en reposo (AES-256-GCM), así que la base no puede ordenarlos. El orden es por nombre cifrado con desempate por id; el portal de clientes no ofrece orden por cabecera en esa tabla.
- `GET /clinicas` no ordena por el contador de doctores: `doctorCount` se calcula con una segunda consulta sobre las clínicas ya paginadas, no es una columna de la tabla.

## 5. El sitio público es la excepción

`apps/web` necesita el catálogo **completo**, no una página: `fetchServices()` alimenta el grid de `/catalogo`, las rutas estáticas (`generateStaticParams`) y los servicios relacionados del detalle. Por eso recorre las páginas de `GET /catalogo/servicios` con `fetchAllPages` (`packages/ui/src/lib/fetch-all-pages.ts`), con un tope defensivo de 10 páginas de 100, y conserva `cacheTag("catalog")`, `cacheLife("catalogo")` y `next: { revalidate: 10, tags: ["catalog"] }`. Si la API no responde, usa el catálogo local de respaldo (`apps/web/lib/catalog.ts`).

Los portales, en cambio, piden una sola página por render (`page`/`size` en la URL) salvo los datos de referencia que se consumen enteros en formularios y búsquedas de detalle (por ejemplo la lista de clínicas de un formulario), que sí recorren páginas.

## 6. Serialización de las respuestas

`ClassSerializerInterceptor` aplica los `@Exclude({ toPlainOnly: true })` de las entidades:

- `usuario`: nunca salen `passwordHash`, `cedula`, `cedulaHash`, `resetTokenHash` ni `resetTokenExpires`.
- `paciente`: la cédula sale enmascarada, solo los últimos cuatro dígitos (`****1234`).
- `GET /usuarios` devuelve un objeto explícito con `correo` y `cedulaEnmascarada`; el correo se expone ahí porque el panel lo necesita, no por serializar la entidad.

## 7. Compresión

`src/app.setup.ts` comprime con gzip las respuestas de más de 1 KB, con dos excepciones deliberadas:

- **SSE** (`text/event-stream`): comprimido, el stream se almacena en el buffer y deja de llegar en tiempo real.
- **PDF** (`application/pdf`): PDFKit ya lo comprime; volver a comprimirlo no reduce y cuesta CPU.

## 8. Correo de cuentas de cobro

`POST /cuentas-cobro/:id/enviar` no genera ni adjunta PDFs en la petición. Encola un trabajo cuyo payload solo lleva el id de la cuenta:

```json
{ "attachmentSource": { "kind": "cuenta-cobro", "cuentaCobroId": "12" } }
```

El worker (`src/queues/mail.processor.ts`) construye los adjuntos al enviar, con `CuentaCobroMailAttachmentsService`:

1. El PDF de la cuenta se descarga de su URL almacenada (Cloudinary); si la fila no tiene URL, se genera en ese momento.
2. Cada orden adjunta a la cuenta aporta su control de trabajos, generado **en secuencia** (uno a la vez).

Un reintento del mismo job vuelve a construir los mismos adjuntos desde la base: no se pierden ni se duplican. Un control que falla se omite y se registra; el correo de la cuenta sale igual. Si la cola no está disponible, el servicio envía por SMTP directo con los mismos adjuntos. El asunto, el cuerpo y los destinatarios no cambian.

## 9. Pruebas

- `src/common/pagination.spec.ts` y `src/common/pagination.contract.spec.ts`: contrato de paginación (recorte del tope, página fuera de rango, total, desempate por id) por ruta.
- `src/common/list-query.spec.ts`: DTOs (400 ante `sort`/`order`/filtro inválidos) y mapeo del orden.
- `src/cuentas-cobro/mailer-cuenta-cobro.service.spec.ts`: payload encolado sin bytes, adjuntos reales entregados y reintento idempotente.
