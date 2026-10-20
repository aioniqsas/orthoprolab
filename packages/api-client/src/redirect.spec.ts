import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/", "/"],
    ["/ordenes", "/ordenes"],
    ["/ordenes/12?estado=abierto&q=a%20b", "/ordenes/12?estado=abierto&q=a%20b"],
    ["/a#frag", "/a#frag"],
    ["/redir?to=https://ok.example", "/redir?to=https://ok.example"],
  ])("keeps the same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input, "/home")).toBe(expected);
  });

  it.each([
    ["protocol-relative", "//evil.example"],
    ["protocol-relative with path", "//evil.example/x"],
    ["triple slash", "///evil.example"],
    ["absolute https", "https://evil.example"],
    ["absolute http", "http://evil.example/x"],
    ["javascript scheme", "javascript:alert(1)"],
    ["data scheme", "data:text/html,x"],
    ["backslash host", "/\\evil.example"],
    ["leading backslash", "\\evil.example"],
    ["backslash anywhere", "/ok\\x"],
    ["encoded double slash", "/%2f%2fevil.example"],
    ["encoded double slash upper", "/%2F/evil.example"],
    ["encoded backslash", "/%5cevil.example"],
    ["double encoded slash", "/%252f/evil.example"],
    ["tab inside", "/\t/evil.example"],
    ["newline inside", "/ok\nSet-Cookie: a=b"],
    ["encoded newline", "/ok%0d%0aSet-Cookie:a=b"],
    ["null byte", "/ok\u0000"],
    ["no leading slash", "ordenes"],
    ["empty", ""],
    ["whitespace prefix", " /ok"],
    ["malformed escape", "/%E0%A4%A"],
    ["too long", "/" + "a".repeat(3000)],
  ])("falls back for %s", (_label, input) => {
    expect(safeRedirectPath(input, "/home")).toBe("/home");
  });

  it("falls back for non-string input", () => {
    expect(safeRedirectPath(undefined, "/home")).toBe("/home");
    expect(safeRedirectPath(null, "/home")).toBe("/home");
    expect(safeRedirectPath(["/a", "/b"] as unknown as string, "/home")).toBe("/home");
  });

  it("defaults the fallback to /", () => {
    expect(safeRedirectPath("//x")).toBe("/");
  });
});
