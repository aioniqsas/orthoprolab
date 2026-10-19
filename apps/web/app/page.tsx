import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  CpuIcon,
  FileDownIcon,
  LandmarkIcon,
  PackageCheckIcon,
  PencilRulerIcon,
  ScanLineIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { LocationMap } from "@/components/location-map";
import { SERVICES } from "@/lib/catalog";
import {
  BRAND_NAME,
  LAB_COUNTRY,
  LAB_LOCALITY,
  LAB_REGION,
  LAB_STREET,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
  pageSocial,
} from "@/lib/site";

const HOME_TITLE = `${SITE_TITLE} | ${BRAND_NAME}`;

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: SITE_DESCRIPTION,
  ...pageSocial(HOME_TITLE, SITE_DESCRIPTION, "/"),
};

const BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND_NAME,
      url: SITE_URL,
      image: `${SITE_URL}${OG_IMAGE.url}`,
    },
    {
      "@type": ["LocalBusiness", "DentalLaboratory"],
      "@id": `${SITE_URL}/#localbusiness`,
      name: BRAND_NAME,
      url: SITE_URL,
      image: `${SITE_URL}${OG_IMAGE.url}`,
      description: SITE_DESCRIPTION,
      address: {
        "@type": "PostalAddress",
        streetAddress: LAB_STREET,
        addressLocality: LAB_LOCALITY,
        addressRegion: LAB_REGION,
        addressCountry: LAB_COUNTRY,
      },
      areaServed: { "@type": "City", name: LAB_LOCALITY },
    },
  ],
};

// Single corner-radius scale for the whole page: rounded-xl.
const RADIUS = "rounded-xl";
const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";
const CTA_BASE = `h-auto gap-2 ${RADIUS} px-6 py-3.5 font-semibold transition-transform active:scale-[0.98]`;

const SERVICE_IMAGES: Record<string, string> = {
  "ortodoncia-fija": "/images/service-ortodoncia-fija.jpg",
  "ortodoncia-removible": "/images/service-ortodoncia-removible.jpg",
  "alineadores-invisibles": "/images/service-alineadores-invisibles.jpg",
  "retenedores-y-ferulas": "/images/service-retenedores-y-ferulas.jpg",
  "protesis-cad-cam": "/images/service-protesis-cad-cam.jpg",
};

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Envías el caso",
    text: "Recibimos el escaneo digital o las impresiones físicas de tu paciente.",
    icon: ScanLineIcon,
  },
  {
    title: "Diseñamos",
    text: "Planificamos el aparato o la prótesis a partir de lo que enviaste.",
    icon: PencilRulerIcon,
  },
  {
    title: "Fabricamos",
    text: "Elaboramos el trabajo en el laboratorio, línea por línea.",
    icon: CpuIcon,
  },
  {
    title: "Entregamos",
    text: "El trabajo terminado vuelve a tu consultorio.",
    icon: PackageCheckIcon,
  },
];

const BEFORE_FIRST_CASE: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Escaneo o impresiones",
    text: "Puedes enviar el caso en digital o en impresiones físicas.",
    icon: ScanLineIcon,
  },
  {
    title: "Precios en el catálogo",
    text: "Descarga el catálogo en PDF para ver el precio de cada línea.",
    icon: FileDownIcon,
  },
  {
    title: "Pago por transferencia",
    text: "Pagas en las cuentas bancarias oficiales y luego confirmas el pago.",
    icon: LandmarkIcon,
  },
];

export default function Home() {
  const [featured, ...others] = SERVICES;

  return (
    <>
      <JsonLd data={BUSINESS_JSON_LD} />
      {/* Hero: full-width image under a vertical gray-to-black mask. Copy sits
          in the lower, darker part of the mask so body text keeps AA contrast. */}
      <section className="relative isolate flex min-h-[70dvh] items-end overflow-hidden pt-24 pb-16 lg:min-h-[80dvh] lg:pb-20">
        <Image
          src="/images/hero.jpg"
          alt="Alineador transparente sobre una base de obsidiana en el laboratorio"
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-alt/50 via-background/40 to-background"
        />
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
          <div className="flex max-w-4xl flex-col gap-7">
            <Reveal>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-tighter text-body md:text-6xl lg:text-7xl">
                Laboratorio odontológico en <span className="text-highlight">Medellín</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[60ch] text-lg text-body/90 md:text-xl">
                Fabricamos aparatos de ortodoncia y prótesis a partir del escaneo o las impresiones de tu caso.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="#servicios" className={cn(buttonVariants(), CTA_BASE)}>
                Ver servicios
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="/catalogo"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  CTA_BASE,
                  "border-body/40 bg-background/60 text-body hover:bg-background/80",
                )}
              >
                Ver catálogo
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services: bento, one featured tile plus four, all linking to their route */}
      <section id="servicios" className="scroll-mt-16 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              Cinco líneas de trabajo para ortodoncia y prótesis
            </h2>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            {[featured, ...others].map((s, i) => (
              <Reveal
                key={s.slug}
                delay={i * 0.06}
                className={cn("h-full", i === 0 && "md:col-span-2 lg:row-span-2")}
              >
                <Link
                  href={`/catalogo/${s.slug}`}
                  className={cn(
                    "group relative isolate flex h-full min-h-64 flex-col justify-end overflow-hidden bg-card p-6 ring-1 ring-border transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.99]",
                    RADIUS,
                    TINTED_SHADOW,
                    i === 0 && "lg:min-h-[34rem]",
                  )}
                >
                  <Image
                    src={SERVICE_IMAGES[s.slug]!}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                    className="-z-20 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10"
                  />
                  <h3 className={cn("font-heading font-semibold text-body", i === 0 ? "text-2xl lg:text-3xl" : "text-xl")}>
                    {s.name}
                  </h3>
                  <p className={cn("mt-2 text-sm text-body/75", i === 0 ? "line-clamp-3 max-w-md" : "line-clamp-2")}>
                    {s.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-highlight">
                    Ver servicio
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow: horizontal timeline */}
      <section className="bg-surface-raised/40 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-14 px-6 lg:px-12">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              Del caso que envías al trabajo que recibes
            </h2>
          </Reveal>
          <ol className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map(({ icon: Icon, ...s }, i) => (
              <li key={s.title}>
                <Reveal delay={i * 0.08} className="relative flex flex-col gap-4 border-t border-border pt-6 lg:border-highlight/40">
                  <Icon className="size-6 text-highlight" strokeWidth={1.5} aria-hidden />
                  <h3 className="font-heading text-lg font-semibold text-body">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Before the first case: split with image */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:col-span-6">
            <div className={cn("relative aspect-[4/3] overflow-hidden ring-1 ring-border", RADIUS, TINTED_SHADOW)}>
              <Image
                src="/images/team-technician.jpg"
                alt="Técnica del laboratorio odontológico en Medellín revisando un alineador con microscopio"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className="flex flex-col gap-8 lg:col-span-6">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                Antes de enviar tu primer caso
              </h2>
            </Reveal>
            <ul className="divide-y divide-border">
              {BEFORE_FIRST_CASE.map(({ icon: Icon, ...p }, i) => (
                <li key={p.title}>
                  <Reveal delay={i * 0.08} className="flex items-start gap-4 py-5">
                    <Icon className="mt-0.5 size-6 shrink-0 text-highlight" strokeWidth={1.5} aria-hidden />
                    <div>
                      <p className="font-heading font-semibold text-body">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <LocationMap />

      {/* Closing CTA: full-width band over the milling image */}
      <section className="relative isolate overflow-hidden py-20 lg:py-28">
        <Image
          src="/images/lab-milling.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/85" />
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 lg:px-12">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
            Consulta el catálogo completo
          </h2>
          <p className="max-w-[60ch] text-body/80">
            Cada línea de trabajo tiene su página, y el catálogo en PDF trae los precios.
          </p>
          <Link href="/catalogo" className={cn(buttonVariants(), CTA_BASE)}>
            Ver catálogo
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
