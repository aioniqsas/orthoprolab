import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BoxIcon,
  CpuIcon,
  FileDownIcon,
  LandmarkIcon,
  PackageCheckIcon,
  PencilRulerIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { LocationMap } from "@/components/location-map";
import { fetchContenido, texto } from "@/lib/content";
import {
  CTA_BASE,
  HEADING_GAP,
  RADIUS,
  SECTION_BAND,
  SECTION_CLOSE,
  SECTION_LEAD,
  SECTION_TIGHT,
  TINTED_SHADOW,
} from "@/lib/ui";
import { SERVICES, SERVICE_IMAGES } from "@/lib/catalog";
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

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

export default async function Home() {
  const contenido = await fetchContenido();
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);
  const [featured, ...others] = SERVICES;

  const steps = [
    { title: t("home.proceso.paso1.titulo", "Envías el caso"), text: t("home.proceso.paso1.texto", "Recibimos las impresiones físicas de tu paciente."), icon: BoxIcon },
    { title: t("home.proceso.paso2.titulo", "Diseñamos"), text: t("home.proceso.paso2.texto", "Planificamos el aparato o la prótesis a partir de lo que enviaste."), icon: PencilRulerIcon },
    { title: t("home.proceso.paso3.titulo", "Fabricamos"), text: t("home.proceso.paso3.texto", "Elaboramos el trabajo en el laboratorio, línea por línea."), icon: CpuIcon },
    { title: t("home.proceso.paso4.titulo", "Entregamos"), text: t("home.proceso.paso4.texto", "El trabajo terminado vuelve a tu consultorio."), icon: PackageCheckIcon },
  ];

  const beforeFirstCase = [
    { title: t("home.antes.item1.titulo", "Impresiones físicas"), text: t("home.antes.item1.texto", "Recibimos las impresiones del caso para trabajar sobre ellas."), icon: BoxIcon },
    { title: t("home.antes.item2.titulo", "Precios en el catálogo"), text: t("home.antes.item2.texto", "Descarga el catálogo en PDF para ver el precio de cada línea."), icon: FileDownIcon },
    { title: t("home.antes.item3.titulo", "Pago por transferencia"), text: t("home.antes.item3.texto", "Pagas en la cuenta bancaria oficial y luego confirmas el pago."), icon: LandmarkIcon },
  ];

  return (
    <>
      <JsonLd data={BUSINESS_JSON_LD} />
      {/* Hero: full-width image under a vertical gray-to-black mask. Copy sits
          in the lower, darker part of the mask so body text keeps AA contrast. */}
      <section className="relative isolate flex min-h-[70dvh] items-end overflow-hidden pt-24 pb-16 lg:min-h-[80dvh] lg:pb-20">
        <Image
          src={t("home.hero.imagen", "/images/hero.jpg")}
          alt={t("home.hero.imagen_alt", "Alineador transparente sobre una base de obsidiana en el laboratorio")}
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
              <h1 className="text-5xl font-bold leading-[1.05] text-balance tracking-[-0.04em] text-body md:text-6xl lg:text-7xl">
                {t("home.hero.titulo", "Laboratorio dental en")} <span className="text-highlight">{t("home.hero.titulo_destacado", "Medellín")}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[60ch] text-lg text-body/90 md:text-xl">
                {t("home.hero.subtitulo", "Fabricamos aparatos de ortodoncia y prótesis a partir de las impresiones de tu caso.")}
              </p>
            </Reveal>
            <Reveal delay={0.2} className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="#servicios" className={cn(buttonVariants(), CTA_BASE)}>
                {t("home.hero.boton_servicios", "Ver servicios")}
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
              <Link
                href="/catalogo"
                prefetch
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  CTA_BASE,
                  "border-body/40 bg-background/60 text-body hover:bg-background/80",
                )}
              >
                {t("home.hero.boton_catalogo", "Ver catálogo")}
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services: the lead chapter after the hero. One anchor tile takes 7 of
          12 columns; the other three stack beside it instead of forming a
          symmetric bento with no centre of gravity. */}
      <section id="servicios" className={cn("scroll-mt-16", SECTION_LEAD)}>
        <div className={cn("mx-auto max-w-7xl px-6 lg:px-12", HEADING_GAP)}>
          <Reveal>
            <h2 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-body lg:text-5xl">
              {t("home.servicios.titulo", "Cuatro líneas de trabajo para ortodoncia")}
            </h2>
          </Reveal>
          <div className="grid gap-4 lg:grid-cols-12">
            <Reveal className="h-full lg:col-span-7">
              <Link
                href={`/catalogo/${featured.slug}`}
                prefetch
                className={cn(
                  "group relative isolate flex h-full min-h-72 flex-col justify-end overflow-hidden bg-card p-6 ring-1 ring-border transition-transform duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99] lg:min-h-[34rem] lg:p-8",
                  RADIUS,
                  TINTED_SHADOW,
                )}
              >
                <Image
                  src={SERVICE_IMAGES[featured.slug]!}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="-z-20 object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10"
                />
                <h3 className="font-heading text-2xl font-semibold text-body lg:text-3xl">{featured.name}</h3>
                <p className="mt-2 max-w-md text-sm text-body/75 lg:line-clamp-3">{featured.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-highlight">
                  {t("home.servicios.boton", "Ver servicio")}
                  <ArrowRightIcon className="size-4 transition-transform motion-safe:group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </Reveal>
            <div className="grid gap-4 lg:col-span-5">
              {others.map((s, i) => (
                <Reveal key={s.slug} delay={(i + 1) * 0.06} className="h-full">
                  <Link
                    href={`/catalogo/${s.slug}`}
                    prefetch
                    className={cn(
                      "group relative isolate flex h-full min-h-40 flex-col justify-end overflow-hidden bg-card p-6 ring-1 ring-border transition-transform duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99]",
                      RADIUS,
                      TINTED_SHADOW,
                    )}
                  >
                    <Image
                      src={SERVICE_IMAGES[s.slug]!}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 42vw, 100vw"
                      className="-z-20 object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/10"
                    />
                    <h3 className="font-heading text-xl font-semibold text-body">{s.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-body/75">{s.description}</p>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-highlight">
                      {t("home.servicios.boton", "Ver servicio")}
                      <ArrowRightIcon className="size-4 transition-transform motion-safe:group-hover:translate-x-1" aria-hidden />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow: a vertical rail instead of four equal columns, so the order
          of the case reads in the topology and not only in the text. */}
      <section className={cn("bg-surface-raised/40", SECTION_BAND)}>
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
            <h2 className="max-w-md text-balance text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              {t("home.proceso.titulo", "Del caso que envías al trabajo que recibes")}
            </h2>
          </Reveal>
          <ol className="lg:col-span-8">
            {steps.map(({ icon: Icon, ...s }, i) => (
              <li key={s.title}>
                <Reveal
                  delay={i * 0.08}
                  className={cn("relative flex gap-5", i < steps.length - 1 && "pb-12")}
                >
                  <span className="flex flex-col items-center">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border">
                      <Icon className="size-5 text-highlight" strokeWidth={1.5} aria-hidden />
                    </span>
                    {i < steps.length - 1 ? (
                      <span aria-hidden className="mt-2 w-px flex-1 bg-border" />
                    ) : null}
                  </span>
                  <div className="max-w-md pt-2">
                    <h3 className="font-heading text-lg font-semibold text-body">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Before the first case: supporting checklist, deliberately tighter than
          the chapters around it and split 5/7 so the image supports, not leads. */}
      <section className={SECTION_TIGHT}>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:col-span-5">
            <div className={cn("relative aspect-[4/3] overflow-hidden ring-1 ring-border", RADIUS, TINTED_SHADOW)}>
              <Image
                src={t("home.antes.imagen", "/images/tecnico-laboratorio-dental-ajustando-protesis.webp")}
                alt={t("home.antes.imagen_alt", "Técnico del laboratorio dental de Medellín ajustando una prótesis dental en el articulador")}
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className={cn("lg:col-span-7", HEADING_GAP)}>
            <Reveal>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                {t("home.antes.titulo", "Antes de enviar tu primer caso")}
              </h2>
            </Reveal>
            <ul className="divide-y divide-border">
              {beforeFirstCase.map(({ icon: Icon, ...p }, i) => (
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
      <section className={cn("relative isolate overflow-hidden", SECTION_CLOSE)}>
        <Image
          src={t("home.cierre.imagen", "/images/protesis-dental-completa-laboratorio-medellin.webp")}
          alt=""
          fill
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/85" />
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 lg:px-12">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-body lg:text-4xl">
            {t("home.cierre.titulo", "Consulta el catálogo completo")}
          </h2>
          <p className="max-w-[60ch] text-body/80">
            {t("home.cierre.texto", "Cada línea de trabajo tiene su página, y el catálogo en PDF trae los precios.")}
          </p>
          <Link href="/catalogo" prefetch className={cn(buttonVariants(), CTA_BASE)}>
            {t("home.cierre.boton", "Ver catálogo")}
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
