import type { MetadataRoute } from "next";
import { SERVICES } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/nosotros",
    "/catalogo",
    "/pagos",
    ...SERVICES.map((s) => `/catalogo/${s.slug}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
