"use server";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";

export type ForgotPasswordResult = { ok: false; error: string } | { ok: true; message: string };
export type ResetPasswordResult = { ok: false; error: string };

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function forgotPassword(
  _prevState: ForgotPasswordResult | null,
  formData: FormData,
): Promise<ForgotPasswordResult> {
  const correo = (formData.get("correo") as string | null)?.trim().toLowerCase();

  if (!correo) return { ok: false, error: "El correo electrónico es obligatorio." };

  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al procesar la solicitud.") };
    }

    return {
      ok: true,
      message: "Si el correo existe en el sistema, recibirás un enlace para restablecer tu contraseña.",
    };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}

export async function resetPassword(
  _prevState: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const token = (formData.get("token") as string | null)?.trim();
  const nuevaPassword = (formData.get("nuevaPassword") as string | null) ?? "";
  const confirmarPassword = (formData.get("confirmarPassword") as string | null) ?? "";

  if (!token) return { ok: false, error: "Token inválido." };
  if (!nuevaPassword || nuevaPassword.length < 12) {
    return { ok: false, error: "La contraseña debe tener al menos 12 caracteres." };
  }
  if (nuevaPassword !== confirmarPassword) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  try {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, nuevaPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "El enlace no es válido o ya expiró.") };
    }

    redirect("/login");
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
  // Unreachable
  return { ok: false, error: "Error inesperado." };
}
