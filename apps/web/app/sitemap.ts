import type { MetadataRoute } from "next";
import { fetchServices } from "@/lib/api-catalog";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await fetchServices();
  const paths = [
    "/",
    "/nosotros",
    "/catalogo",
    "/pagos",
    ...services.map((s) => `/catalogo/${s.slug}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
