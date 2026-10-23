"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CrearUsuarioResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function crearUsuario(
  _prevState: CrearUsuarioResult | null,
  formData: FormData,
): Promise<CrearUsuarioResult> {
  const nombres = (formData.get("nombres") as string | null)?.trim();
  const apellidos = (formData.get("apellidos") as string | null)?.trim();
  const correo = (formData.get("correo") as string | null)?.trim();
  const cedula = (formData.get("cedula") as string | null)?.trim();
  const password = (formData.get("password") as string | null) ?? "";
  const rol = (formData.get("rol") as string | null)?.trim();
  const clinicaId = (formData.get("clinicaId") as string | null)?.trim() || undefined;

  if (!nombres) return { ok: false, error: "El campo nombres es obligatorio." };
  if (!apellidos) return { ok: false, error: "El campo apellidos es obligatorio." };
  if (!correo) return { ok: false, error: "El campo correo es obligatorio." };
  if (!cedula) return { ok: false, error: "El campo cédula es obligatorio." };
  if (!/^\d{5,12}$/.test(cedula)) {
    return { ok: false, error: "La cédula debe contener solo dígitos (5–12 caracteres)." };
  }
  if (!password || password.length < 12) {
    return { ok: false, error: "La contraseña debe tener al menos 12 caracteres." };
  }
  if (!rol) return { ok: false, error: "Selecciona un rol." };

  const payload: Record<string, unknown> = { nombres, apellidos, correo, cedula, password, rol };
  if (clinicaId) payload.clinicaId = clinicaId;

  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al crear el usuario") };
    }

    const created = (await res.json()) as { id: string };
    redirect(`/usuarios/${created.id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  // Unreachable, but TypeScript needs this.
  return { ok: false, error: "Error inesperado" };
}
