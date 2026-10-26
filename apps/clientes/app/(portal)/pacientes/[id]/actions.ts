"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type ActualizarPacienteResult = { ok: boolean; error?: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function actualizarPaciente(
  id: string,
  _prevState: ActualizarPacienteResult | null,
  formData: FormData,
): Promise<ActualizarPacienteResult> {
  const nombre = (formData.get("nombre") as string | null)?.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  try {
    const res = await fetch(`${API_URL}/mi-clinica/pacientes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ nombre }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al actualizar el paciente.") };
    }

    revalidatePath(`/pacientes/${id}`);
    revalidatePath("/pacientes");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}
