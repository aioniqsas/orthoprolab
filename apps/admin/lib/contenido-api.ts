import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "./api";

export type ContenidoTipo = "texto" | "parrafo" | "imagen";

/** One editable field with the value saved for it; `null` means "site default". */
export interface ContenidoCampo {
  clave: string;
  etiqueta: string;
  tipo: ContenidoTipo;
  ayuda?: string;
  valor: string | null;
}

export interface ContenidoGrupo {
  grupo: string;
  campos: ContenidoCampo[];
}

/** Shape returned by `GET` and `PUT /admin/contenido`. */
export interface ContenidoAdmin {
  grupos: ContenidoGrupo[];
  /** Allowed values for the `imagen` fields. */
  imagenes: string[];
}

async function authHeader(): Promise<HeadersInit> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? { Cookie: `auth_token=${token}` } : {};
}

export async function listContenidoAdmin(): Promise<ContenidoAdmin | null> {
  try {
    const res = await fetch(`${API_URL}/admin/contenido`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<ContenidoAdmin>;
  } catch {
    return null;
  }
}
