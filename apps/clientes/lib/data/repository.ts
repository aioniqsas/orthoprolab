import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";
import type {
  CuentaCobro,
  CuentaCobroDetalle,
  Doctor,
  MetodoPagoBancario,
  Orden,
  PacienteConCedula,
  PacienteDoctor,
  Servicio,
} from "./types";

async function authHeader(): Promise<HeadersInit> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? { Cookie: `auth_token=${token}` } : {};
}

// ─── Doctores ───────────────────────────────────────────────────────────────

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

export async function listOrdenes(): Promise<Orden[]> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/ordenes`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Orden[]>;
  } catch {
    return [];
  }
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
    const res = await fetch(`${API_URL}/mi-clinica/pacientes?doctorId=${encodeURIComponent(doctorId)}`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<PacienteDoctor[]>;
  } catch {
    return [];
  }
}

// ─── Servicios ──────────────────────────────────────────────────────────────

export async function listServicios(): Promise<Servicio[]> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/servicios`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Servicio[]>;
  } catch {
    return [];
  }
}

// ─── Pacientes (all in clinic) ──────────────────────────────────────────────

export async function listPacientes(): Promise<PacienteConCedula[]> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/pacientes`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<PacienteConCedula[]>;
  } catch {
    return [];
  }
}

export async function getPaciente(id: string): Promise<PacienteConCedula | null> {
  const all = await listPacientes();
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

export async function listCuentasCobro(): Promise<CuentaCobro[]> {
  try {
    const res = await fetch(`${API_URL}/mi-clinica/cuentas-cobro`, {
      headers: await authHeader(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<CuentaCobro[]>;
  } catch {
    return [];
  }
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
