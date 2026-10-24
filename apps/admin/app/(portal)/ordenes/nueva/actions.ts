"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CrearOrdenResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

/**
 * Server action for the nueva-orden form.
 *
 * FormData fields:
 *   doctorId, pacienteId, fechaEntrega (optional), urgente (optional "on")
 *   servicioId_0, cantidad_0, servicioId_1, cantidad_1, …
 */
export async function crearOrden(
  _prevState: CrearOrdenResult | null,
  formData: FormData,
): Promise<CrearOrdenResult> {
  const doctorId = (formData.get("doctorId") as string | null)?.trim();
  const pacienteId = (formData.get("pacienteId") as string | null)?.trim();

  if (!doctorId) return { ok: false, error: "Selecciona un doctor." };
  if (!pacienteId) return { ok: false, error: "Selecciona un paciente." };

  // Collect dynamic line items.
  const detalles: { servicioId: number; cantidad: number; observaciones?: string }[] = [];
  let index = 0;
  while (formData.has(`servicioId_${index}`)) {
    const servicioId = Number(formData.get(`servicioId_${index}`));
    const cantidad = Number(formData.get(`cantidad_${index}`));
    if (!servicioId || servicioId < 1) {
      return { ok: false, error: `Fila ${index + 1}: selecciona un servicio válido.` };
    }
    if (!cantidad || cantidad < 1 || cantidad > 99) {
      return { ok: false, error: `Fila ${index + 1}: la cantidad debe estar entre 1 y 99.` };
    }
    detalles.push({ servicioId, cantidad });
    index++;
  }

  if (detalles.length === 0) {
    return { ok: false, error: "Agrega al menos un servicio." };
  }

  const fechaEntrega = (formData.get("fechaEntrega") as string | null) || undefined;
  const urgente = formData.get("urgente") === "on";

  const payload = {
    doctorId,
    pacienteId: Number(pacienteId),
    detalles,
    ...(fechaEntrega ? { fechaEntrega } : {}),
    urgente,
  };

  try {
    const res = await fetch(`${API_URL}/ordenes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al crear la orden") };
    }

    const created = (await res.json()) as { id: string };
    redirect(`/ordenes/${created.id}`);
  } catch (err) {
    // redirect() throws — re-throw so Next.js handles navigation.
    if (
      err instanceof Error &&
      err.message === "NEXT_REDIRECT"
    ) {
      throw err;
    }
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  // Unreachable, but TypeScript needs this.
  return { ok: false, error: "Error inesperado" };
}
