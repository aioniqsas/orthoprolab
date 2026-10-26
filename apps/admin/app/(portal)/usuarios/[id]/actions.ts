"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type EditarUsuarioResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function editarUsuario(
  id: string,
  _prevState: EditarUsuarioResult | null,
  formData: FormData,
): Promise<EditarUsuarioResult> {
  const nombres = (formData.get("nombres") as string | null)?.trim();
  const apellidos = (formData.get("apellidos") as string | null)?.trim();
  const correo = (formData.get("correo") as string | null)?.trim().toLowerCase();
  const clinicaIdRaw = (formData.get("clinicaId") as string | null)?.trim();

  if (!nombres) return { ok: false, error: "Los nombres son obligatorios." };
  if (!apellidos) return { ok: false, error: "Los apellidos son obligatorios." };
  if (!correo) return { ok: false, error: "El correo es obligatorio." };

  const payload: Record<string, unknown> = { nombres, apellidos, correo };
  if (clinicaIdRaw !== null) {
    payload.clinicaId = clinicaIdRaw ? parseInt(clinicaIdRaw, 10) : null;
  }

  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al actualizar el usuario") };
    }

    revalidatePath("/usuarios");
    revalidatePath(`/usuarios/${id}`);
    redirect(`/usuarios/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  return { ok: false, error: "Error inesperado" };
}

export async function toggleActivoUsuario(
  id: string,
  activo: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ activo }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al cambiar el estado") };
    }

    revalidatePath("/usuarios");
    revalidatePath(`/usuarios/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function regenerarCredenciales(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/usuarios/${id}/regenerar-credenciales`, {
      method: "POST",
      headers: { Cookie: await authCookie() },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al regenerar credenciales") };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
