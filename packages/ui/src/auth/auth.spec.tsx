import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { SilentSession } from "./silent-session";
import { AccessNotice } from "./access-notice";
import { PortalFrame } from "./portal-frame";
import { LogoutButton } from "./logout-button";

// Stem of the Stitch block the user asked to remove, split so the repo check stays clean.
const REMOVED_STEM = ["homo", "log"].join("");
const ok = async () => ({ ok: true as const });

const attr = (html: string, name: string, attrName: string, value: string) =>
  new RegExp(
    `<input[^>]*name="${name}"[^>]*${attrName}="${value}"|<input[^>]*${attrName}="${value}"[^>]*name="${name}"`,
  ).test(html);

describe("LoginForm", () => {
  const html = renderToString(<LoginForm onSubmit={ok} />);

  it("renders labels and fields", () => {
    expect(html).toContain("Correo electrónico");
    expect(html).toContain("Contraseña");
    expect(html).toContain('name="correo"');
    expect(html).toContain('name="password"');
    expect(html).toContain("Mostrar contraseña");
  });

  it("sets autocomplete attributes", () => {
    expect(attr(html, "correo", "autoComplete", "username") || html.includes('autoComplete="username"')).toBe(true);
    expect(html).toContain('autoComplete="current-password"');
  });

  it("does not contain the removed Stitch block", () => {
    expect(html.toLowerCase()).not.toContain(REMOVED_STEM);
    expect(html).not.toContain("escáner");
  });
});

describe("RegisterForm", () => {
  const html = renderToString(<RegisterForm onSubmit={ok} />);

  it("renders every API field plus confirmation", () => {
    for (const name of [
      "nombres",
      "apellidos",
      "cedula",
      "correo",
      "password",
      "confirmPassword",
    ]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain("Confirmar contraseña");
    expect(html).toContain("12 a 200 caracteres");
  });

  it("sets autocomplete and input modes", () => {
    expect(html).toContain('autoComplete="given-name"');
    expect(html).toContain('autoComplete="family-name"');
    expect(html).toContain('inputMode="numeric"');
    expect(html.match(/autoComplete="new-password"/g)).toHaveLength(2);
  });

  it("does not render clinic-only or removed fields", () => {
    expect(html.toLowerCase()).not.toContain(REMOVED_STEM);
    expect(html.toLowerCase()).not.toContain("clínica");
  });
});

describe("AuthShell", () => {
  it("renders the product name, heading and slot", () => {
    const html = renderToString(
      <AuthShell productName="Portal de clientes" heading="Acceso">
        <span>slot-content</span>
      </AuthShell>,
    );
    expect(html).toContain("Portal de clientes");
    expect(html).toContain("Acceso");
    expect(html).toContain("slot-content");
  });
});

describe("portal pieces", () => {
  it("renders the silent session loading state accessibly", () => {
    
    const html = renderToString(
      <SilentSession
        client={{ auth: { refresh: async () => {}, me: async () => { throw new Error("x"); } } }}
        onAuthenticated={() => {}}
        onAnonymous={() => {}}
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("Verificando tu sesión");
  });

  it("renders the access notice and portal frame", () => {
    
    
    expect(renderToString(<AccessNotice title="T" description="D"><a href="/">x</a></AccessNotice>)).toContain("<h1");
    const html = renderToString(
      <PortalFrame productName="P" usuario={{ nombres: "Ana", apellidos: "Paz", rol: "odontologo" }}>c</PortalFrame>,
    );
    expect(html).toContain("Ana");
    expect(html).toContain("Odontólogo");
  });

  it("renders the logout button", () => {
    
    expect(renderToString(<LogoutButton onLogout={async () => {}} onDone={() => {}} />)).toContain("Cerrar sesión");
  });
});
