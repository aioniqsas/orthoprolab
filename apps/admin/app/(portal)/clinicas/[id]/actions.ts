"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type EditarClinicaResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function editarClinica(
  id: string,
  _prevState: EditarClinicaResult | null,
  formData: FormData,
): Promise<EditarClinicaResult> {
  const nombre = (formData.get("nombre") as string | null)?.trim();
  const direccion = (formData.get("direccion") as string | null)?.trim() || null;
  const correo = (formData.get("correo") as string | null)?.trim() || null;

  if (!nombre) return { ok: false, error: "El nombre de la clínica es obligatorio." };

  try {
    const res = await fetch(`${API_URL}/clinicas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ nombre, direccion, correo }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al actualizar la clínica") };
    }

    revalidatePath("/clinicas");
    revalidatePath(`/clinicas/${id}`);
    redirect(`/clinicas/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  return { ok: false, error: "Error inesperado" };
}

export async function eliminarClinica(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/clinicas/${id}`, {
      method: "DELETE",
      headers: { Cookie: await authCookie() },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al eliminar la clínica") };
    }

    revalidatePath("/clinicas");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
