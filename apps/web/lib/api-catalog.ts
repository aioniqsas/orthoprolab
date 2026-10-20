"use cache";
import { cacheTag, cacheLife } from "next/cache";
import { SERVICES, SERVICE_IMAGES } from "./catalog";
import type { ServiceType } from "./catalog";

export type ApiService = ServiceType & { imagenUrl: string | null };

const DEFAULT_API_BASE = "http://localhost:3003";

export async function fetchServices(): Promise<ApiService[]> {
  cacheTag("catalog");
  cacheLife("hours");

  const base = (process.env.API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/catalogo/servicios`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return fallback();

    const data = (await res.json()) as Array<{
      id: number;
      slug: string;
      nombre: string;
      descripcion: string;
      imagenUrl: string | null;
    }>;
    if (!Array.isArray(data) || data.length === 0) return fallback();

    return data.map((apiSvc) => {
      const local = SERVICES.find((s) => s.slug === apiSvc.slug);
      return {
        slug: apiSvc.slug,
        name: apiSvc.nombre,
        description: apiSvc.descripcion,
        icon: local?.icon ?? "wrench",
        tagline: local?.tagline ?? apiSvc.nombre,
        items: local?.items ?? [],
        imagenUrl: apiSvc.imagenUrl,
      };
    });
  } catch {
    return fallback();
  }
}

function fallback(): ApiService[] {
  return SERVICES.map((s) => ({ ...s, imagenUrl: null }));
}

export async function resolveImage(service: ApiService): Promise<string> {
  return service.imagenUrl ?? SERVICE_IMAGES[service.slug] ?? "";
}
