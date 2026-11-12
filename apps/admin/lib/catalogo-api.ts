import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "./api";
import type { Servicio } from "./data/types";

async function authHeader(): Promise<HeadersInit> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? { Cookie: `auth_token=${token}` } : {};
}

export async function listCatalogoServicios(q?: string): Promise<Servicio[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios${qs}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Servicio[]>;
  } catch {
    return [];
  }
}

export async function getCatalogoServicio(id: string): Promise<Servicio | null> {
  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<Servicio>;
  } catch {
    return null;
  }
}
