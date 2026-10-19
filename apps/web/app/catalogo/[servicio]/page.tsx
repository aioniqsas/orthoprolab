import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { PriceDownloadButton } from "@/components/price-download-button";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { SERVICES, SERVICE_IMAGES, getService } from "@/lib/catalog";
import { BRAND_NAME, LAB_LOCALITY, SITE_URL, pageSocial } from "@/lib/site";

type Props = { params: Promise<{ servicio: string }> };

const RADIUS = "rounded-xl";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ servicio: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { servicio } = await params;
  const service = getService(servicio);
  if (!service) return {};
  const title = `${service.name} en Medellín | Catálogo`;
  const description = `${service.name} en Medellín: ${service.description}`;
  return {
    title,
    description,
    ...pageSocial(`${title} | ${BRAND_NAME}`, description, `/catalogo/${service.slug}`),
  };
}

export default async function ServicePage({ params }: Props) {
  const { servicio } = await params;
  const service = getService(servicio);
  if (!service) notFound();

  const details = [
    { label: "Qué es", key: "summary" },
    { label: "Cuándo se indica", key: "indication" },
  ] as const;
  const related = SERVICES.filter((s) => s.slug !== service.slug);

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
      {/* Hero: service image under a vertical gray-to-black mask */}
      <section className="relative isolate flex min-h-[calc(78dvh-4rem)] items-end overflow-hidden pt-16 pb-14 lg:pb-20">
        <Image
          src={SERVICE_IMAGES[service.slug]!}
          alt={`${service.name} fabricado en OrthoPro Lab`}
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-alt/50 via-background/85 to-background"
        />
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
          <Link
            href="/catalogo"
            className="mb-8 inline-flex items-center gap-2 text-sm text-body/80 transition-colors hover:text-body"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Volver al catálogo
          </Link>
          <Reveal className="flex max-w-3xl flex-col gap-6">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tighter text-body md:text-5xl lg:text-6xl">
              {service.name}
            </h1>
            <p className="max-w-[60ch] text-lg text-body/80">{service.description}</p>
            <div>
              <PriceDownloadButton />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Items: divided rows, name left and spec list right */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              Productos de esta línea
            </h2>
          </Reveal>
          <ul className="divide-y divide-border border-y border-border">
            {service.items.map((item) => (
              <li key={item.code}>
                <Reveal className="grid gap-6 py-10 lg:grid-cols-12 lg:gap-12">
                  <div className="flex flex-col gap-3 lg:col-span-4">
                    <span className="font-mono text-xs text-highlight">{item.code}</span>
                    <h3 className="font-heading text-xl font-semibold text-body">{item.name}</h3>
                  </div>
                  <dl className="grid gap-5 lg:col-span-8">
                    {details.map(({ label, key }) => (
                      <div key={key} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
                        <dt className="text-sm font-semibold text-body">{label}</dt>
                        <dd className="text-sm leading-relaxed text-muted-foreground">{item[key]}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Related services: compact rows with thumbnail */}
      <section className="bg-surface-raised/40 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:col-span-4">
            <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              Otras líneas del laboratorio
            </h2>
          </Reveal>
          <ul className="divide-y divide-border lg:col-span-8">
            {related.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/catalogo/${s.slug}`}
                  className="group flex items-center gap-5 py-4 transition-transform active:scale-[0.99]"
                >
                  <span className={cn("relative h-16 w-24 shrink-0 overflow-hidden ring-1 ring-border", RADIUS)}>
                    <Image
                      src={SERVICE_IMAGES[s.slug]!}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </span>
                  <span className="flex-1">
                    <span className="block font-heading font-semibold text-body">{s.name}</span>
                    <span className="block text-sm text-muted-foreground">{s.tagline}</span>
                  </span>
                  <ArrowRightIcon
                    className="size-5 shrink-0 text-highlight transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
