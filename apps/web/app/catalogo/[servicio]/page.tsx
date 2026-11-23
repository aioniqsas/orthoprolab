import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// params access inside the component body requires blocking navigation.
export const instant = false;
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { PriceDownloadButton } from "@/components/price-download-button";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { fetchServices, resolveImage } from "@/lib/api-catalog";
import { fetchContenido, texto } from "@/lib/content";
import { CTA_BASE, RADIUS, SECTION_BAND, SECTION_CLOSE } from "@/lib/ui";
import { BRAND_NAME, LAB_LOCALITY, SITE_URL, pageSocial, whatsappUrl } from "@/lib/site";

type Props = { params: Promise<{ servicio: string }> };

export async function generateStaticParams() {
  const services = await fetchServices();
  return services.map((s) => ({ servicio: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { servicio } = await params;
  const services = await fetchServices();
  const service = services.find((s) => s.slug === servicio);
  if (!service) return {};
  const title = `${service.name} en Medellín | Catálogo`;
  const description = `${service.name} en Medellín: ${service.description}`;
  return {
    title,
    description,
    ...pageSocial(`${title} | ${BRAND_NAME}`, description, `/catalogo/${service.slug}`),
  };
}

// Alt text per line, as in the design; the name is the fallback for a slug the
// catalog adds later.
const SERVICE_ALTS: Record<string, string> = {
  "ortodoncia-fija": "Expansor de ortodoncia fija con tornillo central",
  "ortodoncia-removible": "Placa removible de ortodoncia con tornillo sobre modelo de yeso",
  "alineadores-invisibles": "Alineadores transparentes sobre modelos dentales",
  "retenedores-y-ferulas": "Placa de acrílico removible sobre modelo de yeso",
};

export default async function ServicePage({ params }: Props) {
  const { servicio } = await params;
  const [services, contenido] = await Promise.all([fetchServices(), fetchContenido()]);
  const service = services.find((s) => s.slug === servicio);
  if (!service) notFound();

  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);

  const related = services.filter((s) => s.slug !== service.slug);
  const heroImage = await resolveImage(service);
  const relatedImages = await Promise.all(related.map(resolveImage));
  const whatsappHref = whatsappUrl(
    t("catalogo.whatsapp.mensaje", "Hola, quiero enviar un caso a OrthoPro Lab."),
  );

  const url = `${SITE_URL}/catalogo/${service.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Catálogo", item: `${SITE_URL}/catalogo` },
          { "@type": "ListItem", position: 3, name: service.name, item: url },
        ],
      },
      {
        "@type": "Service",
        name: service.name,
        description: service.description,
        url,
        provider: { "@type": "LocalBusiness", "@id": `${SITE_URL}/#localbusiness`, name: BRAND_NAME },
        areaServed: { "@type": "City", name: LAB_LOCALITY },
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-20 lg:px-12 lg:pb-24">
        <nav
          aria-label="Ruta"
          className="mb-8 flex flex-wrap items-center gap-x-2 text-sm text-surface-alt"
        >
          <Link href="/" prefetch className="inline-flex min-h-11 items-center hover:text-body">
            {t("catalogo.detalle.ruta_inicio", "Inicio")}
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/catalogo"
            prefetch
            className="inline-flex min-h-11 items-center hover:text-body"
          >
            {t("catalogo.detalle.ruta_catalogo", "Catálogo")}
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="inline-flex min-h-11 items-center text-body">
            {service.name}
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-10 lg:gap-12">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.04] font-bold tracking-[-0.04em] text-balance text-body">
              {service.name} <span className="text-highlight">{t("catalogo.detalle.titulo_destacado", "en Medellín")}</span>
            </h1>
            <p className="max-w-[52ch] text-lg text-surface-alt lg:text-[19px]">{service.description}</p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants(), CTA_BASE)}
              >
                {t("catalogo.detalle.boton_caso", "Enviar un caso")}
              </a>
              <PriceDownloadButton
                variant="outline"
                label={t("catalogo.detalle.boton_precios", "Ver precios (PDF)")}
              />
            </div>
          </div>
          <span className={cn("relative block aspect-[4/3] min-w-0 flex-[1_1_460px] overflow-hidden", RADIUS)}>
            <Image
              src={heroImage}
              alt={SERVICE_ALTS[service.slug] ?? `${service.name} fabricado en OrthoPro Lab`}
              fill
              preload
              fetchPriority="high"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </span>
        </div>
      </section>

      {/* Items: one card per product. Titles reserve two lines and the
          indication rule sits at the bottom, so the three cards in a row line up. */}
      {service.items.length > 0 && (
        <section
          aria-labelledby="productos"
          className={cn("border-y border-border bg-surface-raised", SECTION_BAND)}
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <h2
              id="productos"
              className="mb-9 text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold tracking-[-0.035em] text-body"
            >
              {t("catalogo.detalle.productos_titulo", "Productos de esta línea")}
            </h2>
            <ul className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
              {service.items.map((item, i) => (
                <li key={item.code}>
                  <Reveal delay={i * 0.06} className="h-full">
                    <article className={cn("flex h-full flex-col gap-2.5 border border-border bg-surface p-7", RADIUS)}>
                      <h3 className="min-h-[2.5em] font-heading text-2xl leading-[1.25] font-semibold text-body">
                        {item.name}
                      </h3>
                      <p className="text-body">{item.summary}</p>
                      <p className="mt-auto border-t border-border pt-3.5 text-sm text-surface-alt">
                        <strong className="font-semibold text-title">
                          {t("catalogo.detalle.label_cuando", "Cuándo se indica")}:
                        </strong>{" "}
                        {item.indication}
                      </p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section
          aria-labelledby="otras"
          className={cn("mx-auto max-w-7xl px-6 lg:px-12", SECTION_CLOSE)}
        >
          <h2
            id="otras"
            className="mb-8 text-[clamp(1.625rem,3vw,2.25rem)] font-semibold tracking-[-0.03em] text-body"
          >
            {t("catalogo.detalle.relacionados_titulo", "Otras líneas del laboratorio")}
          </h2>
          <ul className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s, ri) => (
              <li key={s.slug}>
                <Link
                  href={`/catalogo/${s.slug}`}
                  prefetch
                  className={cn(
                    "group flex min-h-11 items-center gap-4 border border-border p-3.5 text-body transition-colors hover:bg-surface-raised motion-safe:active:scale-[0.99]",
                    RADIUS,
                  )}
                >
                  <span className="relative size-[72px] flex-none overflow-hidden rounded-lg">
                    <Image src={relatedImages[ri]!} alt="" fill sizes="72px" className="object-cover" />
                  </span>
                  <span className="inline-flex min-h-[2.5em] items-center font-heading text-lg font-semibold">
                    {s.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
