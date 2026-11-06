/**
 * Logs que sobreviven a una caída: cada evento se escribe con `appendFileSync`
 * en `logs/<app>.log` antes de responder, así que queda en disco aunque el
 * proceso muera en la línea siguiente. También se refleja en la terminal.
 *
 * Una `ref` corta acompaña cada ejecución y se muestra al usuario: con ella se
 * cruza el mensaje de la pantalla con el archivo, y con el `digest` que imprime
 * Next cuando falla una server action.
 *
 * Solo para el servidor: nunca lo importes desde un componente cliente.
 */
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

export type NivelLog = "info" | "warn" | "error";

export interface EventoLog {
  nivel: NivelLog;
  /** Acción o componente que registra, p. ej. "cuentas-cobro.enviarEmail". */
  ambito: string;
  /** Identificador corto para cruzar con lo que ve el usuario. */
  ref: string;
  mensaje: string;
  datos?: Record<string, unknown>;
}

/** Rotación: pasado este tamaño, el archivo se renombra y se empieza otro. */
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ARCHIVOS = 5;
const NOMBRE = "admin";

/** Directorio de logs; `LOG_DIR` permite moverlo (p. ej. a un volumen). */
export function directorioDeLogs(): string {
  return process.env.LOG_DIR ?? join(process.cwd(), "logs");
}

/** Ref corta y legible, sin dependencias. */
export function crearRef(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Una línea JSON con marca de tiempo; estable para poder probarla. */
export function formatearLinea(evento: EventoLog, ahora: Date = new Date()): string {
  return JSON.stringify({ ts: ahora.toISOString(), ...evento });
}

/**
 * Escribe la línea en disco. `appendFileSync` es intencional: no queda nada en
 * un buffer que se pierda con el proceso.
 * shortcut: una escritura sincrónica por evento, suficiente para este volumen;
 * si el tráfico crece, pasar a un stream con flush por lote.
 */
export function persistirLinea(
  linea: string,
  opciones: { dir?: string; limiteBytes?: number } = {},
): void {
  const dir = opciones.dir ?? directorioDeLogs();
  const limite = opciones.limiteBytes ?? MAX_BYTES;
  mkdirSync(dir, { recursive: true });

  const archivo = join(dir, `${NOMBRE}.log`);
  if (existeYSupera(archivo, limite)) {
    renameSync(archivo, join(dir, `${NOMBRE}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`));
    podar(dir);
  }
  appendFileSync(archivo, `${linea}\n`);
}

function existeYSupera(archivo: string, limite: number): boolean {
  try {
    return statSync(archivo).size >= limite;
  } catch {
    return false;
  }
}

/** Conserva los últimos `MAX_ARCHIVOS` rotados, para que el disco no se llene. */
function podar(dir: string): void {
  const rotados = readdirSync(dir)
    .filter((nombre) => nombre.startsWith(`${NOMBRE}-`) && nombre.endsWith(".log"))
    .sort();
  for (const nombre of rotados.slice(0, Math.max(0, rotados.length - MAX_ARCHIVOS))) {
    try {
      unlinkSync(join(dir, nombre));
    } catch {
      // Un archivo que no se puede borrar no justifica tumbar la app.
    }
  }
}

export function registrar(evento: EventoLog): void {
  const linea = formatearLinea(evento);

  // El disco manda: se escribe antes de la terminal, y un fallo al imprimir no
  // puede perder el evento. Nunca se rompe la petición por un problema de log.
  let falloEnDisco: string | null = null;
  try {
    persistirLinea(linea);
  } catch (error) {
    falloEnDisco = error instanceof Error ? error.message : String(error);
  }

  try {
    if (evento.nivel === "error") console.error(linea);
    else if (evento.nivel === "warn") console.warn(linea);
    else console.log(linea);
  } catch {
    // La terminal es un espejo, no la fuente de verdad.
  }

  if (falloEnDisco) {
    try {
      console.error(
        formatearLinea({
          nivel: "error",
          ambito: "logger",
          ref: evento.ref,
          mensaje: "no-se-pudo-escribir-el-log",
          datos: { error: falloEnDisco },
        }),
      );
    } catch {
      // Sin disco ni terminal no hay dónde registrar.
    }
  }
}

export interface ResultadoLog {
  ok: boolean;
  error?: string;
}

/**
 * Ejecuta una server action registrando inicio, fin, duración y error bajo una
 * misma `ref`. Si algo revienta fuera del `try/catch` de la acción, lo registra
 * y devuelve un resultado serializable en vez de romper la respuesta.
 */
export async function conRegistro<T extends ResultadoLog>(
  ambito: string,
  datos: Record<string, unknown>,
  ejecutar: (ref: string) => Promise<T>,
): Promise<T> {
  const ref = crearRef();
  const inicio = Date.now();
  registrar({ nivel: "info", ambito, ref, mensaje: "inicio", datos });

  try {
    const resultado = await ejecutar(ref);
    registrar({
      nivel: resultado.ok ? "info" : "warn",
      ambito,
      ref,
      mensaje: resultado.ok ? "ok" : "error-controlado",
      datos: { ...datos, duracionMs: Date.now() - inicio, error: resultado.error },
    });
    return resultado;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    registrar({
      nivel: "error",
      ambito,
      ref,
      mensaje: "excepcion",
      datos: {
        ...datos,
        duracionMs: Date.now() - inicio,
        error: mensaje,
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    return {
      ok: false,
      error: `Error inesperado (ref ${ref}). Revisa los logs del servidor.`,
    } as T;
  }
}

let capturaInstalada = false;

/**
 * Deja rastro de las caídas del proceso. Se llama una vez desde
 * `instrumentation.ts`.
 *
 * Una promesa rechazada sin manejar se registra pero no tumba el servidor; una
 * excepción no capturada sí lo termina (comportamiento normal de Node) y queda
 * escrita antes de salir.
 */
export function instalarCapturaDeCaidas(): void {
  if (capturaInstalada) return;
  capturaInstalada = true;

  const describir = (error: unknown) =>
    error instanceof Error
      ? { error: error.message, stack: error.stack }
      : { error: String(error) };

  process.on("uncaughtException", (error) => {
    registrar({
      nivel: "error",
      ambito: "proceso",
      ref: crearRef(),
      mensaje: "uncaughtException",
      datos: describir(error),
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (motivo) => {
    registrar({
      nivel: "error",
      ambito: "proceso",
      ref: crearRef(),
      mensaje: "unhandledRejection",
      datos: describir(motivo),
    });
  });
}
