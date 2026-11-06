/**
 * Logs estructurados de una línea por evento, pensados para la terminal del
 * servidor (`bun run dev`). Cada ejecución lleva una `ref` corta que también se
 * muestra al usuario: con ella se cruza el mensaje de la pantalla con esta
 * salida, y con el `digest` que imprime Next cuando falla una server action.
 */
export type NivelLog = 'info' | 'warn' | 'error';

export interface EventoLog {
  nivel: NivelLog;
  /** Acción o componente que registra, p. ej. "cuentas-cobro.enviarEmail". */
  ambito: string;
  /** Identificador corto para cruzar con lo que ve el usuario. */
  ref: string;
  mensaje: string;
  datos?: Record<string, unknown>;
}

/** Ref corta y legible, sin dependencias. */
export function crearRef(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Una línea JSON con marca de tiempo; estable para poder probarla. */
export function formatearLinea(evento: EventoLog, ahora: Date = new Date()): string {
  return JSON.stringify({ ts: ahora.toISOString(), ...evento });
}

export function registrar(evento: EventoLog): void {
  const linea = formatearLinea(evento);
  if (evento.nivel === 'error') console.error(linea);
  else if (evento.nivel === 'warn') console.warn(linea);
  else console.log(linea);
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
  registrar({ nivel: 'info', ambito, ref, mensaje: 'inicio', datos });

  try {
    const resultado = await ejecutar(ref);
    registrar({
      nivel: resultado.ok ? 'info' : 'warn',
      ambito,
      ref,
      mensaje: resultado.ok ? 'ok' : 'error-controlado',
      datos: { ...datos, duracionMs: Date.now() - inicio, error: resultado.error },
    });
    return resultado;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    registrar({
      nivel: 'error',
      ambito,
      ref,
      mensaje: 'excepcion',
      datos: {
        ...datos,
        duracionMs: Date.now() - inicio,
        error: mensaje,
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    return {
      ok: false,
      error: `Error inesperado (ref ${ref}). Revisa el log del servidor.`,
    } as T;
  }
}
