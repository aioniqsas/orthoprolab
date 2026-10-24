"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CrearCuentaResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

export async function crearCuentaCobro(
  _prevState: CrearCuentaResult | null,
  formData: FormData,
): Promise<CrearCuentaResult> {
  const clinicaIdRaw = formData.get("clinicaId") as string | null;
  const clinicaId = clinicaIdRaw ? parseInt(clinicaIdRaw, 10) : null;
  const fechaVencimiento =
    (formData.get("fechaVencimiento") as string | null) || undefined;
  const observaciones =
    (formData.get("observaciones") as string | null) || undefined;

  if (!clinicaId || isNaN(clinicaId)) {
    return { ok: false, error: "Selecciona una clínica." };
  }

  try {
    const res = await fetch(`${API_URL}/cuentas-cobro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ clinicaId, fechaVencimiento, observaciones }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg)
        ? msg.join(", ")
        : (msg ?? "Error al crear la cuenta de cobro");
      return { ok: false, error };
    }

    const created = (await res.json()) as { id: string };
    redirect(`/cuentas-cobro/${created.id}`);
  } catch (err) {
    // redirect() throws — re-throw so Next.js handles it
    if (
      err instanceof Error &&
      err.message.includes("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }

  // TypeScript: unreachable but satisfies return type
  return { ok: false, error: "Error inesperado" };
}
