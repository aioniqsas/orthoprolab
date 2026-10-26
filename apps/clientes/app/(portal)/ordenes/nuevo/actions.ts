"use server";
import { revalidatePath } from "next/cache";
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

export async function crearOrden(
  _prevState: CrearOrdenResult | null,
  formData: FormData,
): Promise<CrearOrdenResult> {
  const doctorId = (formData.get("doctorId") as string | null)?.trim();
  const pacienteId = (formData.get("pacienteId") as string | null)?.trim();
  const pacienteCedula = (formData.get("pacienteCedula") as string | null)?.trim();
  const pacienteNombre = (formData.get("pacienteNombre") as string | null)?.trim();
  const detallesJson = (formData.get("detalles") as string | null)?.trim();
  const urgente = formData.get("urgente") === "on";
  const fechaEntrega = (formData.get("fechaEntrega") as string | null)?.trim() || undefined;

  if (!doctorId) return { ok: false, error: "Seleccioná un doctor." };
  if (!pacienteId && !pacienteCedula) {
    return { ok: false, error: "Ingresá la cédula del paciente." };
  }
  if (!pacienteId && !pacienteNombre) {
    return { ok: false, error: "Ingresá el nombre del paciente." };
  }
  if (!detallesJson) return { ok: false, error: "Agregá al menos un servicio." };

  let detalles: Array<{ servicioId: number; cantidad: number; observaciones?: string }>;
  try {
    detalles = JSON.parse(detallesJson);
  } catch {
    return { ok: false, error: "Error al procesar los servicios." };
  }

  if (!Array.isArray(detalles) || detalles.length === 0) {
    return { ok: false, error: "Agregá al menos un servicio." };
  }

  const pacientePayload = pacienteId
    ? { pacienteId: Number(pacienteId) }
    : { pacienteCedula, pacienteNombre };

  try {
    const res = await fetch(`${API_URL}/mi-clinica/ordenes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({
        doctorId,
        ...pacientePayload,
        detalles,
        urgente,
        fechaEntrega: fechaEntrega || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al crear la orden.") };
    }

    const created = (await res.json()) as { id: string };
    revalidatePath("/ordenes");
    redirect(`/ordenes/${created.id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
  return { ok: false, error: "Error inesperado." };
}
