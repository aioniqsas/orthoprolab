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

const errorFrom = (body: unknown, fallback: string): string => {
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? fallback);
};

const isFile = (value: FormDataEntryValue | null): value is File =>
  typeof value === "object" && value !== null && "arrayBuffer" in value;

/** Sends only the file: the action FormData may carry Next internals. */
async function uploadImagen(id: string, imagen: File): Promise<ActionResult> {
  const body = new FormData();
  body.set("imagen", imagen);
  const res = await fetch(`${API_URL}/admin/catalogo/servicios/${id}/imagen`, {
    method: "POST",
    headers: { Cookie: await authCookie() },
    body,
  });
  if (!res.ok) {
    const parsed = await res.json().catch(() => ({}));
    return { ok: false, error: errorFrom(parsed, "Error al subir la imagen") };
  }
  return { ok: true, data: (await res.json()) as Servicio };
}

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
      return { ok: false, error: errorFrom(body, "Error al crear el servicio") };
    }
    let data = (await res.json()) as Servicio;

    const imagen = formData.get("imagen");
    if (isFile(imagen) && imagen.size > 0) {
      const subida = await uploadImagen(data.id, imagen);
      if (!subida.ok) {
        // Creating with a photo is one operation: do not leave an orphan
        // service behind when the upload fails (it has no orders yet).
        await fetch(`${API_URL}/admin/catalogo/servicios/${data.id}`, {
          method: "DELETE",
          headers: { Cookie: await authCookie() },
        }).catch(() => {});
        return subida;
      }
      data = subida.data;
    }

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
  const imagen = formData.get("imagen");
  if (!isFile(imagen) || imagen.size === 0) {
    return { ok: false, error: "Selecciona una imagen." };
  }

  try {
    const result = await uploadImagen(id, imagen);
    if (!result.ok) return result;
    revalidatePath("/catalogo");
    revalidatePath(`/catalogo/${id}`);
    return result;
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
