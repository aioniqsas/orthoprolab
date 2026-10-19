export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/pagos", label: "Pagos" },
] as const;

export const BRAND_NAME = "OrthoPro Lab";

// Real address provided by the client; reused by footer and SEO metadata.
export const LAB_ADDRESS = "Cl. 53 #43 - 43, oficina 204, Medellín";

// Structured address parts, used by JSON-LD and the map link.
export const LAB_STREET = "Cl. 53 #43 - 43, oficina 204";
export const LAB_LOCALITY = "Medellín";
export const LAB_REGION = "Antioquia";
export const LAB_COUNTRY = "CO";
export const LAB_FULL_ADDRESS = `${LAB_STREET}, ${LAB_LOCALITY}, ${LAB_REGION}, Colombia`;

// Planned production domain (not purchased or deployed yet); override per environment with NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://orthoprolab.com";

export const SITE_TITLE = "Laboratorio odontológico en Medellín";
export const SITE_DESCRIPTION =
  "Laboratorio odontológico en Medellín: ortodoncia fija y removible, alineadores y retenedores para tu consultorio.";

export const OG_IMAGE = {
  url: "/images/hero.jpg",
  width: 1600,
  height: 900,
  alt: "Alineador transparente sobre una base de obsidiana en el laboratorio",
};

// Shared Open Graph / Twitter fields for each page.
export function pageSocial(title: string, description: string, path: string) {
  return {
    alternates: { canonical: path },
    openGraph: {
      type: "website" as const,
      locale: "es_CO",
      siteName: BRAND_NAME,
      title,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
