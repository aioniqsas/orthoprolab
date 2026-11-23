import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { FaqPageJsonLd, JsonLd } from "@/components/json-ld";
import { fetchServices } from "@/lib/api-catalog";
import { CATALOG_PDF_HREF, SERVICE_IMAGES } from "@/lib/catalog";
import { fetchContenido, texto } from "@/lib/content";
import { HOME_FAQ, faqConContenido } from "@/lib/faq";
import {
  CTA_BASE,
  HEADING_GAP,
  RADIUS,
  SECTION_BAND,
  SECTION_CLOSE,
  SECTION_LEAD,
  TINTED_SHADOW,
} from "@/lib/ui";
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
  whatsappUrl,
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

// Alt text per line, as in the design; the name is the fallback for a slug the
// catalog adds later.
const SERVICE_ALTS: Record<string, string> = {
  "ortodoncia-fija": "Expansor de ortodoncia fija con tornillo central",
  "ortodoncia-removible": "Placa removible de ortodoncia con tornillo",
  "alineadores-invisibles": "Alineadores transparentes sobre modelos dentales",
  "retenedores-y-ferulas": "Placa de acrílico removible sobre modelo de yeso",
};

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

export default async function Home() {
  const [contenido, services] = await Promise.all([fetchContenido(), fetchServices()]);
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);
  const faq = faqConContenido(HOME_FAQ, contenido, "home.faq");
  // A card needs a photo: the admin upload from the API, else the line's lab
  // photo, else the entry waits.
  const cards = services.filter((s) => s.imagenUrl ?? SERVICE_IMAGES[s.slug]);

  // One message for every CTA: the card preview shows exactly what WhatsApp sends.
  const mensaje = t("home.whatsapp.mensaje", "Hola, quiero enviar un caso a OrthoPro Lab.");
  const whatsappHref = whatsappUrl(mensaje);

  const steps = [
    { title: t("home.orden.paso1.titulo", "Recibimos"), text: t("home.orden.paso1.texto", "las impresiones físicas de tu paciente.") },
    { title: t("home.orden.paso2.titulo", "Planificamos"), text: t("home.orden.paso2.texto", "el aparato o la prótesis a partir de lo que enviaste.") },
    { title: t("home.orden.paso3.titulo", "Elaboramos"), text: t("home.orden.paso3.texto", "el trabajo en el laboratorio, línea por línea.") },
    { title: t("home.orden.paso4.titulo", "Entregamos"), text: t("home.orden.paso4.texto", "el trabajo terminado en tu consultorio.") },
  ];

  return (
    <>
      <JsonLd data={BUSINESS_JSON_LD} />
      <FaqPageJsonLd items={faq} />

      {/* Hero: full-bleed photo under a gray-to-black mask. The image is the LCP
          element, so it carries `priority` and no entrance animation; only the
          copy reveals. */}
      <section
        aria-labelledby="h1"
        className="relative isolate flex min-h-[80dvh] flex-col justify-end overflow-hidden pt-32 pb-14 lg:pb-18"
      >
        <Image
          src={t("home.hero.imagen", "/images/hero.jpg")}
          alt={t("home.hero.imagen_alt", "Alineador transparente sobre una base de obsidiana en el laboratorio")}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-alt/35 via-background/45 to-background"
        />
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
          <div className="flex max-w-4xl flex-col gap-6">
            <Reveal>
              {/* Two steps of one heading: the lab name dominates, the lines
                  follow smaller. "en Medellín" carries the local search intent. */}
              <h1
                id="h1"
                className="flex flex-col gap-2.5 leading-[1.04] font-bold tracking-[-0.04em] text-balance"
              >
                <span className="text-[clamp(3.25rem,7.4vw,6rem)] text-body">
                  {t("home.hero.titulo", "Laboratorio dental")}
                </span>
                <span className="text-[clamp(1.625rem,3vw,2.5rem)] font-semibold tracking-[-0.03em] text-body">
                  {t("home.hero.titulo_secundario", "con ortodoncia y prótesis")}{" "}
                  <span className="text-highlight">{t("home.hero.titulo_destacado", "en Medellín")}</span>
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[58ch] text-lg text-body/90 md:text-xl">
                {t(
                  "home.hero.subtitulo",
                  "Fabricamos aparatos de ortodoncia y prótesis a partir de las impresiones de tu caso. Hablas directo con quien lo hace, por WhatsApp.",
                )}
              </p>
            </Reveal>
            <Reveal delay={0.2} className="flex flex-wrap items-center gap-3.5 pt-1">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants(), CTA_BASE)}
              >
                {t("home.hero.boton_caso", "Enviar un caso")}
              </a>
              <Link
                href="#servicios"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  CTA_BASE,
                  "border-body/40 bg-background/60 text-body hover:bg-background/80",
                )}
              >
                {t("home.hero.boton_servicios", "Ver servicios")}
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Services: four equal rows. Titles reserve two lines and the grid is
          items-start, so images, titles and links line up even when a name
          wraps (S2). */}
      <section
        id="servicios"
        aria-labelledby="servicios-titulo"
        className={cn("scroll-mt-8", SECTION_LEAD)}
      >
        <div className={cn("mx-auto max-w-7xl px-6 lg:px-12", HEADING_GAP)}>
          <div className="flex flex-col gap-3">
            <h2
              id="servicios-titulo"
              className="max-w-[18ch] text-balance text-4xl font-semibold tracking-[-0.035em] text-body lg:text-5xl"
            >
              {t("home.servicios.titulo", "Cuatro líneas de trabajo para ortodoncia")}
            </h2>
            <p className="max-w-[56ch] text-surface-alt">
              {t(
                "home.servicios.texto",
                "Cada línea tiene su página con fotos del trabajo real y su precio en el catálogo.",
              )}
            </p>
          </div>
          <ul className="grid items-start gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((s, i) => (
              <li key={s.slug}>
                <Reveal delay={i * 0.06}>
                  <Link
                    href={`/catalogo/${s.slug}`}
                    prefetch
                    className="group flex flex-col gap-3 text-body"
                  >
                    <span className={cn("relative block aspect-[4/3] w-full overflow-hidden", RADIUS)}>
                      <Image
                        src={s.imagenUrl ?? SERVICE_IMAGES[s.slug]!}
                        alt={SERVICE_ALTS[s.slug] ?? s.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                      />
                    </span>
                    <h3 className="min-h-[2.5em] font-heading text-2xl leading-[1.25] font-semibold">
                      {s.name}
                    </h3>
                    <span className="inline-flex items-center gap-2 font-semibold text-highlight">
                      {t("home.servicios.boton", "Ver")} {s.name.toLowerCase()}
                      <ArrowRightIcon
                        className="size-4 transition-transform motion-safe:group-hover:translate-x-1"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* First case: the steps read as a sequence on a rail, beside the WhatsApp
          card that starts it. */}
      <section
        id="orden"
        aria-labelledby="orden-titulo"
        className={cn("scroll-mt-8 border-y border-border bg-surface-raised", SECTION_BAND)}
      >
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:px-12">
          <div className="flex min-w-0 flex-col gap-4.5">
            <h2
              id="orden-titulo"
              className="text-balance text-3xl font-semibold tracking-[-0.035em] text-body lg:text-4xl"
            >
              {t("home.orden.titulo", "Envía tu primer caso")}
            </h2>
            <p className="max-w-[46ch] text-surface-alt">
              {t(
                "home.orden.texto",
                "Escríbenos por WhatsApp y coordinamos cómo nos llegan las impresiones de tu caso.",
              )}
            </p>
            <ol className="mt-3 flex list-none flex-col gap-3.5 border-l border-title pl-5.5">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <strong
                    className={cn(
                      "font-heading",
                      i === steps.length - 1 ? "text-highlight" : "text-body",
                    )}
                  >
                    {s.title}
                  </strong>
                  <br />
                  <span className="text-surface-alt">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <Reveal
            className={cn(
              "flex min-w-0 flex-col gap-4.5 border border-border bg-background p-8",
              RADIUS,
              TINTED_SHADOW,
            )}
          >
            <h3 className="font-heading text-2xl font-semibold text-body">
              {t("home.whatsapp.titulo", "Escríbenos por WhatsApp")}
            </h3>
            <p className="text-surface-alt">
              {t(
                "home.whatsapp.texto",
                "Pregunta por los servicios, cómo enviar un caso o cómo pagar. Nuestro asistente responde al instante y, si hace falta, te pasa con el laboratorio.",
              )}
            </p>
            <div
              className={cn(
                "border border-border bg-surface-raised px-4 py-3.5 text-sm text-surface-alt",
                RADIUS,
              )}
            >
              <span className="mb-1 block text-xs">{t("home.whatsapp.vista_previa", "Así empieza tu chat")}</span>
              «{mensaje}»
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants(), CTA_BASE, "justify-center text-[17px]")}
            >
              {t("home.whatsapp.boton", "Abrir WhatsApp")}
            </a>
            <p className="text-sm text-surface-alt">
              {t("home.whatsapp.precios", "¿Primero los precios?")}{" "}
              <a href={CATALOG_PDF_HREF} className="font-medium underline">
                {t("home.whatsapp.catalogo", "Descarga el catálogo en PDF")}
              </a>
              .
            </p>
          </Reveal>
        </div>
      </section>

      {/* Team: the direct-contact promise, led by a photo of real work. */}
      <section aria-labelledby="equipo" className={SECTION_CLOSE}>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:px-12">
          <Reveal className="min-w-0">
            <div className={cn("relative aspect-[5/4] w-full overflow-hidden", RADIUS)}>
              <Image
                src={t("home.equipo.imagen", "/images/tecnico-laboratorio-dental-ajustando-protesis.webp")}
                alt={t("home.equipo.imagen_alt", "Técnico del laboratorio ajustando una prótesis dental")}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className="flex min-w-0 flex-col gap-4.5">
            <h2
              id="equipo"
              className="text-balance text-3xl font-semibold tracking-[-0.035em] text-body lg:text-4xl"
            >
              {t("home.equipo.titulo", "Hablas con quien hace tu trabajo")}
            </h2>
            <p className="max-w-[50ch] text-surface-alt">
              {t(
                "home.equipo.texto",
                "Sin intermediarios: las dudas del caso se resuelven por WhatsApp con el laboratorio, y sigues cada caso en el portal de clínicas.",
              )}
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                CTA_BASE,
                "w-fit border-body/40 text-body",
              )}
            >
              {t("home.equipo.boton", "Escribir por WhatsApp")}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ: the visible list and the FAQPage JSON-LD read the same array. */}
      <section
        aria-labelledby="faq"
        className={cn("border-t border-border bg-surface-raised", SECTION_BAND)}
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-3 lg:px-12">
          <div className="flex min-w-0 flex-col gap-3.5 self-start">
            <h2
              id="faq"
              className="text-balance text-3xl font-semibold tracking-[-0.035em] text-body lg:text-4xl"
            >
              {t("home.faq.titulo", "Preguntas frecuentes")}
            </h2>
            <p className="text-surface-alt">
              {t("home.faq.texto", "Antes del primer caso y sobre cómo elegir un laboratorio dental. Más en nuestro")}{" "}
              <Link href="/laboratorio-dental-ortodoncia" className="font-medium underline">
                {t("home.faq.articulo", "artículo para elegir laboratorio")}
              </Link>
              .
            </p>
          </div>
          <div className="min-w-0 lg:col-span-2">
            {faq.map(({ pregunta, respuesta }) => (
              <details
                key={pregunta}
                className="border-t border-border py-4.5 last:border-b"
              >
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-lg font-medium text-body">
                  {pregunta}
                </summary>
                <p className="mt-2.5 text-surface-alt">{respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
