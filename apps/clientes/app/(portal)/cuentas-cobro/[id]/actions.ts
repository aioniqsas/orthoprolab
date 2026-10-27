"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type ComprobanteResult = { ok: true } | { ok: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024;

function errorFrom(body: unknown, fallback: string): string {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
}

export async function subirComprobante(
  cuentaId: string,
  _prevState: ComprobanteResult | null,
  formData: FormData,
): Promise<ComprobanteResult> {
  const archivo = formData.get("comprobante");
  const monto = (formData.get("monto") as string | null)?.trim();
  const fechaPago = (formData.get("fechaPago") as string | null)?.trim();
  const referencia = (formData.get("referencia") as string | null)?.trim();
  const notas = (formData.get("notas") as string | null)?.trim();

  if (!monto || !fechaPago) {
    return { ok: false, error: "Monto y fecha de pago son obligatorios." };
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Adjunta el comprobante de pago." };
  }
  if (archivo.size > MAX_BYTES) {
    return { ok: false, error: "El comprobante supera el máximo de 5 MB." };
  }

  const body = new FormData();
  body.set("monto", monto);
  body.set("fechaPago", fechaPago);
  if (referencia) body.set("referencia", referencia);
  if (notas) body.set("notas", notas);
  body.set("comprobante", archivo);

  try {
    const token = (await cookies()).get("auth_token")?.value;
    const res = await fetch(`${API_URL}/mi-clinica/cuentas-cobro/${cuentaId}/pagos`, {
      method: "POST",
      headers: token ? { Cookie: `auth_token=${token}` } : {},
      body,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(json, "No se pudo registrar el pago.") };
    }
    revalidatePath("/cuentas-cobro");
    revalidatePath(`/cuentas-cobro/${cuentaId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}
