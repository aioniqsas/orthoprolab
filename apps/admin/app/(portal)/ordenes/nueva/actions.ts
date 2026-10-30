"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { parseColor, parseDientes } from "@repo/api-client";
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
  const pacienteCedula = (formData.get("pacienteCedula") as string | null)?.trim();
  const pacienteNombre = (formData.get("pacienteNombre") as string | null)?.trim();

  if (!doctorId) return { ok: false, error: "Selecciona un doctor." };
  if (!pacienteId && !pacienteCedula) {
    return { ok: false, error: "Ingresa la cédula del paciente." };
  }
  if (!pacienteId && !pacienteNombre) {
    return { ok: false, error: "Ingresa el nombre del paciente." };
  }

  // Collect dynamic line items.
  const detalles: {
    servicioId: number;
    cantidad: number;
    dientes: number[];
    colorDiente: string;
    observaciones?: string;
  }[] = [];
  let index = 0;
  while (formData.has(`servicioId_${index}`)) {
    const servicioId = Number(formData.get(`servicioId_${index}`));
    const cantidad = Number(formData.get(`cantidad_${index}`));
    if (!servicioId || servicioId < 1) {
      return { ok: false, error: `Fila ${index + 1}: selecciona una clase de trabajo válida.` };
    }
    if (!cantidad || cantidad < 1 || cantidad > 99) {
      return { ok: false, error: `Fila ${index + 1}: la cantidad debe estar entre 1 y 99.` };
    }
    const dientes = parseDientes(formData.get(`dientes_${index}`));
    if (!dientes.ok) {
      return { ok: false, error: `Fila ${index + 1}: ${dientes.error}` };
    }
    const color = parseColor(formData.get(`color_${index}`));
    if (!color.ok) {
      return { ok: false, error: `Fila ${index + 1}: ${color.error}` };
    }
    detalles.push({
      servicioId,
      cantidad,
      dientes: dientes.dientes,
      colorDiente: color.color,
    });
    index++;
  }

  if (detalles.length === 0) {
    return { ok: false, error: "Agrega al menos una clase de trabajo." };
  }

  const fechaEntrega = (formData.get("fechaEntrega") as string | null) || undefined;
  const urgente = formData.get("urgente") === "on";

  const payload = pacienteId
    ? {
        doctorId,
        pacienteId: Number(pacienteId),
        detalles,
        ...(fechaEntrega ? { fechaEntrega } : {}),
        urgente,
      }
    : {
        doctorId,
        pacienteCedula,
        pacienteNombre,
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
