import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  RateLimitedError,
  UnauthorizedError,
  createApiClient,
  fetchSessionOnServer,
} from "./index.js";

const usuario = {
  id: "1",
  nombres: "Ana",
  apellidos: "Perez",
  correo: "a@b.co",
  rol: "odontologo",
};

const json = (status: number, body?: unknown, headers?: HeadersInit) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const make = (fetchImpl: typeof fetch, timeoutMs?: number) =>
  createApiClient({ baseUrl: "http://api.test/", fetch: fetchImpl, timeoutMs });

afterEach(() => vi.useRealTimers());

describe("auth endpoints", () => {
  it("login posts credentials with credentials include and returns the user", async () => {
    const f = vi.fn(async () => json(200, { usuario }));
    const r = await make(f).auth.login({ correo: "a@b.co", password: "x" });
    expect(r).toEqual(usuario);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/auth/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body as string)).toEqual({
      correo: "a@b.co",
      password: "x",
    });
  });

  it("register returns the message on 201", async () => {
    const f = vi.fn(async () => json(201, { message: "ok" }));
    const r = await make(f).auth.register({
      nombres: "Ana",
      apellidos: "Perez",
      cedula: "12345",
      correo: "a@b.co",
      password: "a".repeat(12),
    });
    expect(r).toEqual({ message: "ok" });
  });

  it("register surfaces 503 as ApiError with a generic message", async () => {
    const f = vi.fn(async () => json(503, { message: "email exists: a@b.co" }));
    const err = await make(f)
      .auth.register({
        nombres: "Ana",
        apellidos: "Perez",
        cedula: "12345",
        correo: "a@b.co",
        password: "a".repeat(12),
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(503);
    expect((err as ApiError).message).not.toContain("a@b.co");
  });

  it("400 exposes validation messages array", async () => {
    const f = vi.fn(async () =>
      json(400, { statusCode: 400, message: ["a", "b"], error: "Bad Request" }),
    );
    const err = (await make(f)
      .auth.login({ correo: "a@b.co", password: "x" })
      .catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(400);
    expect(err.messages).toEqual(["a", "b"]);
  });

  it("login 401 is UnauthorizedError and never triggers refresh", async () => {
    const f = vi.fn(async () => json(401, { message: "x" }));
    const err = await make(f)
      .auth.login({ correo: "a@b.co", password: "x" })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("login 429 parses Retry-After", async () => {
    const f = vi.fn(async () => json(429, {}, { "Retry-After": "300" }));
    const err = (await make(f)
      .auth.login({ correo: "a@b.co", password: "x" })
      .catch((e: unknown) => e)) as RateLimitedError;
    expect(err).toBeInstanceOf(RateLimitedError);
    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(300);
  });

  it("429 without a valid Retry-After falls back to a default", async () => {
    const f = vi.fn(async () => json(429, {}, { "Retry-After": "soon" }));
    const err = (await make(f)
      .auth.login({ correo: "a@b.co", password: "x" })
      .catch((e: unknown) => e)) as RateLimitedError;
    expect(err.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("logout resolves on 204 and refresh on 200", async () => {
    const f = vi.fn(async () => json(204));
    await expect(make(f).auth.logout()).resolves.toBeUndefined();
    const g = vi.fn(async () => json(200, {}));
    await expect(make(g).auth.refresh()).resolves.toBeUndefined();
  });

  it("refresh and logout failures never loop", async () => {
    const f = vi.fn(async () => json(401));
    await expect(make(f).auth.refresh()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(f).toHaveBeenCalledTimes(1);
    const g = vi.fn(async () => json(401));
    await expect(make(g).auth.logout()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(g).toHaveBeenCalledTimes(1);
  });
});

describe("refresh on 401", () => {
  it("me: refreshes once then retries and succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(200, usuario));
    const r = await make(f as unknown as typeof fetch).auth.me();
    expect(r).toEqual(usuario);
    const urls = f.mock.calls.map((c) => c[0]);
    expect(urls).toEqual([
      "http://api.test/auth/me",
      "http://api.test/auth/refresh",
      "http://api.test/auth/me",
    ]);
  });

  it("refresh failure surfaces UnauthorizedError without retrying", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(401));
    await expect(
      make(f as unknown as typeof fetch).auth.me(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("retries only once when the retry is still 401", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, {}))
      .mockResolvedValueOnce(json(401));
    await expect(
      make(f as unknown as typeof fetch).auth.me(),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("single-flight: N parallel 401s cause ONE refresh", async () => {
    let refreshCalls = 0;
    const seen = new Set<string>();
    const f = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 5));
        return json(200, {});
      }
      const key = url;
      if (!seen.has(key)) {
        seen.add(key);
        return json(401);
      }
      return json(200, { ok: true });
    });
    const client = make(f as unknown as typeof fetch);
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) => client.request(`/things/${n}`)),
    );
    expect(results).toHaveLength(5);
    expect(refreshCalls).toBe(1);
  });

  it("a new refresh can start after the previous one settled", async () => {
    let refreshCalls = 0;
    let me = 0;
    const f = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return json(200, {});
      }
      me += 1;
      return me % 2 === 1 ? json(401) : json(200, usuario);
    });
    const client = make(f as unknown as typeof fetch);
    await client.auth.me();
    await client.auth.me();
    expect(refreshCalls).toBe(2);
  });
});

describe("timeout and network", () => {
  it("aborts after timeoutMs and throws ApiError with code timeout", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const p = make(f as unknown as typeof fetch, 1000)
      .auth.login({ correo: "a@b.co", password: "x" })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1001);
    const err = (await p) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("timeout");
  });

  it("maps fetch rejections to ApiError code network", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("failed");
    });
    const err = (await make(f as unknown as typeof fetch)
      .auth.login({ correo: "a@b.co", password: "x" })
      .catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("network");
  });
});

describe("fetchSessionOnServer", () => {
  it("forwards the Cookie header and returns the user", async () => {
    const f = vi.fn(async () => json(200, usuario));
    const r = await fetchSessionOnServer({
      baseUrl: "http://api.test",
      cookie: "auth_token=abc",
      fetch: f as unknown as typeof fetch,
    });
    expect(r).toEqual({ status: "authenticated", usuario });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/auth/me");
    expect((init.headers as Record<string, string>).cookie).toBe("auth_token=abc");
    expect(init.cache).toBe("no-store");
  });

  it("returns unauthorized on 401 without throwing", async () => {
    const f = vi.fn(async () => json(401));
    const r = await fetchSessionOnServer({
      baseUrl: "http://api.test",
      cookie: "",
      fetch: f as unknown as typeof fetch,
    });
    expect(r).toEqual({ status: "unauthorized" });
  });

  it("returns unavailable on other failures", async () => {
    const f = vi.fn(async () => json(500));
    const r = await fetchSessionOnServer({
      baseUrl: "http://api.test",
      cookie: "x=1",
      fetch: f as unknown as typeof fetch,
    });
    expect(r).toEqual({ status: "unavailable" });
    const g = vi.fn(async () => {
      throw new Error("down");
    });
    expect(
      await fetchSessionOnServer({
        baseUrl: "http://api.test",
        cookie: "x=1",
        fetch: g as unknown as typeof fetch,
      }),
    ).toEqual({ status: "unavailable" });
  });
});
