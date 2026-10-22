import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  CloudCheckIcon,
  ReceiptTextIcon,
  RulerIcon,
  TrendingUpIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { fetchContenido, texto } from "@/lib/content";
import { BRAND_NAME, pageSocial } from "@/lib/site";

const ABOUT_TITLE = "Sobre nosotros: laboratorio dental en Medellín";
const ABOUT_DESCRIPTION =
  "Conoce la misión y la visión de OrthoPro Lab, laboratorio dental en Medellín para ortodoncia.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  ...pageSocial(`${ABOUT_TITLE} | ${BRAND_NAME}`, ABOUT_DESCRIPTION, "/nosotros"),
};

const RADIUS = "rounded-xl";
const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";
const CTA_BASE = `h-auto gap-2 ${RADIUS} px-6 py-3.5 font-semibold whitespace-nowrap transition-transform active:scale-[0.98]`;

type Point = { title: string; text: string; icon: LucideIcon };

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

function PointList({ points }: { points: Point[] }) {
  return (
    <ul className="divide-y divide-border">
      {points.map(({ icon: Icon, ...p }, i) => (
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
  );
}

export default async function AboutPage() {
  const contenido = await fetchContenido();
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);

  const missionPoints: Point[] = [
    { icon: CheckCircle2Icon, title: t("nosotros.mision.punto1.titulo", "Parte del caso"), text: t("nosotros.mision.punto1.texto", "Fabricamos a partir de las impresiones que recibimos.") },
    { icon: CheckCircle2Icon, title: t("nosotros.mision.punto2.titulo", "Cuatro líneas de trabajo"), text: t("nosotros.mision.punto2.texto", "Ortodoncia fija y removible, alineadores y retenedores.") },
    { icon: CheckCircle2Icon, title: t("nosotros.mision.punto3.titulo", "Vuelve a tu consultorio"), text: t("nosotros.mision.punto3.texto", "El trabajo terminado regresa al odontólogo que lo pidió.") },
  ];

  const visionPoints: Point[] = [
    { icon: CloudCheckIcon, title: t("nosotros.vision.punto1.titulo", "Más trabajo digital"), text: t("nosotros.vision.punto1.texto", "Recibir y diseñar los casos en digital cuando el consultorio ya trabaja así.") },
    { icon: TrendingUpIcon, title: t("nosotros.vision.punto2.titulo", "Mejora del servicio"), text: t("nosotros.vision.punto2.texto", "Ajustar nuestro proceso con lo que los clientes nos cuentan.") },
  ];

  const values: Point[] = [
    { icon: RulerIcon, title: t("nosotros.valores.punto1.titulo", "Precisión"), text: t("nosotros.valores.punto1.texto", "Trabajamos para que cada aparato corresponda al caso que nos enviaste.") },
    { icon: ReceiptTextIcon, title: t("nosotros.valores.punto2.titulo", "Claridad"), text: t("nosotros.valores.punto2.texto", "Los precios están en el catálogo y los pagos van a la cuenta oficial de la página de pagos.") },
    { icon: CalendarCheckIcon, title: t("nosotros.valores.punto3.titulo", "Respeto por la agenda"), text: t("nosotros.valores.punto3.texto", "Detrás de cada caso hay un paciente con una cita.") },
    { icon: UsersIcon, title: t("nosotros.valores.punto4.titulo", "Trabajo con profesionales"), text: t("nosotros.valores.punto4.texto", "Nuestros clientes son odontólogos, ortodoncistas y clínicas.") },
  ];

  return (
    <>
      {/* Hero: lab photo under a vertical gray-to-black mask; copy sits in the dark lower part */}
      <section className="relative isolate flex min-h-[calc(100dvh-4rem)] items-end overflow-hidden pt-24 pb-16 lg:pb-24">
        <Image
          src={t("nosotros.hero.imagen", "/images/tecnicos-laboratorio-dental-trabajando-medellin.webp")}
          alt={t("nosotros.hero.imagen_alt", "Técnicos del laboratorio dental fabricando prótesis dentales en Medellín")}
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
          className="-z-20 object-cover object-left"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-alt/50 via-background/85 to-background"
        />
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
          <div className="flex max-w-3xl flex-col gap-6">
            <Reveal>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tighter text-body md:text-5xl lg:text-6xl">
                {t("nosotros.hero.titulo", "Un laboratorio para")} <span className="text-highlight">{t("nosotros.hero.titulo_destacado", "odontólogos y ortodoncistas")}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[60ch] text-lg text-body/80">
                {t("nosotros.hero.subtitulo", "OrthoPro Lab fabrica aparatos de ortodoncia y prótesis dentales en Medellín a partir de los casos de cada consultorio.")}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mission: image left, text right */}
      <section id="mision" className="scroll-mt-16 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:col-span-5">
            <div className={cn("relative aspect-[4/5] overflow-hidden ring-1 ring-border", RADIUS, TINTED_SHADOW)}>
              <Image
                src={t("nosotros.mision.imagen", "/images/tecnico-laboratorio-dental-ajustando-protesis.webp")}
                alt={t("nosotros.mision.imagen_alt", "Técnico del laboratorio dental ajustando una prótesis sobre el articulador")}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Reveal className="flex flex-col gap-4">
              <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                {t("nosotros.mision.titulo", "Nuestra")} <span className="text-highlight">{t("nosotros.mision.titulo_destacado", "misión")}</span>
              </h2>
              <p className="max-w-[60ch] text-body/80">
                {t("nosotros.mision.intro", "Fabricar aparatos de ortodoncia y prótesis dentales a partir de lo que cada odontólogo planifica para su paciente.")}
              </p>
            </Reveal>
            <PointList points={missionPoints} />
          </div>
        </div>
      </section>

      {/* Vision: text left, image right */}
      <section id="vision" className="scroll-mt-16 bg-surface-raised/40 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Reveal className="flex flex-col gap-4">
              <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                {t("nosotros.vision.titulo", "Nuestra")} <span className="text-highlight">{t("nosotros.vision.titulo_destacado", "visión")}</span>
              </h2>
              <p className="max-w-[60ch] text-body/80">
                {t("nosotros.vision.intro", "Ser un laboratorio al que odontólogos y ortodoncistas de Colombia recurran para sus casos de ortodoncia y prótesis.")}
              </p>
            </Reveal>
            <PointList points={visionPoints} />
          </div>
          <Reveal className="lg:col-span-5">
            <div className={cn("relative aspect-[4/5] overflow-hidden ring-1 ring-border", RADIUS, TINTED_SHADOW)}>
              <Image
                src={t("nosotros.vision.imagen", "/images/protesis-total-superior-ortopro-lab-medellin.webp")}
                alt={t("nosotros.vision.imagen_alt", "Prótesis dental terminada en el laboratorio de Medellín")}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values: heading left, divided list right */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:col-span-4">
            <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              {t("nosotros.valores.titulo", "Cuatro principios para trabajar contigo")}
            </h2>
          </Reveal>
          <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
            {values.map(({ icon: Icon, ...v }, i) => (
              <li key={v.title}>
                <Reveal delay={i * 0.08} className="flex flex-col gap-3 border-t border-border pt-6">
                  <Icon className="size-6 text-highlight" strokeWidth={1.5} aria-hidden />
                  <h3 className="font-heading text-lg font-semibold text-body">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{v.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative isolate overflow-hidden py-20 lg:py-28">
        <Image src={t("nosotros.cierre.imagen", "/images/protesis-dental-completa-laboratorio-medellin.webp")} alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/85" />
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 lg:px-12">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
            {t("nosotros.cierre.titulo", "Revisa lo que fabricamos")}
          </h2>
          <p className="max-w-[60ch] text-body/80">
            {t("nosotros.cierre.texto", "Cada línea de trabajo tiene su página en el catálogo.")}
          </p>
          <Link href="/catalogo" prefetch className={cn(buttonVariants(), CTA_BASE)}>
            {t("nosotros.cierre.boton", "Ver catálogo")}
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
