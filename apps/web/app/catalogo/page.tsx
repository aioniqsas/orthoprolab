import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { PriceDownloadButton } from "@/components/price-download-button";
import { Reveal } from "@/components/reveal";
import { fetchServices, resolveImage } from "@/lib/api-catalog";
import { fetchContenido, texto } from "@/lib/content";
import { RADIUS, SECTION_TIGHT, TINTED_SHADOW } from "@/lib/ui";
import { BRAND_NAME, pageSocial } from "@/lib/site";

// The page body awaits the cached catalog before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

const CATALOG_TITLE = "Catálogo de ortodoncia y prótesis dental en Medellín";
const CATALOG_DESCRIPTION =
  "Ortodoncia fija y removible, alineadores, retenedores y férulas de OrthoPro Lab. Descarga el catálogo con precios en PDF.";

export const metadata: Metadata = {
  title: CATALOG_TITLE,
  description: CATALOG_DESCRIPTION,
  ...pageSocial(`${CATALOG_TITLE} | ${BRAND_NAME}`, CATALOG_DESCRIPTION, "/catalogo"),
};

// Alt text per line, as in the design; the name is the fallback for a slug the
// catalog adds later.
const SERVICE_ALTS: Record<string, string> = {
  "ortodoncia-fija": "Expansor de ortodoncia fija con tornillo central",
  "ortodoncia-removible": "Placa removible de ortodoncia con tornillo",
  "alineadores-invisibles": "Alineadores transparentes sobre modelos dentales",
  "retenedores-y-ferulas": "Placa de acrílico removible sobre modelo de yeso",
};

export default async function CatalogPage() {
  const [services, contenido] = await Promise.all([fetchServices(), fetchContenido()]);
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);
  // A row needs a photo: the admin upload from the API, else the line's lab photo.
  const rows = await Promise.all(
    services.map(async (s) => ({ ...s, image: await resolveImage(s) })),
  );
  const lines = rows.filter((s) => s.image);

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-8 px-6 pt-16 pb-12 lg:px-12 lg:pt-20 lg:pb-14">
        <div className="flex min-w-0 flex-1 basis-[560px] flex-col gap-4.5">
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.04] font-bold tracking-[-0.04em] text-balance text-body">
            {t("catalogo.titulo", "Catálogo de ortodoncia y prótesis dental")}{" "}
            <span className="text-highlight">{t("catalogo.titulo_destacado", "en Medellín")}</span>
          </h1>
          <p className="max-w-[56ch] text-lg text-surface-alt lg:text-[19px]">
            {t("catalogo.intro", "Cuatro líneas de ortodoncia. Los precios están en el catálogo en PDF.")}
          </p>
        </div>
        <PriceDownloadButton label={t("catalogo.boton_precios", "Descargar precios (PDF)")} />
      </section>

      {/* Four horizontal feature rows: photo left, text centred on the right so
          every row reads the same even when the copy runs shorter. */}
      <section aria-label="Líneas de trabajo" className={SECTION_TIGHT}>
        <ul className="mx-auto flex max-w-7xl flex-col gap-5 px-6 lg:px-12">
          {lines.map((line, i) => (
            <li key={line.slug}>
              <Reveal delay={i * 0.06}>
                <Link
                  href={`/catalogo/${line.slug}`}
                  prefetch
                  className={cn(
                    "group flex flex-wrap overflow-hidden bg-surface-raised text-body ring-1 ring-border transition-transform duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99]",
                    RADIUS,
                    TINTED_SHADOW,
                  )}
                >
                  <span className="relative block aspect-[16/10] min-w-0 flex-[1_1_360px]">
                    <Image
                      src={line.image}
                      alt={SERVICE_ALTS[line.slug] ?? line.name}
                      fill
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                    />
                  </span>
                  <div className="flex min-w-0 flex-[1.4_1_420px] flex-col justify-center gap-2.5 p-6 lg:p-8">
                    <h2 className="min-h-[2.5em] font-heading text-2xl leading-[1.25] font-semibold tracking-[-0.03em] text-body lg:text-[2rem]">
                      {line.name}
                    </h2>
                    <p className="text-surface-alt">{line.description}</p>
                    <span className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-highlight">
                      {t("catalogo.boton", "Ver")} {line.name.toLowerCase()}
                      <ArrowRightIcon
                        className="size-4 transition-transform motion-safe:group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
