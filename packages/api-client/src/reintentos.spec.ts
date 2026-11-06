import { describe, expect, it, vi } from "vitest";
import { fetchConReintento } from "./reintentos";

const BASE = "http://api.test";
const opciones = { baseUrl: BASE, esperasMs: [0, 0] };

const jsonResponse = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

describe("fetchConReintento", () => {
  it("adds an Idempotency-Key to the request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { id: "1" }));
    const { respuesta, encolado } = await fetchConReintento(
      `${BASE}/ordenes`,
      { method: "POST", body: JSON.stringify({ a: 1 }) },
      { ...opciones, fetchImpl },
    );

    expect(respuesta.status).toBe(201);
    expect(encolado).toBe(false);
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers as HeadersInit);
    expect(headers.get("Idempotency-Key")).toBeTruthy();
  });

  it("retries a transient failure and keeps the same key", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(201, { id: "1" }));

    const { respuesta, encolado } = await fetchConReintento(
      `${BASE}/ordenes`,
      { method: "POST", body: "{}" },
      { ...opciones, fetchImpl },
    );

    expect(respuesta.status).toBe(201);
    expect(encolado).toBe(false);
    const clave = (call: number) =>
      new Headers(fetchImpl.mock.calls[call]?.[1]?.headers as HeadersInit).get("Idempotency-Key");
    expect(clave(0)).toBe(clave(1));
  });

  it("does not retry a client error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, { message: "malo" }));
    const { respuesta } = await fetchConReintento(
      `${BASE}/ordenes`,
      { method: "POST", body: "{}" },
      { ...opciones, fetchImpl },
    );

    expect(respuesta.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("queues the request when every attempt fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockRejectedValueOnce(new Error("red"))
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce(jsonResponse(202, { jobId: "j1" }));

    const { respuesta, encolado } = await fetchConReintento(
      `${BASE}/ordenes`,
      { method: "POST", body: JSON.stringify({ servicio: "Corona" }), headers: { Cookie: "auth_token=t" } },
      { ...opciones, fetchImpl },
    );

    expect(encolado).toBe(true);
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toMatchObject({ encolado: true });

    const [url, init] = fetchImpl.mock.calls[3]!;
    expect(url).toBe(`${BASE}/internal/retry`);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      method: "POST",
      path: "/ordenes",
      body: { servicio: "Corona" },
    });
    expect(new Headers(init?.headers as HeadersInit).get("Cookie")).toBe("auth_token=t");
  });

  it("reports a network error when the queue is unreachable too", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("red"));

    const { respuesta, encolado } = await fetchConReintento(
      `${BASE}/ordenes`,
      { method: "POST", body: "{}" },
      { ...opciones, fetchImpl },
    );

    expect(encolado).toBe(false);
    expect(respuesta.status).toBe(503);
  });
});
