"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type ActionResult = { ok: boolean; error?: string };
export type PdfResult = { ok: boolean; pdfUrl?: string; error?: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

async function authHeaders(): Promise<HeadersInit> {
  return {
    "Content-Type": "application/json",
    Cookie: await authCookie(),
  };
}

function revalidateCuenta(id: string) {
  revalidatePath("/cuentas-cobro");
  revalidatePath(`/cuentas-cobro/${id}`);
}

async function extractError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error del servidor");
}

export async function adjuntarOrdenes(
  cuentaId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ordenIds = formData.getAll("ordenId").map(Number);
  if (ordenIds.length === 0) {
    return { ok: false, error: "Selecciona al menos una orden." };
  }

  // The amount is decided here: orders no longer carry a price.
  const ordenes = ordenIds.map((ordenId) => ({
    ordenId,
    valor: Number(formData.get(`valor_${ordenId}`)),
  }));
  if (ordenes.some((o) => !Number.isFinite(o.valor) || o.valor < 0)) {
    return { ok: false, error: "Indica el valor de cada orden seleccionada." };
  }

  try {
    const res = await fetch(`${API_URL}/cuentas-cobro/${cuentaId}/ordenes`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ ordenes }),
    });
    if (!res.ok) return { ok: false, error: await extractError(res) };
    revalidateCuenta(cuentaId);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function registrarPago(
  cuentaId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const monto = formData.get("monto") as string | null;
  const fechaPago = formData.get("fechaPago") as string | null;
  const metodo = formData.get("metodo") as string | null;
  const referencia = (formData.get("referencia") as string | null) || undefined;
  const notas = (formData.get("notas") as string | null) || undefined;

  if (!monto || !fechaPago || !metodo) {
    return { ok: false, error: "Monto, fecha y método son obligatorios." };
  }

  try {
    const res = await fetch(`${API_URL}/cuentas-cobro/${cuentaId}/pagos`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ monto, fechaPago, metodo, referencia, notas }),
    });
    if (!res.ok) return { ok: false, error: await extractError(res) };
    revalidateCuenta(cuentaId);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function generarPdf(cuentaId: string): Promise<PdfResult> {
  try {
    const res = await fetch(`${API_URL}/cuentas-cobro/${cuentaId}/pdf`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) return { ok: false, error: await extractError(res) };
    const data = (await res.json()) as { pdfUrl?: string };
    revalidateCuenta(cuentaId);
    return { ok: true, pdfUrl: data.pdfUrl };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function enviarEmail(
  cuentaId: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get("email") as string | null;
  if (!email) {
    return { ok: false, error: "Ingresa un correo electrónico." };
  }
  try {
    const res = await fetch(`${API_URL}/cuentas-cobro/${cuentaId}/enviar`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return { ok: false, error: await extractError(res) };
    revalidateCuenta(cuentaId);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function anularPago(
  cuentaId: string,
  pagoId: string,
  _formData: FormData,
): Promise<void> {
  try {
    const res = await fetch(
      `${API_URL}/cuentas-cobro/${cuentaId}/pagos/${pagoId}/anular`,
      {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({}),
      },
    );
    if (res.ok) {
      revalidateCuenta(cuentaId);
    }
  } catch {
    // silently fail — user sees no state change
  }
}
