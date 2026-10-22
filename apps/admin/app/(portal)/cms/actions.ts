"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

type SaveResult = { ok: true } | { ok: false; error: string };

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function saveContenido(
  _prevState: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    // React adds its own bookkeeping entries ($ACTION_*) to the action FormData.
    if (clave.startsWith("$ACTION_")) continue;
    valores[clave] = String(valor);
  }

  const token = (await cookies()).get("auth_token")?.value;

  try {
    const res = await fetch(`${API_URL}/admin/contenido`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: token ? `auth_token=${token}` : "",
      },
      body: JSON.stringify({ valores }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al guardar el contenido") };
    }
    revalidatePath("/cms");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
