import { describe, expect, it } from "vitest";
import { ApiError, RateLimitedError, UnauthorizedError } from "./errors";
import { toAuthResult } from "./auth-result";

describe("toAuthResult", () => {
  it("maps rate limiting with the retry delay", () => {
    expect(toAuthResult(new RateLimitedError(42))).toEqual({
      ok: false,
      kind: "rate-limited",
      retryAfterSeconds: 42,
    });
  });
  it("maps 401 to credentials", () => {
    expect(toAuthResult(new UnauthorizedError())).toEqual({ ok: false, kind: "credentials" });
  });
  it("maps 400 to validation", () => {
    expect(toAuthResult(new ApiError(400, { messages: ["raw server text"] }))).toEqual({
      ok: false,
      kind: "validation",
    });
  });
  it.each([500, 502, 503])("maps %i to unavailable", (status) => {
    expect(toAuthResult(new ApiError(status))).toEqual({ ok: false, kind: "unavailable" });
  });
  it("maps network and timeout errors to network", () => {
    expect(toAuthResult(new ApiError(0, { code: "network" }))).toEqual({ ok: false, kind: "network" });
    expect(toAuthResult(new ApiError(0, { code: "timeout" }))).toEqual({ ok: false, kind: "network" });
  });
  it("maps other statuses and unknown errors to unavailable without leaking text", () => {
    expect(toAuthResult(new ApiError(403))).toEqual({ ok: false, kind: "unavailable" });
    expect(toAuthResult(new Error("boom"))).toEqual({ ok: false, kind: "unavailable" });
    expect(toAuthResult("x")).toEqual({ ok: false, kind: "unavailable" });
  });
});
