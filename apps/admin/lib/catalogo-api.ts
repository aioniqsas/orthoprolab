import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "./api";
import type { ListaOpciones, ListaPagina } from "./lista-params";
import type { Servicio } from "./data/types";

async function authHeader(): Promise<HeadersInit> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? { Cookie: `auth_token=${token}` } : {};
}

/** ONE page of the admin catalog; counters come from `total`. */
export async function listCatalogoServiciosPage(
  q: string | undefined,
  page: number,
  size: number,
  opts: ListaOpciones = {},
): Promise<ListaPagina<Servicio>> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  params.set("page", String(page));
  params.set("size", String(size));
  if (opts.activo !== undefined) params.set("activo", String(opts.activo));
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.order) params.set("order", opts.order);
  try {
    const res = await fetch(
      `${API_URL}/admin/catalogo/servicios?${params.toString()}`,
      { headers: await authHeader(), cache: "no-store" },
    );
    if (!res.ok) return { data: [], total: 0 };
    const body = (await res.json()) as ListaPagina<Servicio>;
    return { data: body.data, total: body.total };
  } catch {
    return { data: [], total: 0 };
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
