"use server";

import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export type CodigoWhatsApp = { ok: true; codigo: string; expiraEnSegundos: number };
export type ErrorWhatsApp = { ok: false; error: string };

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

/** Pide el código de vinculación de WhatsApp; la clínica la decide la API con la sesión. */
export async function generarCodigoWhatsApp(): Promise<CodigoWhatsApp | ErrorWhatsApp> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/whatsapp/codigo`, {
      method: "POST",
      headers: { Cookie: await authCookie() },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as
      | { codigo?: string; expiraEnSegundos?: number; message?: string }
      | null;
    if (res.ok && body?.codigo) {
      return { ok: true, codigo: body.codigo, expiraEnSegundos: body.expiraEnSegundos ?? 600 };
    }
    return { ok: false, error: body?.message ?? "No se pudo generar el código." };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}
