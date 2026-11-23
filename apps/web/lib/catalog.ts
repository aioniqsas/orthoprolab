// The service list itself comes from the API (see lib/api-catalog.ts). Prices are
// intentionally NOT shown on the site: they are distributed only through the
// downloadable PDF.
export const CATALOG_PDF_HREF = "/api/catalogo/pdf";

// Lab photography per service, shared by the landing, catalog index and subroutes.
export const SERVICE_IMAGES: Record<string, string> = {
  "ortodoncia-fija": "/images/expansor-ortodoncia-tornillo-central.webp",
  "ortodoncia-removible": "/images/placas-removibles-ortodoncia-con-tornillo.webp",
  "alineadores-invisibles": "/images/alineadores-transparentes-sobre-modelos-dentales.webp",
  "retenedores-y-ferulas": "/images/placa-acrilico-removible-sobre-modelo.webp",
};
