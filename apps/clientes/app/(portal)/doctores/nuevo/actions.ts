"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CrearDoctorResult = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

export async function crearDoctor(
  _prevState: CrearDoctorResult | null,
  formData: FormData,
): Promise<CrearDoctorResult> {
  const nombres = (formData.get("nombres") as string | null)?.trim();
  const apellidos = (formData.get("apellidos") as string | null)?.trim();
  const correo = (formData.get("correo") as string | null)?.trim() || null;

  if (!nombres) return { ok: false, error: "Los nombres son obligatorios." };
  if (!apellidos) return { ok: false, error: "Los apellidos son obligatorios." };

  try {
    const res = await fetch(`${API_URL}/mi-clinica/doctores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ nombres, apellidos, correo }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: errorFrom(body, "Error al crear el doctor") };
    }

    const created = (await res.json()) as { id: string };
    revalidatePath("/doctores");
    redirect(`/doctores/${created.id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
  return { ok: false, error: "Error inesperado" };
}
