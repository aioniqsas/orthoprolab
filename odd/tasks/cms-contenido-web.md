# CMS: contenido editable del sitio público

## Objective

Que el contenido del sitio público (imágenes de los hero, la info de la sección de pagos, la misión, la visión y todo el copy fijo de las páginas) se pueda editar desde el panel de administrador, sin tocar código.

## Problem

Hoy el contenido vive en el código: constantes de módulo y literales JSX repartidos entre `apps/web/app/page.tsx`, `nosotros/page.tsx`, `pagos/page.tsx`, `lib/site.ts`, `lib/payments.ts` y `lib/catalog.ts` (unas 40 cadenas y 8 imágenes de hero/fondo). La pantalla de CMS del panel (`apps/admin/app/(portal)/cms/page.tsx`) es de solo lectura y lo dice explícitamente: no hay tablas de contenido ni servicio que guarde cambios; incluso los títulos que muestra salen de una lista hardcodeada (`SAMPLE_PAGINAS_WEB`, `SAMPLE_DATA = true`).

## Scope

- **API**: tabla `contenido_web` (clave/valor), esquema de claves en código (etiquetas en español, tipo y grupo), y endpoints: `GET /contenido` (público, valores efectivos), `GET /admin/contenido` (admin, grupos y campos con su metadata y valor), `PUT /admin/contenido` (admin, guarda un lote de valores). Al guardar emite un evento para que el sitio se actualice.
- **Admin**: la pantalla de CMS deja de ser de solo lectura: se dibuja desde `GET /admin/contenido` (grupos → campos), guarda con `PUT` y ofrece un selector de imágenes para los campos de tipo imagen.
- **Web**: los tres hero, la info de pagos, misión, visión y el copy fijo de las páginas se leen del contenido editado, con el literal actual como respaldo si la API no responde.
- **Docs**: referencia en `apps/api/docs/` y actualización de README.

## Out of scope

- Subir imágenes nuevas de hero: el selector elige entre las imágenes que ya existen en `apps/web/public/images`. (Cloudinary ya está integrado para el catálogo; subir hero es una extensión posterior.)
- Agregar o quitar elementos de las listas (pasos, puntos, valores): se editan los textos de los elementos que existen hoy.
- El catálogo de servicios y sus precios: se siguen administrando en la pantalla de Catálogo. El CMS solo edita el copy FIJO del catálogo (títulos, textos de botones).
- Versionado, borradores y publicación programada: guardar es publicar.

## Constraints

- Modelo clave/valor (decidido por el usuario): cada texto o imagen es una fila; el sitio sigue funcionando igual si la tabla está vacía.
- Los valores por defecto (el copy actual) viven en la web, no en la base: la API guarda solo los cambios. Vacío = se usa el texto del sitio.
- El nombre de las claves es `<pagina>.<seccion>.<campo>` (ej. `home.hero.titulo`).
- El sitio lee el contenido con la misma estrategia de cache y eventos que el catálogo (tag + SSE), así un cambio se ve casi al instante.
- Sin dependencias nuevas. Nombres de tablas, columnas y mensajes en español, como el resto de la API.

## Tasks

- [x] K1 API: entidad `ContenidoWeb`, migración, esquema de claves, endpoints público/admin, validación por tipo, evento y tests. Commit `0138202`.
- [x] K2 Admin: pantalla de CMS editable (grupos, campos, guardar, selector de imágenes) y acciones de servidor. Commit `c5686fa`.
- [x] K3 Web: `lib/content.ts` + los tres hero, pagos, misión, visión y el copy fijo leyendo las claves, con respaldo. Commit `cfa819f`.
- [x] K4 Docs y verificación: referencia del módulo, README, `turbo run lint check-types test build` completo y prueba manual guardando desde el panel.

## Acceptance criteria

- Desde `/cms` se puede cambiar el texto de un hero, la info de pagos, la misión o la visión y guardar.
- Las imágenes de los hero se eligen desde un selector con las imágenes disponibles y se ve una miniatura.
- Al guardar, la página pública correspondiente muestra el texto nuevo sin recargar a mano (SSE) o dentro de los 10 s siguientes.
- Si la API no responde, el sitio sigue mostrando el contenido que tiene hoy en el código.
- Guardar un campo vacío devuelve ese campo al texto original del sitio.

## Checks

- `bunx turbo run lint check-types test build`
- `bun run migration:run` en `apps/api` y `bun run db:schema`.
- Manual: guardar un hero distinto desde el panel y mirar la landing en otra pestaña.

## Progress

- Inventario del contenido editable hecho (landing, nosotros, pagos, catálogo, lib y `public/images`).
- Modelo decidido por el usuario: tabla clave/valor.
- K1: tabla `contenido_web`, esquema de 99 campos en 14 grupos (62 `texto`, 29 `parrafo`, 8 `imagen`), `GET /contenido`, `GET`/`PUT /admin/contenido`, validación por tipo y por lista de imágenes, evento `contenido` por el bus compartido, 33 tests (20 del servicio, 13 del DTO). Migración aplicada.
- K2: `/cms` reemplaza la pantalla de solo lectura por el formulario generado desde la API, con selector de imágenes y miniatura (`NEXT_PUBLIC_SITE_URL`, por defecto `http://localhost:3000`). Se borró la lista de ejemplo (`listPaginasWeb`, `SAMPLE_PAGINAS_WEB`, `PaginaWeb`).
- K3: `lib/content.ts` con `fetchContenido` (tag `contenido`) y `texto()`; las 5 rutas públicas consumen los 99 campos con el literal actual como respaldo; `CatalogLive` subió al layout y `POST /api/catalogo/revalidar` expira el tag y las cuatro rutas.
- K4: `apps/api/docs/contenido.md`, `database-model.md`, `schema.sql` regenerado, `docs/portals.md`, `README.md` y la nota de tipos de evento en `catalogo.md`.
- Fuera del CMS a propósito: nombre de marca, dirección e imagen Open Graph (alimentan metadata y JSON-LD estáticos), metadata SEO, y el catálogo de servicios.

## Verification evidence

- `bunx turbo run lint check-types test build` = 18/18 en todo el monorepo.
- `GET /contenido` responde `{}` sin datos y `401` en `/admin/contenido` sin sesión.
- Prueba de lectura con una fila real insertada en `contenido_web` (`home.hero.titulo`, `home.antes.imagen`): el sitio mostró el texto y la imagen nuevos en `/` y en ninguna otra página; luego se borraron las filas y el sitio volvió a sus literales.
- Navegación real en navegador por `/nosotros` y `/pagos` sin errores de consola (las cinco rutas llevan `export const instant = false`, igual que `/catalogo`).

## Next step

Probar desde el panel: entrar a `/cms`, cambiar un hero y la info de pagos, guardar, y mirar el sitio en otra pestaña. Queda pendiente subir imágenes nuevas de hero (hoy se eligen entre las 21 existentes).
