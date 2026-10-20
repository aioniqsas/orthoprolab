import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerFormSchema,
  registerSchema,
  toRegisterPayload,
} from "./schemas";

const valid = {
  nombres: "María José",
  apellidos: "O'Brien-Pérez",
  cedula: "1234567",
  correo: "doc@example.com",
  password: "a".repeat(12),
};

describe("loginSchema", () => {
  it("accepts a valid payload", () => {
    expect(
      loginSchema.safeParse({ correo: "a@b.co", password: "x" }).success,
    ).toBe(true);
  });
  it("rejects invalid email and empty or oversized password", () => {
    expect(loginSchema.safeParse({ correo: "nope", password: "x" }).success).toBe(
      false,
    );
    expect(loginSchema.safeParse({ correo: "a@b.co", password: "" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ correo: "a@b.co", password: "x".repeat(201) })
        .success,
    ).toBe(false);
  });
  it("uses Spanish messages", () => {
    const r = loginSchema.safeParse({ correo: "nope", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map((i) => i.message).join(" ")).toMatch(
        /correo|contraseña/i,
      );
    }
  });
});

describe("registerSchema", () => {
  it("accepts a valid payload", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    [11, false],
    [12, true],
    [200, true],
    [201, false],
  ])("password of %i chars ok=%s", (len, ok) => {
    expect(
      registerSchema.safeParse({ ...valid, password: "a".repeat(len) }).success,
    ).toBe(ok);
  });
  it.each([
    ["1234", false],
    ["12345", true],
    ["123456789012", true],
    ["1234567890123", false],
    ["12a45678", false],
    ["12.345.678", false],
  ])("cedula %s ok=%s", (cedula, ok) => {
    expect(registerSchema.safeParse({ ...valid, cedula }).success).toBe(ok);
  });
  it.each([
    ["", false],
    ["Ana123", false],
    ["Ana<script>", false],
    ["x".repeat(101), false],
    ["x".repeat(100), true],
    ["José Ángel", true],
    ["D'Angelo-Ñúñez", true],
  ])("nombres %j ok=%s", (nombres, ok) => {
    expect(registerSchema.safeParse({ ...valid, nombres }).success).toBe(ok);
  });
  it("validates apellidos like nombres", () => {
    expect(registerSchema.safeParse({ ...valid, apellidos: "R2D2" }).success).toBe(
      false,
    );
  });
  it.each(["not-an-email", "a@b", `${"a".repeat(250)}@x.co`, ""])(
    "rejects email %j",
    (correo) => {
      expect(registerSchema.safeParse({ ...valid, correo }).success).toBe(false);
    },
  );
  it("rejects unknown fields", () => {
    expect(registerSchema.safeParse({ ...valid, rol: "administrador" }).success).toBe(
      false,
    );
  });
});

describe("registerFormSchema", () => {
  it("requires confirmPassword to match", () => {
    const ok = registerFormSchema.safeParse({
      ...valid,
      confirmPassword: valid.password,
    });
    expect(ok.success).toBe(true);
    const bad = registerFormSchema.safeParse({
      ...valid,
      confirmPassword: "different-password",
    });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});

describe("toRegisterPayload", () => {
  it("strips non-API fields and trims text", () => {
    const payload = toRegisterPayload({
      ...valid,
      nombres: "  Ana ",
      correo: " Doc@Example.com ",
      confirmPassword: valid.password,
    });
    expect(payload).toEqual({
      ...valid,
      nombres: "Ana",
      correo: "doc@example.com",
    });
    expect("confirmPassword" in payload).toBe(false);
  });
});
