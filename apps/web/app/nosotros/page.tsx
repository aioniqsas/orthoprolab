import Image from "next/image";
import type { Metadata } from "next";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { fetchContenido, texto } from "@/lib/content";
import { RADIUS, SECTION_BAND, SECTION_LEAD } from "@/lib/ui";
import { BRAND_NAME, pageSocial } from "@/lib/site";

const ABOUT_TITLE = "Laboratorio dental en Medellín para tu consultorio";
const ABOUT_DESCRIPTION =
  "OrthoPro Lab fabrica aparatos de ortodoncia y prótesis dentales en Medellín a partir de los casos de cada consultorio.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  ...pageSocial(`${ABOUT_TITLE} | ${BRAND_NAME}`, ABOUT_DESCRIPTION, "/nosotros"),
};

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

export default async function AboutPage() {
  const contenido = await fetchContenido();
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);

  const pillars = [
    {
      title: t("nosotros.mision.punto1.titulo", "Parte del caso"),
      text: t("nosotros.mision.punto1.texto", "Fabricamos a partir de las impresiones que recibimos."),
    },
    {
      title: t("nosotros.mision.punto2.titulo", "Cuatro líneas de trabajo"),
      text: t("nosotros.mision.punto2.texto", "Ortodoncia fija y removible, alineadores y retenedores."),
    },
    {
      title: t("nosotros.mision.punto3.titulo", "Vuelve a tu consultorio"),
      text: t("nosotros.mision.punto3.texto", "El trabajo terminado regresa al odontólogo que lo pidió."),
    },
  ];

  // Order follows the design; each item keeps the key that already holds its copy.
  const values = [
    {
      title: t("nosotros.valores.punto1.titulo", "Exactitud"),
      text: t("nosotros.valores.punto1.texto", "Trabajamos para que cada aparato corresponda al caso que nos enviaste."),
    },
    {
      title: t("nosotros.valores.punto3.titulo", "Respeto por la agenda"),
      text: t("nosotros.valores.punto3.texto", "Detrás de cada caso hay un paciente con una cita."),
    },
    {
      title: t("nosotros.valores.punto4.titulo", "Trabajo con profesionales"),
      text: t("nosotros.valores.punto4.texto", "Nuestros clientes son odontólogos, ortodoncistas y clínicas."),
    },
    {
      title: t("nosotros.valores.punto2.titulo", "Transparencia"),
      text: t("nosotros.valores.punto2.texto", "Los precios están en el catálogo y los pagos van a la cuenta oficial de la página de pagos."),
    },
  ];

  const ahead = [
    {
      title: t("nosotros.vision.punto1.titulo", "Más trabajo digital"),
      text: t("nosotros.vision.punto1.texto", "Recibir y diseñar los casos en digital cuando el consultorio ya trabaja así."),
    },
    {
      title: t("nosotros.vision.punto2.titulo", "Mejora del servicio"),
      text: t("nosotros.vision.punto2.texto", "Ajustar nuestro proceso con lo que los clientes nos cuentan."),
    },
  ];

  return (
    <>
      {/* Hero: lab photo under a gray-to-black mask, copy in the dark lower part.
          The image is the LCP element, so it carries `priority` and no entrance animation. */}
      <section
        aria-labelledby="h1"
        className="relative isolate flex min-h-[560px] items-end overflow-hidden pt-30 pb-16"
      >
        <Image
          src={t("nosotros.hero.imagen", "/images/tecnicos-laboratorio-dental-trabajando-medellin.webp")}
          alt={t(
            "nosotros.hero.imagen_alt",
            "Técnicos del laboratorio dental fabricando prótesis dentales en Medellín",
          )}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-alt/20 via-background/55 to-background"
        />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 lg:px-12">
          <h1
            id="h1"
            className="max-w-[16ch] text-[clamp(2.5rem,5.4vw,4.25rem)] leading-[1.04] font-bold tracking-[-0.04em] text-balance text-body"
          >
            {t("nosotros.hero.titulo", "Un laboratorio dental")}{" "}
            <span className="text-highlight">
              {t("nosotros.hero.titulo_destacado", "en Medellín")}
            </span>{" "}
            {t("nosotros.hero.titulo_cierre", "para tu consultorio")}
          </h1>
          <p className="max-w-[58ch] text-[19px] text-body/90">
            {t(
              "nosotros.hero.subtitulo",
              "OrthoPro Lab fabrica aparatos de ortodoncia y prótesis dentales en Medellín a partir de los casos de cada consultorio.",
            )}
          </p>
        </div>
      </section>

      {/* How the lab works: three rules on a highlight top rule */}
      <section aria-label="Qué hacemos" className={SECTION_LEAD}>
        <div className="mx-auto grid max-w-7xl items-start gap-5 px-6 sm:grid-cols-2 lg:grid-cols-3 lg:px-12">
          {pillars.map((pillar, i) => (
            <Reveal
              key={pillar.title}
              delay={i * 0.06}
              className="border-t-2 border-highlight pt-5"
            >
              <h2 className="mb-2 font-heading text-2xl font-semibold text-body">{pillar.title}</h2>
              <p className="text-surface-alt">{pillar.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mission and vision share one band: photo left, the two statements right */}
      <section aria-label="Misión y visión" className={cn("border-y border-border bg-surface-raised", SECTION_BAND)}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-12 px-6 lg:px-12">
          <div className={cn("relative aspect-[5/4] w-full min-w-0 flex-[1_1_420px] overflow-hidden", RADIUS)}>
            <Image
              src={t("nosotros.mision.imagen", "/images/tecnico-laboratorio-dental-ajustando-protesis.webp")}
              alt={t(
                "nosotros.mision.imagen_alt",
                "Técnico del laboratorio dental ajustando una prótesis sobre el articulador",
              )}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-10">
            <Reveal className="flex flex-col gap-2.5">
              <h2 className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.03em] text-body">
                {t("nosotros.mision.titulo", "Misión")}
              </h2>
              <p className="text-[18px] text-surface-alt">
                {t(
                  "nosotros.mision.intro",
                  "Fabricar aparatos de ortodoncia y prótesis dentales a partir de lo que cada odontólogo planifica para su paciente.",
                )}
              </p>
            </Reveal>
            <Reveal className="flex flex-col gap-2.5">
              <h2 className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] font-semibold tracking-[-0.03em] text-body">
                {t("nosotros.vision.titulo", "Visión")}
              </h2>
              <p className="text-[18px] text-surface-alt">
                {t(
                  "nosotros.vision.intro",
                  "Ser un laboratorio al que odontólogos y ortodoncistas de Colombia recurran para sus casos de ortodoncia y prótesis.",
                )}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How the lab works with a practice */}
      <section aria-labelledby="valores" className={SECTION_BAND}>
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <Reveal>
            <h2
              id="valores"
              className="mb-9 font-heading text-[clamp(1.875rem,3.4vw,2.75rem)] font-semibold tracking-[-0.035em] text-body"
            >
              {t("nosotros.valores.titulo", "Cómo trabajamos")}
            </h2>
          </Reveal>
          <ul className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, i) => (
              <li key={value.title} className="h-full">
                <Reveal
                  delay={i * 0.06}
                  className={cn("flex h-full flex-col gap-2 border border-border bg-surface-raised p-7", RADIUS)}
                >
                  {/* Two title lines are reserved on wide screens so the texts start at the same height. */}
                  <h3 className="font-heading text-[22px] leading-[1.25] font-semibold text-body lg:min-h-[2.5em]">{value.title}</h3>
                  <p className="text-surface-alt">{value.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Where the lab is going */}
      <section aria-labelledby="proximos" className="pb-24 lg:pb-28">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-12 px-6 lg:px-12">
          <h2
            id="proximos"
            className="min-w-0 flex-[1_1_280px] font-heading text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.03em] text-body"
          >
            {t("nosotros.proximos.titulo", "Hacia dónde vamos")}
          </h2>
          <div className="grid min-w-0 flex-[999_1_560px] items-start gap-8 sm:grid-cols-2">
            {ahead.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06} className="flex flex-col gap-1.5">
                <h3 className="font-heading text-xl font-semibold text-highlight">{item.title}</h3>
                <p className="text-surface-alt">{item.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
