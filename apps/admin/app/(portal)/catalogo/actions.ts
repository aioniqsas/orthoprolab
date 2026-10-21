"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";
import type { Servicio } from "@/lib/data/types";

async function authCookie(): Promise<string> {
  const token = (await cookies()).get("auth_token")?.value;
  return token ? `auth_token=${token}` : "";
}

type ActionResult<T = Servicio> = { ok: true; data: T } | { ok: false; error: string };

export async function createServicio(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const nombre = formData.get("nombre") as string;
  const descripcion = (formData.get("descripcion") as string) || undefined;
  const precio = formData.get("precio") as string;

  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ nombre, descripcion, precio }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al crear el servicio");
      return { ok: false, error };
    }
    const data = (await res.json()) as Servicio;
    revalidatePath("/catalogo");
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function updateServicio(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const nombre = formData.get("nombre") as string;
  const descripcion = (formData.get("descripcion") as string) || undefined;
  const precio = formData.get("precio") as string;

  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ nombre, descripcion, precio }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al actualizar el servicio");
      return { ok: false, error };
    }
    const data = (await res.json()) as Servicio;
    revalidatePath("/catalogo");
    revalidatePath(`/catalogo/${id}`);
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function toggleActivoServicio(
  id: string,
  activo: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: await authCookie(),
      },
      body: JSON.stringify({ activo }),
    });
    if (!res.ok) {
      return { ok: false, error: "Error al cambiar el estado del servicio" };
    }
    revalidatePath("/catalogo");
    revalidatePath(`/catalogo/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function deleteServicio(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios/${id}`, {
      method: "DELETE",
      headers: { Cookie: await authCookie() },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg)
        ? msg.join(", ")
        : (msg ?? "Error al eliminar el servicio");
      return { ok: false, error };
    }
    revalidatePath("/catalogo");
    revalidatePath(`/catalogo/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}

export async function uploadImagenServicio(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const res = await fetch(`${API_URL}/admin/catalogo/servicios/${id}/imagen`, {
      method: "POST",
      headers: {
        Cookie: await authCookie(),
        // Do NOT set Content-Type — the browser sets it with the multipart boundary
      },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { message?: string | string[] }).message;
      const error = Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al subir la imagen");
      return { ok: false, error };
    }
    const data = (await res.json()) as Servicio;
    revalidatePath("/catalogo");
    revalidatePath(`/catalogo/${id}`);
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
