import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";
import type { ListaOpciones, ListaPagina } from "@/lib/lista-params";
import type {
  CuentaCobro,
  CuentaCobroDetalle,
  Doctor,
  MetodoPagoBancario,
  Orden,
  PacienteConCedula,
  PacienteDoctor,
} from "./types";

async function authHeader(): Promise<HeadersInit> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? { Cookie: `auth_token=${token}` } : {};
}

// ─── Doctores ───────────────────────────────────────────────────────────────

interface PaginatedResponse<T> extends ListaPagina<T> {
  page: number;
  size: number;
}

function listaParams(
  q: string | undefined,
  page: number,
  size: number,
  opts: ListaOpciones = {},
): string {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  params.set("page", String(page));
  params.set("size", String(size));
  if (opts.grupo) params.set("grupo", opts.grupo);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.order) params.set("order", opts.order);
  return params.toString();
}

/** ONE page of a list endpoint; the table gets its counters from `total`. */
async function fetchPage<T>(path: string): Promise<ListaPagina<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return { data: [], total: 0 };
    const body = (await res.json()) as PaginatedResponse<T>;
    return { data: body.data, total: body.total };
  } catch {
    return { data: [], total: 0 };
  }
}

/**
 * Reads every page of a paginated endpoint as one array. Only for reference
 * data consumed whole (a patient detail lookup) — never for a table.
 */
async function fetchAllPages<T>(path: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const data: T[] = [];
  let page = 1;
  let total = Infinity;
  while (data.length < total) {
    const res = await fetch(`${API_URL}${path}${sep}page=${page}&size=100`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return data;
    const body = (await res.json()) as PaginatedResponse<T>;
    data.push(...body.data);
    total = body.total;
    if (body.data.length === 0) break;
    page += 1;
  }
  return data;
}

export async function listDoctores(includeInactive = false): Promise<Doctor[]> {
  try {
    const url = includeInactive
      ? `${API_URL}/mi-clinica/doctores?includeInactive=true`
      : `${API_URL}/mi-clinica/doctores`;
    const res = await fetch(url, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Doctor[]>;
  } catch {
    return [];
  }
}

export async function getDoctor(id: string): Promise<Doctor | null> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/doctores/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<Doctor>;
  } catch {
    return null;
  }
}

// ─── Órdenes ────────────────────────────────────────────────────────────────

export async function listOrdenesPage(
  q: string | undefined,
  page: number,
  size: number,
  opts: ListaOpciones = {},
): Promise<ListaPagina<Orden>> {
  return fetchPage<Orden>(`/mi-clinica/ordenes?${listaParams(q, page, size, opts)}`);
}

export async function getOrden(id: string): Promise<Orden | null> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/ordenes/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<Orden>;
  } catch {
    return null;
  }
}

// ─── Pacientes (by doctor) ──────────────────────────────────────────────────

export async function listPacientesDelDoctor(doctorId: string): Promise<PacienteDoctor[]> {
  try {
    return await fetchAllPages<PacienteDoctor>(
      `/mi-clinica/pacientes?doctorId=${encodeURIComponent(doctorId)}`,
    );
  } catch {
    return [];
  }
}

// ─── Pacientes (all in clinic) ──────────────────────────────────────────────

export async function listPacientesPage(
  q: string | undefined,
  page: number,
  size: number,
): Promise<ListaPagina<PacienteConCedula>> {
  return fetchPage<PacienteConCedula>(
    `/mi-clinica/pacientes?${listaParams(q, page, size)}`,
  );
}

// shortcut: the API has no patient-by-id route, so the detail lookup reads the
// pages until it finds the patient; add GET /mi-clinica/pacientes/:id to drop it.
export async function getPaciente(id: string): Promise<PacienteConCedula | null> {
  const all = await fetchAllPages<PacienteConCedula>("/mi-clinica/pacientes");
  return all.find((p) => p.id === id) ?? null;
}

export async function actualizarPaciente(
  id: string,
  nombre: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = (await cookies()).get("auth_token")?.value;
    const res = await fetch(`${API_URL}/mi-clinica/pacientes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Cookie: `auth_token=${token}` } : {}),
      },
      body: JSON.stringify({ nombre }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      return { ok: false, error: Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al actualizar") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

// ─── Cuentas de cobro ───────────────────────────────────────────────────────

export async function listCuentasCobroPage(
  q: string | undefined,
  page: number,
  size: number,
  opts: ListaOpciones = {},
): Promise<ListaPagina<CuentaCobro>> {
  return fetchPage<CuentaCobro>(
    `/mi-clinica/cuentas-cobro?${listaParams(q, page, size, opts)}`,
  );
}

export async function getCuentaCobro(id: string): Promise<CuentaCobroDetalle | null> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/cuentas-cobro/${id}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<CuentaCobroDetalle>;
  } catch {
    return null;
  }
}

export async function listMetodosPagoBancarios(): Promise<MetodoPagoBancario[]> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/metodos-pago-bancarios`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<MetodoPagoBancario[]>;
  } catch {
    return [];
  }
}
