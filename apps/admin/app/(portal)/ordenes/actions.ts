"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CambiarEstadoFilaResult = { ok: true } | { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

export async function cambiarEstadoFila(
  _prevState: CambiarEstadoFilaResult | null,
  formData: FormData,
): Promise<CambiarEstadoFilaResult> {
  const ordenId = formData.get("ordenId") as string | null;
  const estadoId = formData.get("estadoId") as string | null;
  const observaciones = (formData.get("observaciones") as string | null) || undefined;

  if (!ordenId || !estadoId) {
    return { ok: false, error: "Datos incompletos." };
  }

  try {
    const res = await fetch(`${API_URL}/ordenes/${ordenId}/estado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ estadoId: Number(estadoId), observaciones }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      return { ok: false, error: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al cambiar el estado") };
    }

    revalidatePath("/ordenes");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}