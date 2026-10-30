import { afterEach, describe, expect, it, vi } from "vitest";
import { isJwtExpired, renewSessionOnce } from "./session-refresh";

/** Builds an unsigned JWT with the given `exp` (seconds since epoch). */
function jwtWithExp(exp: number): string {
  const b64url = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url({ alg: "none" })}.${b64url({ exp })}.signature`;
}

function refreshResponse(...setCookies: string[]): Response {
  const headers = new Headers();
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify({ message: "ok" }), { status: 200, headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("isJwtExpired", () => {
  const now = 1_000_000;

  it("treats a token without exp, or garbage, as expired", () => {
    expect(isJwtExpired(undefined, now)).toBe(true);
    expect(isJwtExpired("not-a-jwt", now)).toBe(true);
    expect(isJwtExpired("a.b.c", now)).toBe(true);
  });

  it("is false while the token is still valid", () => {
    expect(isJwtExpired(jwtWithExp(now / 1000 + 600), now)).toBe(false);
  });

  it("is true once exp passed", () => {
    expect(isJwtExpired(jwtWithExp(now / 1000 - 1), now)).toBe(true);
  });

  it("is true inside the skew window", () => {
    expect(isJwtExpired(jwtWithExp(now / 1000 + 5), now)).toBe(true);
  });
});

describe("renewSessionOnce", () => {
  it("sends the refresh cookie and returns the rotated tokens", async () => {
    const fetchMock = vi.fn(async () =>
      refreshResponse(
        "auth_token=new-access; Path=/; HttpOnly; SameSite=Strict",
        "refresh_token=new-refresh; Path=/; HttpOnly; SameSite=Strict",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await renewSessionOnce("http://api", "old-refresh");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api/auth/refresh");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).cookie).toBe(
      "refresh_token=old-refresh",
    );
    expect(result?.accessToken).toBe("new-access");
    expect(result?.refreshToken).toBe("new-refresh");
    expect(result?.setCookies).toHaveLength(2);
  });

  it("returns null on 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    expect(await renewSessionOnce("http://api", "dead")).toBeNull();
  });

  it("returns null on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))));
    expect(await renewSessionOnce("http://api", "dead")).toBeNull();
  });

  it("returns null when the response lacks a token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => refreshResponse("refresh_token=only-refresh; Path=/")),
    );
    expect(await renewSessionOnce("http://api", "dead")).toBeNull();
  });

  it("shares one request between concurrent callers with the same token", async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((r) => (resolve = r)),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = renewSessionOnce("http://api", "same");
    const second = renewSessionOnce("http://api", "same");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve(
      refreshResponse(
        "auth_token=a2; Path=/",
        "refresh_token=r2; Path=/",
      ),
    );
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(a?.accessToken).toBe("a2");
  });
});
