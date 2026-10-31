/**
 * Retry layer for mutating requests to our API.
 *
 * Every mutating call carries an `Idempotency-Key`. Transient failures (network
 * errors and 502/503/504) are retried in-process; when the retries run out the
 * request is handed to the API, which replays it from Redis with the same key,
 * so it can never be applied twice.
 *
 * `instalarReintentos()` patches the global fetch once per server process, so
 * every endpoint gets this without touching each server action.
 */

const METODOS_MUTANTES = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ESTADOS_TRANSITORIOS = new Set([502, 503, 504]);
const RUTA_COLA = "/internal/retry";

export interface OpcionesReintento {
  /** API base URL, e.g. http://localhost:3003 */
  baseUrl: string;
  /** Total attempts before queueing. */
  intentos?: number;
  /** Delay before each retry, in ms. */
  esperasMs?: number[];
  /** Queue the request when the retries run out. */
  encolarAlFallar?: boolean;
  fetchImpl?: typeof fetch;
}

export interface ReintentoSobra {
  /** The request was accepted for a later replay. */
  encolado: boolean;
}

export interface ResultadoReintento {
  respuesta: Response;
  encolado: boolean;
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nuevaClave(): string {
  return globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.random()}`;
}

function esTransitorio(res: Response): boolean {
  return ESTADOS_TRANSITORIOS.has(res.status);
}

/**
 * Runs one mutating request with idempotency, in-process retries and a final
 * hand-off to the API's retry queue.
 */
export async function fetchConReintento(
  url: string,
  init: RequestInit,
  opciones: OpcionesReintento,
): Promise<ResultadoReintento> {
  const {
    baseUrl,
    intentos = 3,
    esperasMs = [300, 900],
    encolarAlFallar = true,
    fetchImpl = fetch,
  } = opciones;

  const headers = new Headers(init.headers);
  const clave = headers.get("Idempotency-Key") ?? nuevaClave();
  headers.set("Idempotency-Key", clave);
  const conClave: RequestInit = { ...init, headers };

  let ultimoError = "Error de red";
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const respuesta = await fetchImpl(url, conClave);
      if (!esTransitorio(respuesta)) return { respuesta, encolado: false };
      ultimoError = `El servidor respondió ${respuesta.status}`;
    } catch (err) {
      ultimoError = err instanceof Error ? err.message : String(err);
    }
    const espera = esperasMs[intento - 1];
    if (intento < intentos && espera) await esperar(espera);
  }

  if (!encolarAlFallar) {
    return { respuesta: errorDeRed(ultimoError), encolado: false };
  }

  const descriptor = {
    method: (init.method ?? "POST").toUpperCase(),
    path: url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url,
    body: cuerpoComoObjeto(init.body),
    idempotencyKey: clave,
  };

  try {
    const cola = await fetchImpl(`${baseUrl}${RUTA_COLA}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cookiesDe(init.headers) },
      body: JSON.stringify(descriptor),
    });
    if (cola.ok) return { respuesta: encolada(ultimoError), encolado: true };
  } catch {
    // Redis or the API is unreachable: nothing else we can do.
  }

  return { respuesta: errorDeRed(ultimoError), encolado: false };
}

/** Keeps the user's cookie: the replay must run as them. */
function cookiesDe(headers: HeadersInit | undefined): Record<string, string> {
  const cookie = new Headers(headers).get("Cookie");
  return cookie ? { Cookie: cookie } : {};
}

function cuerpoComoObjeto(body: BodyInit | null | undefined): Record<string, unknown> | undefined {
  if (typeof body !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function encolada(detalle: string): Response {
  return Response.json(
    {
      message: "No pudimos completar la solicitud; quedó en cola para reintento.",
      encolado: true,
      detalle,
    },
    { status: 503 },
  );
}

function errorDeRed(detalle: string): Response {
  return Response.json(
    { message: "No se pudo conectar con el servidor.", detalle },
    { status: 503 },
  );
}

/**
 * Patches global fetch so every mutating call to the API gets the retry layer.
 * Returns the restore function (used by tests).
 */
export function instalarReintentos(opciones: OpcionesReintento): () => void {
  const original = opciones.fetchImpl ?? globalThis.fetch;
  const { baseUrl } = opciones;

  const parcheado: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const metodo = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET"))
      .toString()
      .toUpperCase();

    const aplica =
      url.startsWith(baseUrl) &&
      METODOS_MUTANTES.has(metodo) &&
      !url.startsWith(`${baseUrl}${RUTA_COLA}`);

    if (!aplica) return original(input, init);

    const { respuesta } = await fetchConReintento(
      url,
      { ...init, method: metodo },
      { ...opciones, fetchImpl: original },
    );
    return respuesta;
  };

  globalThis.fetch = parcheado as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
