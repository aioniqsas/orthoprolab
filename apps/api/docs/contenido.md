# Contenido del sitio

Referencia del módulo de contenido de `apps/api` (`src/contenido`) y de su consumo desde `apps/web` y `apps/admin`. Los nombres de rutas, claves y campos están en español, como en el código. Las variables de entorno se nombran, nunca con sus valores.

## 1. Resumen

| Pieza | Qué es |
|---|---|
| Tabla `contenido_web` | Un almacén clave/valor: una fila por campo editado |
| Claves | `<pagina>.<seccion>.<campo>`, definidas en `src/contenido/contenido.schema.ts` |
| Valores por defecto | Los literales que ya trae el sitio (`apps/web`); la base solo guarda lo que un administrador cambió |
| Borrar una edición | Enviar la cadena vacía: se elimina la fila y vuelve el literal del sitio |

- El esquema de campos (grupos, etiquetas, tipos y límites) vive en el código, no en la base. Agregar un campo es editar `CONTENIDO_GRUPOS` y volver a desplegar.
- El catálogo de servicios y sus precios **no** forman parte de este módulo: ver [`catalogo.md`](./catalogo.md).
- Toda escritura emite un evento por el bus compartido del catálogo; `apps/web` invalida su cache y refresca la página.

## 2. Modelo de datos

Tabla `contenido_web` (ver [`database-model.md`](./database-model.md)), creada por la migración `CreateContenidoWeb`:

| Columna | Tipo | Notas |
|---|---|---|
| `clave` | varchar(120) | Clave primaria `pk_contenido_web`; sigue `<pagina>.<seccion>.<campo>` |
| `valor` | text | Texto, ruta de imagen o cadena vacía (nunca se guarda vacía: se borra la fila) |
| `fecha_actualizacion` | timestamptz | `now()` por defecto; la mantiene TypeORM en cada escritura |

No hay filas por defecto: una tabla vacía significa "el sitio se ve tal como está en el código".

## 3. Esquema de claves

Cada campo es una clave `<pagina>.<seccion>.<campo>` en minúsculas, con segmentos separados por punto y solo `[a-z0-9_]`. El patrón lo valida el DTO (`^[a-z0-9_]+(\.[a-z0-9_]+)+$`) y el servicio comprueba que la clave exista en el esquema.

`CONTENIDO_GRUPOS` define 14 grupos y 99 campos, en el orden en que aparecen en el sitio:

| Grupo | Campos |
|---|---|
| Landing: hero | 7 |
| Landing: líneas de trabajo | 2 |
| Landing: cómo trabajamos | 9 |
| Landing: antes del primer caso | 9 |
| Landing: cierre | 4 |
| Nosotros: hero | 5 |
| Nosotros: misión | 11 |
| Nosotros: visión | 9 |
| Nosotros: valores | 9 |
| Nosotros: cierre | 4 |
| Pagos: hero | 5 |
| Pagos: datos de la cuenta | 8 |
| Pagos: pasos | 7 |
| Catálogo | 10 |

Tipos y límites (contados sobre las 99 claves):

| `tipo` | Campos | Límite |
|---|---|---|
| `texto` | 62 | 160 caracteres (`MAX_TEXTO`) |
| `parrafo` | 29 | 1200 caracteres (`MAX_PARRAFO`) |
| `imagen` | 8 | Debe ser una de las 21 rutas de `IMAGENES_DISPONIBLES` |

- **Imágenes:** `IMAGENES_DISPONIBLES` son los archivos que existen hoy en `apps/web/public/images`. Se eligen de una lista, nunca se suben, y el valor guardado es la ruta (`/images/...`), no una URL externa.
- **Listas fijas:** los pasos, puntos y valores tienen una cantidad fija de elementos, con una clave por campo indexada desde 1 (`home.proceso.paso1.titulo`, `nosotros.valores.punto4.texto`). No se pueden agregar ni quitar elementos desde el panel.
- **Títulos resaltados:** el sitio parte algunos títulos en dos claves, `titulo` + `titulo_destacado`, para conservar la palabra resaltada.
- **Campos repetidos por elemento:** en `/pagos`, claves como `pagos.cuenta.banco` reemplazan el dato correspondiente de cada cuenta que hoy define `apps/web/lib/payments.ts`; no crean cuentas nuevas.

## 4. Ruta pública

`GET /contenido`, `@Public()`.

| Aspecto | Comportamiento |
|---|---|
| Respuesta | Objeto plano `{ "<clave>": "<valor>" }` con **solo** los valores guardados |
| Sin datos guardados | `{}` |
| Cache | `Cache-Control: public, max-age=60, stale-while-revalidate=300` |
| Límite de peticiones | El global de la API (mismo que el resto de las rutas públicas) |

Nunca devuelve los valores por defecto ni el esquema: si una clave no aparece, el sitio usa su propio literal.

## 5. Rutas de administración

Prefijo `/admin/contenido`, rol `administrador` (cookie `auth_token`) y `Cache-Control: no-store`.

| Ruta | Cuerpo / respuesta |
|---|---|
| `GET /admin/contenido` | Esquema completo con los valores guardados |
| `PUT /admin/contenido` | `{ "valores": { "<clave>": "<valor>" } }` → el mismo cuerpo que el `GET` |

Respuesta de ambas rutas:

```json
{
  "grupos": [
    {
      "grupo": "Landing: hero",
      "campos": [
        {
          "clave": "home.hero.imagen",
          "etiqueta": "Imagen de fondo",
          "tipo": "imagen",
          "ayuda": "texto opcional",
          "valor": null
        }
      ]
    }
  ],
  "imagenes": ["/images/hero.jpg"]
}
```

- `valor: null` significa "no hay nada guardado: aplica el valor por defecto del sitio".
- `ayuda` solo aparece en los campos que la tienen; no en todos.
- `imagenes` es la lista permitida para los campos `imagen`, para el selector del panel.

Validación de `PUT`:

- El cuerpo es `{ valores }` con un objeto plano de claves a textos; se recortan espacios de claves y valores.
- Máximo 200 claves por lote y textos de hasta 1200 caracteres en el DTO.
- El lote completo se valida **antes** de escribir: si un valor falla, no se guarda ni se borra nada.

Responde 400 cuando:

| Caso | Mensaje |
|---|---|
| `valores` falta, no es un objeto o es un arreglo | `valores debe ser un objeto.` |
| Clave con formato inválido (mayúsculas, un solo segmento, espacios, segmento vacío) | Regla del mapa de contenido |
| Valor que no es texto o supera 1200 caracteres | Regla del mapa de contenido |
| Campo extra en el cuerpo (`extra`, por ejemplo) | Validación del DTO |
| Clave válida en formato pero ausente del esquema | `Claves de contenido desconocidas: ...` |
| `texto` de más de 160 caracteres | `"<etiqueta>" no puede superar los 160 caracteres.` |
| `parrafo` de más de 1200 caracteres | `"<etiqueta>" no puede superar los 1200 caracteres.` |
| `imagen` fuera de `IMAGENES_DISPONIBLES` | `"<etiqueta>" debe ser una de las imágenes disponibles.` |

Un valor vacío (o solo espacios, ya recortado) no se valida: se interpreta como "borrar esta edición". Un lote vacío es válido y no toca la base.

## 6. Eventos

Cada `PUT` exitoso emite **un** evento `contenido` en `CatalogoEventosService`, el bus que comparte con el catálogo. El lote completo cuenta como un solo cambio.

`GET /catalogo/eventos` (SSE) reenvía siempre el tipo de evento `catalogo`, sin importar el origen:

```
event: catalogo
data: {"tipo":"contenido"}
```

`tipo` vale `contenido`; los demás valores del bus son `creado`, `actualizado`, `eliminado` e `imagen`. El bus es un `Subject` en memoria: no persiste eventos ni cruza réplicas de la API (ver [`catalogo.md`](./catalogo.md), sección 4).

## 7. Consumo desde `apps/web`

- `apps/web/lib/content.ts` expone `fetchContenido()` con `"use cache"` en línea, `cacheTag("contenido")` y `cacheLife("catalogo")` (perfil de `apps/web/next.config.ts`: `stale` 30 s, `revalidate` 10 s, `expire` 5 min). El `fetch` a `GET /contenido` usa `API_BASE_URL` (por defecto `http://localhost:3003`), timeout de 3 s y `next: { revalidate: 10, tags: ["contenido"] }`. Ante error, respuesta no exitosa o cuerpo que no sea un objeto, devuelve `{}`: el sitio renderiza sus literales.
- `texto(contenido, clave, porDefecto)` devuelve el valor guardado solo si tiene texto visible (`trim().length > 0`); si no, el literal de la página. Por eso un valor que llegara vacío desde la API nunca deja un hueco en el sitio.
- Lo usan `/`, `/nosotros`, `/catalogo`, `/catalogo/[servicio]` y `/pagos`.
- `POST /api/catalogo/revalidar` ejecuta `revalidateTag("contenido", { expire: 0 })` (junto con `catalog`) y `revalidatePath` de `/catalogo`, `/catalogo` (layout), `/`, `/nosotros` y `/pagos`. Lo llama el puente SSE `apps/web/app/api/catalogo/eventos/route.ts` al recibir un evento.
- Tiene que ser una request aparte: `revalidateTag` solo registra el tag en las revalidaciones pendientes de la request actual, que se aplican cuando la respuesta termina, y la del puente es un stream que nunca termina.
- `apps/web/components/catalog-live.tsx` (`CatalogLive`) escucha `event: catalogo` en el navegador y hace `router.refresh()`; está montado una sola vez, en el layout raíz (`apps/web/app/layout.tsx`), así que cualquier página abierta se refresca.

Sin la API, el sitio sigue funcionando con sus literales: el contenido editable no es un requisito para renderizar.

## 8. Consumo desde `apps/admin`

- `/cms` (`app/(portal)/cms/page.tsx`) pide `GET /admin/contenido` con `listContenidoAdmin()` (`apps/admin/lib/contenido-api.ts`), que reenvía la cookie `auth_token` y usa `cache: "no-store"`. Si la API falla, muestra "No se pudo cargar el contenido del sitio."
- `contenido-form.tsx` renderiza los grupos y campos en el orden que devuelve la API: `texto` como `Input`, `parrafo` como `textarea` y `imagen` como `select` con la opción vacía "Usa la imagen actual del sitio". Los campos vacíos envían `""`, que borra la edición.
- Guardar envía el formulario a la server action `saveContenido` (`actions.ts`), que arma `{ valores }` con los campos del formulario y hace `PUT /admin/contenido`; al terminar revalida `/cms` y muestra "Contenido guardado." o el mensaje de error de la API.
- La vista previa de una imagen usa un `<img>` normal con el origen del sitio público: `WEB_URL` (`apps/admin/lib/site-url.ts`), que es `NEXT_PUBLIC_SITE_URL` y por defecto `http://localhost:3000`. Los archivos viven en `apps/web`, no en el panel.

## 9. Qué no es editable

| Elemento | Por qué |
|---|---|
| Metadatos SEO (`metadata`, Open Graph, Twitter) | Los define `apps/web/lib/site.ts` para cada página; no pasan por el contenido |
| Nombre de marca y dirección | Los usan los metadatos, el JSON-LD (`LocalBusiness`), el pie y el enlace al mapa |
| Imagen Open Graph (`OG_IMAGE`) | Forma parte de los metadatos estáticos |
| Servicios del catálogo y precios | Viven en la tabla `servicio` y se administran en `/catalogo`; ver [`catalogo.md`](./catalogo.md) |
| Nombres de iconos y `href` de navegación | Son estructura y componentes (`service-icon.tsx`, `lib/site.ts`), no texto |
| Cantidad de elementos de las listas | El esquema tiene una clave por elemento; agregar uno es un cambio de código |

## 10. Pruebas

```sh
bunx turbo run lint check-types test --filter=api
```

- `src/contenido/contenido.service.spec.ts`: `mapaPublico` (solo claves guardadas, `{}` sin datos), `listAdmin` (`valor: null` y lista de imágenes), `guardar` (upsert, borrado con cadena vacía, lote vacío, lote inválido que no escribe, claves desconocidas, límites de `texto` y `parrafo`, allow-list de imágenes), emisión de un evento por guardado y validación del esquema (claves únicas y bien formadas, etiquetas, imágenes permitidas).
- `src/contenido/dto/contenido.dto.spec.ts`: recorte de claves y valores, valor vacío y mapa vacío aceptados, y rechazo de cuerpos no objeto, arreglos, `valores` ausente, valores no textuales u anidados, claves mal formadas, textos sobre 1200 caracteres y campos extra.
- No hay prueba e2e del módulo todavía.
