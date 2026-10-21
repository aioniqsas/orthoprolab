import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { PriceDownloadButton } from "@/components/price-download-button";
import { CatalogLive } from "@/components/catalog-live";
import { Reveal } from "@/components/reveal";
import { fetchServices, resolveImage } from "@/lib/api-catalog";
import { BRAND_NAME, pageSocial } from "@/lib/site";

const CATALOG_TITLE = "Catálogo de ortodoncia y prótesis dental en Medellín";
const CATALOG_DESCRIPTION =
  "Ortodoncia fija y removible, alineadores, retenedores y férulas de OrthoPro Lab. Descarga el catálogo con precios en PDF.";

export const metadata: Metadata = {
  title: CATALOG_TITLE,
  description: CATALOG_DESCRIPTION,
  ...pageSocial(`${CATALOG_TITLE} | ${BRAND_NAME}`, CATALOG_DESCRIPTION, "/catalogo"),
};

const RADIUS = "rounded-xl";
const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";

// Column spans on a 12-col grid: one wide feature, then three equal tiles.
const SPANS = [
  "lg:col-span-12",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
];

export default async function CatalogPage() {
  const services = await fetchServices();
  const serviceImages = await Promise.all(services.map(resolveImage));
  return (
    <>
      <CatalogLive />
      <section className="pt-16 pb-10 lg:pt-24">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 lg:px-12">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tighter text-body md:text-5xl">
            Catálogo de <span className="text-highlight">servicios</span>
          </h1>
          <p className="max-w-[60ch] text-lg text-body/80">
            Cuatro líneas de ortodoncia. Los precios están en el catálogo en PDF.
          </p>
          <PriceDownloadButton />
        </Reveal>
      </section>

      <section className="pb-20 lg:pb-28">
        <ul className="mx-auto grid max-w-7xl gap-4 px-6 lg:grid-cols-12 lg:px-12">
          {services.map((service, i) => (
            <li key={service.slug} className={cn("h-full", SPANS[i])}>
              <Reveal delay={(i % 2) * 0.08} className="h-full">
                <Link
                  href={`/catalogo/${service.slug}`}
                  prefetch
                  className={cn(
                    "group relative isolate flex h-full flex-col justify-end overflow-hidden bg-card p-6 ring-1 ring-border transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99]",
                    i === 0 ? "min-h-80 lg:min-h-[26rem] lg:p-10" : "min-h-72 lg:min-h-80",
                    RADIUS,
                    TINTED_SHADOW,
                  )}
                >
                  <Image
                    src={serviceImages[i]!}
                    alt=""
                    fill
                    sizes={i === 0 ? "100vw" : "(min-width: 1024px) 33vw, 100vw"}
                    className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/75 to-background/10"
                  />
                  <h2 className={cn("font-heading font-semibold text-body", i === 0 ? "text-3xl lg:text-4xl" : "text-2xl")}>
                    {service.name}
                  </h2>
                  <p className={cn("mt-2 text-sm text-body/75", i === 0 ? "max-w-xl" : "line-clamp-2 max-w-md")}>
                    {service.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap text-highlight">
                      Ver servicio
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
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
