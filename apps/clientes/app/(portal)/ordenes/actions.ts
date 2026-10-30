"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type DevolverOrdenResult = { ok: true } | { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

export async function devolverOrdenAction(
  id: string,
  _prevState: DevolverOrdenResult | null,
  formData: FormData,
): Promise<DevolverOrdenResult> {
  const observaciones = (formData.get("observaciones") as string | null)?.trim() ?? "";

  if (!observaciones) {
    return { ok: false, error: "La observación es obligatoria." };
  }

  try {
    const res = await fetch(`${API_URL}/mi-clinica/ordenes/${id}/devolver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ observaciones }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al devolver la orden");
      return { ok: false, error };
    }

    revalidatePath("/ordenes");
    revalidatePath(`/ordenes/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export type FinalizarOrdenResult = { ok: true } | { ok: false; error: string };

export async function finalizarOrdenAction(
  id: string,
  _prevState: FinalizarOrdenResult | null,
  formData: FormData,
): Promise<FinalizarOrdenResult> {
  const observaciones = (formData.get("observaciones") as string | null)?.trim() || undefined;

  try {
    const res = await fetch(`${API_URL}/mi-clinica/ordenes/${id}/finalizar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ observaciones }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al finalizar la orden");
      return { ok: false, error };
    }

    revalidatePath("/ordenes");
    revalidatePath(`/ordenes/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
