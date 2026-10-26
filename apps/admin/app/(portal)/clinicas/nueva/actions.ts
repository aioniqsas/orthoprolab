"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CrearClinicaResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function crearClinica(
  _prevState: CrearClinicaResult | null,
  formData: FormData,
): Promise<CrearClinicaResult> {
  const nombre = (formData.get("nombre") as string | null)?.trim();
  const direccion = (formData.get("direccion") as string | null)?.trim() || undefined;
  const correo = (formData.get("correo") as string | null)?.trim();
  const adminNombres = (formData.get("adminNombres") as string | null)?.trim();
  const adminApellidos = (formData.get("adminApellidos") as string | null)?.trim();
  const adminCedula = (formData.get("adminCedula") as string | null)?.trim();

  if (!nombre) return { ok: false, error: "El nombre de la clínica es obligatorio." };
  if (!correo) return { ok: false, error: "El correo electrónico es obligatorio." };
  if (!adminNombres) return { ok: false, error: "Los nombres del administrador son obligatorios." };
  if (!adminApellidos) return { ok: false, error: "Los apellidos del administrador son obligatorios." };
  if (!adminCedula) return { ok: false, error: "La cédula del administrador es obligatoria." };
  if (!/^\d{5,12}$/.test(adminCedula)) {
    return { ok: false, error: "La cédula debe contener solo dígitos (5–12 caracteres)." };
  }

  const payload: Record<string, unknown> = {
    nombre,
    correo,
    adminNombres,
    adminApellidos,
    adminCedula,
  };
  if (direccion) payload.direccion = direccion;

  try {
    const res = await fetch(`${API_URL}/clinicas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al crear la clínica") };
    }

    const created = (await res.json()) as { id: string };
    redirect(`/clinicas/${created.id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  // Unreachable, but TypeScript needs this.
  return { ok: false, error: "Error inesperado" };
}
