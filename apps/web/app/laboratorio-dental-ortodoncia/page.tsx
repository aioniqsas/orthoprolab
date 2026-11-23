import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { FaqPageJsonLd, JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { fetchContenido, texto } from "@/lib/content";
import { ARTICLE_FAQ, faqConContenido } from "@/lib/faq";
import { CTA_BASE, RADIUS } from "@/lib/ui";
import { BRAND_NAME, SITE_URL, pageSocial, whatsappUrl } from "@/lib/site";

const ARTICLE_PATH = "/laboratorio-dental-ortodoncia";
const ARTICLE_TITLE = "Laboratorio dental de ortodoncia: qué debes saber antes de elegir";
const ARTICLE_DESCRIPTION =
  "Qué hace un laboratorio dental de ortodoncia, en qué se diferencia de uno generalista y qué mirar antes de enviarle tus casos.";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  ...pageSocial(`${ARTICLE_TITLE} | ${BRAND_NAME}`, ARTICLE_DESCRIPTION, ARTICLE_PATH),
};

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Laboratorio dental de ortodoncia", item: `${SITE_URL}${ARTICLE_PATH}` },
  ],
};

const H2 = "mt-14 mb-3.5 font-heading text-[clamp(1.625rem,3vw,2.125rem)] leading-[1.15] font-semibold tracking-[-0.03em] text-body";
const P = "mb-4 text-[18px] text-body/85";
const LIST = "mb-4 list-disc space-y-2 pl-[22px] text-[18px] text-body/85";

function Heading({ children }: { children: ReactNode }) {
  return <h2 className={H2}>{children}</h2>;
}

export default async function OrthodonticsLabArticlePage() {
  const contenido = await fetchContenido();
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);

  // One array: the `<details>` list and the FAQPage JSON-LD read the same items.
  const faq = faqConContenido(ARTICLE_FAQ, contenido, "articulo.faq");
  const whatsappHref = whatsappUrl(
    t("articulo.whatsapp.mensaje", "Hola, quiero enviar un caso a OrthoPro Lab."),
  );

  const lineas = [
    {
      title: t("articulo.servicios.linea1.titulo", "Ortodoncia fija:"),
      text: t("articulo.servicios.linea1", "disyuntores (Hyrax y Haas), botón de Nance y arco lingual."),
    },
    {
      title: t("articulo.servicios.linea2.titulo", "Ortodoncia removible:"),
      text: t("articulo.servicios.linea2", "placa Hawley, expansor Schwarz, Twin Block y Bionator."),
    },
    {
      title: t("articulo.servicios.linea3.titulo", "Alineadores invisibles:"),
      text: t("articulo.servicios.linea3", "alineadores transparentes y guías para ataches."),
    },
    {
      title: t("articulo.servicios.linea4.titulo", "Retenedores y férulas:"),
      text: t("articulo.servicios.linea4", "férula de descarga, retenedor transparente y retenedor fijo."),
    },
  ];
  const preguntas = [
    t("articulo.especializado.pregunta1", "Si hace con frecuencia el tipo de aparato que necesita tu caso."),
    t("articulo.especializado.pregunta2", "Quién revisa el trabajo antes de devolverlo."),
    t("articulo.especializado.pregunta3", "Cómo maneja los ajustes o las repeticiones."),
  ];
  const pasos = [
    {
      title: t("articulo.proceso.paso1.titulo", "Recibimos"),
      text: t("articulo.proceso.paso1.texto", "las impresiones físicas de tu paciente."),
    },
    {
      title: t("articulo.proceso.paso2.titulo", "Planificamos"),
      text: t("articulo.proceso.paso2.texto", "el aparato o la prótesis a partir de lo que enviaste."),
    },
    {
      title: t("articulo.proceso.paso3.titulo", "Elaboramos"),
      text: t("articulo.proceso.paso3.texto", "el trabajo en el laboratorio, línea por línea."),
    },
    {
      title: t("articulo.proceso.paso4.titulo", "Entregamos:"),
      text: t("articulo.proceso.paso4.texto", "el trabajo terminado vuelve a tu consultorio."),
    },
  ];

  return (
    <>
      <JsonLd data={BREADCRUMB_JSON_LD} />
      <FaqPageJsonLd items={faq} />

      <article className="mx-auto max-w-[760px] px-6 pt-14 pb-6">
        <nav aria-label="Ruta" className="mb-7 text-sm text-surface-alt">
          <Link href="/" className="underline-offset-4 hover:underline">
            Inicio
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span aria-current="page" className="text-body">
            Laboratorio dental de ortodoncia
          </span>
        </nav>

        {/* The h1 carries the target search intent; the second half is the
            article's promise, so highlight only that. */}
        <h1 className="mb-5 text-[clamp(2.25rem,4.8vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.04em] text-balance text-body">
          {t("articulo.titulo_inicio", "Laboratorio dental de ortodoncia:")}{" "}
          <span className="text-highlight">
            {t("articulo.titulo_destacado", "qué debes saber antes de elegir")}
          </span>
        </h1>
        <p className="mb-10 text-xl text-surface-alt">
          {t(
            "articulo.entradilla",
            "Qué hace un laboratorio dental de ortodoncia, en qué se diferencia de uno generalista y qué mirar antes de enviarle tus casos.",
          )}
        </p>

        <Heading>
          {t("articulo.servicios.titulo", "Qué servicios ofrece un laboratorio dental de ortodoncia")}
        </Heading>
        <p className={P}>
          {t(
            "articulo.servicios.intro",
            "Un laboratorio dental fabrica, a partir de la prescripción del odontólogo, los aparatos y las piezas que el consultorio no hace en la silla. En ortodoncia, esos trabajos suelen agruparse en cuatro líneas:",
          )}
        </p>
        <ul className={LIST}>
          {lineas.map((linea) => (
            <li key={linea.title}>
              <strong>{linea.title}</strong> {linea.text}
            </li>
          ))}
        </ul>
        <p className={P}>
          {t("articulo.servicios.catalogo_texto", "Puedes ver cada línea con sus productos en el")}{" "}
          <Link href="/catalogo" className="font-medium underline underline-offset-4">
            {t("articulo.servicios.catalogo_enlace", "catálogo")}
          </Link>
          .
        </p>

        <Heading>{t("articulo.especializado.titulo", "Laboratorio especializado o generalista")}</Heading>
        <p className={P}>
          {t(
            "articulo.especializado.intro",
            "Un laboratorio generalista cubre muchos tipos de trabajo: coronas, puentes, prótesis y más. Uno especializado en ortodoncia concentra su producción en aparatos ortodóncicos. Antes de decidir, pregunta:",
          )}
        </p>
        <ul className={LIST}>
          {preguntas.map((pregunta) => (
            <li key={pregunta}>{pregunta}</li>
          ))}
        </ul>

        <Heading>{t("articulo.proceso.titulo", "Cómo trabaja OrthoPro Lab, en Medellín")}</Heading>
        <p className={P}>
          {t(
            "articulo.proceso.intro",
            "OrthoPro Lab es un laboratorio dental en Medellín que fabrica aparatos de ortodoncia y prótesis a partir de las impresiones de tu caso. El proceso es este:",
          )}
        </p>
        <ol className={cn(LIST, "list-decimal")}>
          {pasos.map((paso) => (
            <li key={paso.title}>
              <strong>{paso.title}</strong> {paso.text}
            </li>
          ))}
        </ol>
        <p className={P}>
          {t(
            "articulo.proceso.precios",
            "Los precios de cada línea están en el catálogo en PDF. Para dudas del caso, escribes directo al laboratorio por WhatsApp.",
          )}
        </p>
      </article>

      {/* FAQ: the visible list and the FAQPage JSON-LD read the same array. */}
      <section aria-labelledby="faq" className="mx-auto max-w-[760px] px-6 pt-6 pb-18">
        <h2
          id="faq"
          className="mb-6 font-heading text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.035em] text-balance text-body"
        >
          {t("articulo.faq.titulo", "Preguntas frecuentes")}
        </h2>
        {faq.map(({ pregunta, respuesta }) => (
          <details key={pregunta} className="border-t border-border py-4.5 last:border-b">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-lg font-medium text-body">
              {pregunta}
            </summary>
            <p className="mt-2.5 text-surface-alt">{respuesta}</p>
          </details>
        ))}
      </section>

      <section className="mx-auto mb-28 max-w-[760px] px-6">
        <Reveal
          className={cn(
            "flex flex-wrap items-center justify-between gap-5 border border-border bg-surface-raised p-8",
            RADIUS,
          )}
        >
          <h2 className="max-w-[18ch] font-heading text-[26px] font-semibold tracking-[-0.03em] text-body">
            {t("articulo.cta.titulo", "¿Tienes un caso para enviar?")}
          </h2>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), CTA_BASE)}
          >
            {t("articulo.cta.boton", "Escribir por WhatsApp")}
          </a>
        </Reveal>
      </section>
    </>
  );
}
