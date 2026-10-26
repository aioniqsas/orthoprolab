"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CrearPacienteResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function crearPaciente(
  _prevState: CrearPacienteResult | null,
  formData: FormData,
): Promise<CrearPacienteResult> {
  const cedula = (formData.get("cedula") as string | null)?.trim();
  const nombre = (formData.get("nombre") as string | null)?.trim();

  if (!cedula) return { ok: false, error: "La cédula es obligatoria." };
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  try {
    const res = await fetch(`${API_URL}/mi-clinica/pacientes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ cedula, nombre }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al crear el paciente.") };
    }

    revalidatePath("/pacientes");
    redirect("/pacientes");
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
  return { ok: false, error: "Error inesperado." };
}
