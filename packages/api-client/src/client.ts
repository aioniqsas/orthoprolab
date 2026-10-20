import {
  ApiError,
  RateLimitedError,
  UnauthorizedError,
  parseRetryAfter,
} from "./errors.js";
import type { LoginBody, RegisterBody, Usuario } from "./types.js";

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Request timeout in milliseconds. Defaults to 10 000. */
  timeoutMs?: number;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip the refresh-and-retry behaviour (used by the auth endpoints). */
  skipRefresh?: boolean;
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function validationMessages(body: unknown): string[] {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const doFetch: typeof fetch =
    options.fetch ?? ((...args) => globalThis.fetch(...args));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // The only module state: the shared in-flight refresh promise.
  let refreshInFlight: Promise<void> | null = null;

  async function send(path: string, opts: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(`${baseUrl}${path}`, {
        method: opts.method ?? "GET",
        credentials: "include",
        headers:
          opts.body === undefined ? undefined : { "content-type": "application/json" },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch (e) {
      if (controller.signal.aborted) {
        throw new ApiError(0, {
          code: "timeout",
          message: "La solicitud tardó demasiado. Inténtalo de nuevo.",
        });
      }
      void e;
      throw new ApiError(0, {
        code: "network",
        message: "No pudimos conectar con el servidor. Revisa tu conexión.",
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function toError(res: Response): Promise<ApiError> {
    if (res.status === 401) return new UnauthorizedError();
    if (res.status === 429) {
      return new RateLimitedError(parseRetryAfter(res.headers.get("Retry-After")));
    }
    const body = await readJson(res);
    return new ApiError(res.status, {
      messages: res.status === 400 ? validationMessages(body) : [],
    });
  }

  function refreshSession(): Promise<void> {
    refreshInFlight ??= (async () => {
      try {
        const res = await send("/auth/refresh", { method: "POST" });
        if (!res.ok) throw new UnauthorizedError();
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  async function request<T = unknown>(
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    let res = await send(path, opts);
    if (res.status === 401 && !opts.skipRefresh) {
      try {
        await refreshSession();
      } catch (e) {
        if (e instanceof ApiError && e.code !== "http") throw e;
        throw new UnauthorizedError();
      }
      res = await send(path, opts);
    }
    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    return (await readJson(res)) as T;
  }

  const authReq = <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body, skipRefresh: true });

  const auth = {
    register: (body: RegisterBody) =>
      authReq<{ message: string }>("/auth/register", body),
    login: async (body: LoginBody): Promise<Usuario> =>
      (await authReq<{ usuario: Usuario }>("/auth/login", body)).usuario,
    refresh: async (): Promise<void> => {
      await authReq("/auth/refresh");
    },
    logout: async (): Promise<void> => {
      await authReq("/auth/logout");
    },
    me: () => request<Usuario>("/auth/me"),
  };

  return { auth, request };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export type ServerSession =
  | { status: "authenticated"; usuario: Usuario }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/**
 * Server-side `/auth/me` for Next server components. Forwards the incoming
 * Cookie header string; never throws on 401 or on network failure.
 */
export async function fetchSessionOnServer(options: {
  baseUrl: string;
  cookie: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): Promise<ServerSession> {
  const doFetch = options.fetch ?? ((...a: Parameters<typeof fetch>) => globalThis.fetch(...a));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await doFetch(`${options.baseUrl.replace(/\/+$/, "")}/auth/me`, {
      headers: { cookie: options.cookie },
      cache: "no-store",
      signal: controller.signal,
    });
    if (res.status === 401) return { status: "unauthorized" };
    if (!res.ok) return { status: "unavailable" };
    return { status: "authenticated", usuario: (await res.json()) as Usuario };
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
