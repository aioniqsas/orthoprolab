"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CambiarEstadoResult = { ok: true } | { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

/**
 * Server action bound with the order id:
 *   cambiarEstadoOrden.bind(null, id)
 *
 * FormData fields:
 *   - estadoId: string (numeric DB id of the target estado_orden)
 *   - observaciones: string (optional)
 */
export async function cambiarEstadoOrden(
  id: string,
  _prevState: CambiarEstadoResult | null,
  formData: FormData,
): Promise<CambiarEstadoResult> {
  const estadoId = Number(formData.get("estadoId"));
  const observaciones = (formData.get("observaciones") as string | null) || undefined;

  if (!estadoId || isNaN(estadoId)) {
    return { ok: false, error: "Selecciona un estado válido." };
  }

  try {
    const res = await fetch(`${API_URL}/ordenes/${id}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ estadoId, observaciones }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg)
        ? msg.join(", ")
        : (msg ?? "Error al cambiar el estado");
      return { ok: false, error };
    }

    revalidatePath("/ordenes");
    revalidatePath(`/ordenes/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
