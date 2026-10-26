"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export type EditarDoctorResult = { ok: false; error: string };

export async function editarDoctor(
  id: string,
  _prevState: EditarDoctorResult | null,
  formData: FormData,
): Promise<EditarDoctorResult> {
  const nombres = (formData.get("nombres") as string | null)?.trim();
  const apellidos = (formData.get("apellidos") as string | null)?.trim();
  const correo = (formData.get("correo") as string | null)?.trim() || null;

  if (!nombres) return { ok: false, error: "Los nombres son obligatorios." };
  if (!apellidos) return { ok: false, error: "Los apellidos son obligatorios." };

  try {
    const res = await fetch(`${API_URL}/mi-clinica/doctores/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ nombres, apellidos, correo }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al actualizar el doctor") };
    }

    revalidatePath(`/doctores/${id}`);
    redirect(`/doctores/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  return { ok: false, error: "Error inesperado" };
}

export async function desactivarDoctor(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/doctores/${id}`, {
      method: "DELETE",
      headers: { Cookie: await authCookie() },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al desactivar el doctor") };
    }

    revalidatePath("/doctores");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
