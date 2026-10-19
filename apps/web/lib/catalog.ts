// Catalog data. Prices are intentionally NOT part of this model: they are
// distributed only through the downloadable PDF (see CATALOG_PDF_HREF).
export const CATALOG_PDF_HREF = "/catalogo-orthopro-lab.pdf";

export type CatalogItem = {
  code: string;
  name: string;
  summary: string;
  indication: string;
};

export type ServiceType = {
  slug: string;
  name: string;
  icon: "wrench" | "smile" | "layers" | "shield";
  description: string;
  tagline: string;
  items: CatalogItem[];
};

export const SERVICES: ServiceType[] = [
  {
    slug: "ortodoncia-fija",
    name: "Ortodoncia Fija",
    icon: "wrench",
    description:
      "Aparatos fijos para tratamientos de ortodoncia, como disyuntores y anclajes, hechos para cada paciente.",
    tagline: "Disyuntores y anclajes",
    items: [
      { code: "OF-HYR-01", name: "Disyuntor Hyrax", summary: "Aparato fijo que ensancha el maxilar superior con un tornillo central.", indication: "Falta de ancho del maxilar superior y mordida cruzada posterior." },
      { code: "OF-HSS-02", name: "Disyuntor Haas", summary: "Disyuntor que se apoya en el paladar además de los dientes.", indication: "Expansión del maxilar superior en pacientes que aún crecen." },
      { code: "OF-NAN-03", name: "Botón de Nance y arco lingual", summary: "Aparatos que mantienen la posición de los molares.", indication: "Anclaje de molares y mantenimiento de espacio." },
    ],
  },
  {
    slug: "ortodoncia-removible",
    name: "Ortodoncia Removible",
    icon: "smile",
    description:
      "Placas y aparatos funcionales que el paciente puede quitarse, hechos según el caso del odontólogo.",
    tagline: "Placas y aparatos funcionales",
    items: [
      { code: "OR-HWL-01", name: "Placa Hawley", summary: "Placa removible con un arco que sujeta los dientes en su posición.", indication: "Retención al terminar un tratamiento de ortodoncia fija." },
      { code: "OR-SCW-02", name: "Expansor Schwarz", summary: "Placa con un tornillo que amplía la arcada poco a poco.", indication: "Falta de espacio en la arcada durante la dentición mixta." },
      { code: "OR-TWB-03", name: "Twin Block y Bionator", summary: "Aparatos funcionales que guían la posición de la mandíbula.", indication: "Corrección de la relación entre maxilar y mandíbula en pacientes en crecimiento." },
    ],
  },
  {
    slug: "alineadores-invisibles",
    name: "Alineadores Invisibles",
    icon: "layers",
    description:
      "Alineadores transparentes planificados a partir de las impresiones que envía el odontólogo.",
    tagline: "Alineadores transparentes",
    items: [
      { code: "AL-PRO-CAD", name: "Alineadores transparentes", summary: "Serie de alineadores removibles diseñada sobre el modelo digital del paciente.", indication: "Alineación de dientes apiñados, rotados o con espacios." },
      { code: "AL-ATT-02", name: "Guía para ataches", summary: "Férula flexible que lleva los ataches a la posición planificada en cada diente.", indication: "Colocación de ataches durante un tratamiento con alineadores." },
    ],
  },
  {
    slug: "retenedores-y-ferulas",
    name: "Retenedores y Férulas",
    icon: "shield",
    description:
      "Retenedores para el final del tratamiento y férulas de descarga hechas a la medida del paciente.",
    tagline: "Retenedores y férulas de descarga",
    items: [
      { code: "RF-MIC-01", name: "Férula de descarga", summary: "Férula rígida que se usa sobre los dientes, normalmente de noche.", indication: "Bruxismo y dolor de la articulación temporomandibular." },
      { code: "RF-ESX-02", name: "Retenedor transparente", summary: "Cubierta transparente que se ajusta a ambas arcadas.", indication: "Mantener los dientes en su lugar tras la ortodoncia." },
      { code: "RF-FIX-03", name: "Retenedor fijo", summary: "Alambre que se adhiere por la cara interna de los dientes.", indication: "Retención permanente de los dientes anteriores." },
    ],
  },
];

export function getService(slug: string): ServiceType | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

// Lab photography per service, shared by the landing, catalog index and subroutes.
export const SERVICE_IMAGES: Record<string, string> = {
  "ortodoncia-fija": "/images/expansor-ortodoncia-tornillo-central.webp",
  "ortodoncia-removible": "/images/placas-removibles-ortodoncia-con-tornillo.webp",
  "alineadores-invisibles": "/images/alineadores-transparentes-sobre-modelos-dentales.webp",
  "retenedores-y-ferulas": "/images/placa-acrilico-removible-sobre-modelo.webp",
};
