"use client";

import Link from "next/link";
import { toAuthResult } from "@repo/api-client";
import type { RegisterInput } from "@repo/api-client/schemas";
import { AuthShell } from "@repo/ui/auth/auth-shell";
import { RegisterForm } from "@repo/ui/auth/register-form";
import type { AuthResult } from "@repo/ui/lib/auth-types";
import { api } from "@/lib/api";

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

async function onSubmit(values: RegisterInput): Promise<AuthResult> {
  try {
    await api.auth.register(values);
    return { ok: true };
  } catch (error) {
    return toAuthResult(error);
  }
}

export function RegistroScreen() {
  return (
    <AuthShell
      productName="Portal de clientes"
      eyebrow="Odontólogos y clínicas"
      heading="Crea tu cuenta"
      description="Registra tus datos para acceder al portal de clientes."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className={linkClass}>
            Inicia sesión
          </Link>
        </>
      }
    >
      <RegisterForm
        onSubmit={onSubmit}
        successSlot={
          <Link href="/login" className={linkClass}>
            Ir a iniciar sesión
          </Link>
        }
      />
    </AuthShell>
  );
}
