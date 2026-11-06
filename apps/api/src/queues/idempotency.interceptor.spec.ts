import { firstValueFrom, of } from "rxjs";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { IdempotencyInterceptor } from "./idempotency.interceptor.js";

function contexto(method: string, key?: string, status = 201) {
  const respuesta = {
    statusCode: status,
    status(code: number) {
      respuesta.statusCode = code;
      return respuesta;
    },
  };
  const request = {
    method,
    originalUrl: "/ordenes",
    ip: "127.0.0.1",
    headers: key ? { "idempotency-key": key } : {},
    user: { id: "u1" },
  };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => respuesta,
    }),
  } as unknown as ExecutionContext;
  return { ctx, respuesta };
}

function redis(almacen = new Map<string, string>()) {
  return {
    almacen,
    get: vi.fn((k: string) => Promise.resolve(almacen.get(k) ?? null)),
    set: vi.fn((k: string, v: string) => {
      almacen.set(k, v);
      return Promise.resolve("OK");
    }),
  };
}

const handler = (body: unknown): CallHandler => ({ handle: () => of(body) });

describe("IdempotencyInterceptor", () => {
  it("ignores requests without the header", async () => {
    const store = redis();
    const interceptor = new IdempotencyInterceptor(store as never);
    const { ctx } = contexto("POST");

    const resultado = await firstValueFrom(interceptor.intercept(ctx, handler({ id: 1 })));

    expect(resultado).toEqual({ id: 1 });
    expect(store.set).not.toHaveBeenCalled();
  });

  it("ignores read-only methods", async () => {
    const store = redis();
    const interceptor = new IdempotencyInterceptor(store as never);
    const { ctx } = contexto("GET", "clave-valida-123");

    await firstValueFrom(interceptor.intercept(ctx, handler({ ok: true })));
    expect(store.set).not.toHaveBeenCalled();
  });

  it("stores the answer and replays it without running the handler again", async () => {
    const store = redis();
    const interceptor = new IdempotencyInterceptor(store as never);
    const { ctx, respuesta } = contexto("POST", "clave-valida-123");

    const primera = await firstValueFrom(
      interceptor.intercept(ctx, handler({ id: "7" })),
    );
    expect(primera).toEqual({ id: "7" });
    expect(store.set).toHaveBeenCalledTimes(1);

    const segundaHandler = vi.fn(() => of({ id: "duplicado" }));
    respuesta.statusCode = 500;
    const segunda = await firstValueFrom(
      interceptor.intercept(ctx, { handle: segundaHandler } as unknown as CallHandler),
    );

    expect(segunda).toEqual({ id: "7" });
    expect(segundaHandler).not.toHaveBeenCalled();
    expect(respuesta.statusCode).toBe(201);
  });

  it("does not cache an error, so a replay retries", async () => {
    const store = redis();
    const interceptor = new IdempotencyInterceptor(store as never);
    const { ctx } = contexto("POST", "clave-valida-123", 400);

    await firstValueFrom(interceptor.intercept(ctx, handler({ message: "malo" })));
    expect(store.set).not.toHaveBeenCalled();
  });
});
