# PWA en los dos portales

Admin y Clientes se instalan como aplicación (manifest, iconos, service worker y página offline) sin cachear nunca datos personales.

**Scope**: `apps/admin`, `apps/clientes` (manifest, iconos, service worker, página offline, registro, cabeceras a nivel de app), documentación. El sitio público no entra.

## Specs

- **S1** — «Hay que volver [convertir] tanto al portal Administrador como al portal de clientes en PWA.» Cada portal expone un manifest válido (`name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, iconos 192 y 512, uno `maskable`) para que el navegador ofrezca instalarlo.
- **S2** — El service worker **nunca** guarda documentos autenticados ni respuestas de `/api-proxy`: otro usuario en el mismo dispositivo no debe poder leer una pantalla cacheada. Solo se cachean estáticos (`/_next/static`, iconos), que no llevan datos.
- **S3** — Sin red, una navegación muestra una página offline estática (`/offline.html`); con red, siempre gana el servidor.
- **S4** — El registro del service worker ocurre solo en producción: en `next dev` interfiere con HMR y produce resultados falsos.
- **S5** — Los archivos del PWA (`/sw.js`, `/manifest.webmanifest`, `/icons/*`, `/offline.html`) quedan fuera del gate de sesión de `proxy.ts`; si no, la instalación falla para un usuario sin sesión y el service worker no puede precachear.

## Tasks

| ID  | Specs | Ruta   | Tarea                                                                    | Commit |
| --- | ----- | ------ | ------------------------------------------------------------------------ | ------ |
| T1  | S1    | inline | Iconos PNG (192, 512, maskable 512, apple 180) en los dos portales         | `iconos` |
| T2  | S1,S5 | inline | `app/manifest.ts` y metadata/viewport en cada layout                      | `pwa` |
| T3  | S2,S3 | inline | `public/sw.js` idéntico en ambos + `public/offline.html`                  | `pwa` |
| T4  | S4    | inline | Registro del service worker en producción y `Cache-Control` para `/sw.js` | `pwa` |
| T5  | S5    | inline | Verificar que el matcher de `proxy.ts` deja pasar los archivos del PWA    | `pwa` |
| T6  | —     | inline | Documentación y verificación (build real, manifest emitido)              | `docs` |

## Log

- **L1** — «Hay que volver tanto al portal Administrador como al portal de clientes en PWA.»
- **L2** — Sin dependencias nuevas: service worker escrito a mano (~60 líneas). `next-pwa` no soporta Next 16 y Serwist agregaría un paquete y su configuración para una necesidad que se resuelve con cachear estáticos.
- **L3** — La página offline es `public/offline.html` estático instead de una ruta de Next: no pasa por el gate de sesión, se precachea sin red y no arrastra React.
- **L4** — Sin delegación: el guard de `gentle-ai-worker` rechazó dos handoffs en esta sesión (el cwd es `app/apps` y `odd/tasks/...` no resuelve), así que todo el trabajo se hizo inline. El service worker y la página offline deben ser idénticos byte a byte en los dos portales, lo que además hace incómodo repartirlos.
