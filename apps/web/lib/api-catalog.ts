"use cache";
import { cacheTag, cacheLife } from "next/cache";
import { fetchAllPages, type ApiPage } from "@repo/ui/lib/fetch-all-pages";
import { SERVICE_IMAGES } from "./catalog";

export type ApiService = {
  slug: string;
  name: string;
  description: string;
  imagenUrl: string | null;
};

const DEFAULT_API_BASE = "http://localhost:3003";

type ServicioPublicoApi = {
  id: number | string;
  slug: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
};

export async function fetchServices(): Promise<ApiService[]> {
  cacheTag("catalog");
  cacheLife("catalogo");

  const base = (process.env.API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    // The public site is exempt from the 10-row default: this list feeds static
    // routes and the service detail page, not a table, so it needs every one.
    const data = await fetchAllPages<ServicioPublicoApi>(async (page, size) => {
      const res = await fetch(`${base}/catalogo/servicios?page=${page}&size=${size}`, {
        signal: AbortSignal.timeout(3000),
        // The response lives in the data cache with the same short lifetime and
        // tag as the function above, so `revalidateTag("catalog")` always wins.
        next: { revalidate: 10, tags: ["catalog"] },
      });
      if (!res.ok) return null;
      return (await res.json()) as ApiPage<ServicioPublicoApi>;
    });
    return data.map((apiSvc) => ({
      slug: apiSvc.slug,
      name: apiSvc.nombre,
      description: apiSvc.descripcion,
      imagenUrl: apiSvc.imagenUrl,
    }));
  } catch {
    // Nothing is invented when the API is down: the pages show no service.
    return [];
  }
}

export async function resolveImage(service: ApiService): Promise<string> {
  return service.imagenUrl ?? SERVICE_IMAGES[service.slug] ?? "";
}
