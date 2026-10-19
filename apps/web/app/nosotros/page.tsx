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
import { BRAND_NAME, pageSocial } from "@/lib/site";

const ABOUT_TITLE = "Sobre nosotros: laboratorio dental en Medellín";
const ABOUT_DESCRIPTION =
  "Conoce la misión y la visión de OrthoPro Lab, laboratorio dental en Medellín para ortodoncia y prótesis CAD/CAM.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  ...pageSocial(`${ABOUT_TITLE} | ${BRAND_NAME}`, ABOUT_DESCRIPTION, "/nosotros"),
};

const RADIUS = "rounded-xl";
const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";
const CTA_BASE = `h-auto gap-2 ${RADIUS} px-6 py-3.5 font-semibold whitespace-nowrap transition-transform active:scale-[0.98]`;

type Point = { title: string; text: string; icon: LucideIcon };

const MISSION_POINTS: Point[] = [
  { icon: CheckCircle2Icon, title: "Parte del caso", text: "Fabricamos a partir del escaneo o las impresiones que recibimos." },
  { icon: CheckCircle2Icon, title: "Cinco líneas de trabajo", text: "Ortodoncia fija y removible, alineadores, retenedores y prótesis CAD/CAM." },
  { icon: CheckCircle2Icon, title: "Vuelve a tu consultorio", text: "El trabajo terminado regresa al odontólogo que lo pidió." },
];

const VISION_POINTS: Point[] = [
  { icon: CloudCheckIcon, title: "Más trabajo digital", text: "Recibir y diseñar los casos en digital cuando el consultorio ya trabaja así." },
  { icon: TrendingUpIcon, title: "Mejora del servicio", text: "Ajustar nuestro proceso con lo que los clientes nos cuentan." },
];

const VALUES: Point[] = [
  { icon: RulerIcon, title: "Precisión", text: "Trabajamos para que cada aparato corresponda al caso que nos enviaste." },
  { icon: ReceiptTextIcon, title: "Claridad", text: "Los precios están en el catálogo y los pagos van a las cuentas oficiales de la página de pagos." },
  { icon: CalendarCheckIcon, title: "Respeto por la agenda", text: "Detrás de cada caso hay un paciente con una cita." },
  { icon: UsersIcon, title: "Trabajo con profesionales", text: "Nuestros clientes son odontólogos, ortodoncistas y clínicas." },
];

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

export default function AboutPage() {
  return (
    <>
      {/* Hero: cleanroom image under a vertical gray-to-black mask; copy sits in the dark lower part */}
      <section className="relative isolate flex min-h-[calc(100dvh-4rem)] items-end overflow-hidden pt-24 pb-16 lg:pb-24">
        <Image
          src="/images/lab-cleanroom.jpg"
          alt="Técnicos trabajando con fresadoras y escáner en el laboratorio"
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
                Un laboratorio para <span className="text-highlight">odontólogos y ortodoncistas</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[60ch] text-lg text-body/80">
                OrthoPro Lab fabrica aparatos de ortodoncia y prótesis dentales en Medellín a partir de los casos de cada consultorio.
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
                src="/images/team-technician.jpg"
                alt="Técnica del laboratorio revisando un alineador con microscopio"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Reveal className="flex flex-col gap-4">
              <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                Nuestra <span className="text-highlight">misión</span>
              </h2>
              <p className="max-w-[60ch] text-body/80">
                Fabricar aparatos de ortodoncia y prótesis dentales a partir de lo que cada odontólogo planifica para su paciente.
              </p>
            </Reveal>
            <PointList points={MISSION_POINTS} />
          </div>
        </div>
      </section>

      {/* Vision: text left, image right */}
      <section id="vision" className="scroll-mt-16 bg-surface-raised/40 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Reveal className="flex flex-col gap-4">
              <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                Nuestra <span className="text-highlight">visión</span>
              </h2>
              <p className="max-w-[60ch] text-body/80">
                Ser un laboratorio al que odontólogos y ortodoncistas de Colombia recurran para sus casos de ortodoncia y prótesis.
              </p>
            </Reveal>
            <PointList points={VISION_POINTS} />
          </div>
          <Reveal className="lg:col-span-5">
            <div className={cn("relative aspect-[4/5] overflow-hidden ring-1 ring-border", RADIUS, TINTED_SHADOW)}>
              <Image
                src="/images/service-protesis-cad-cam.jpg"
                alt="Estructura protésica fresada con tecnología CAD/CAM"
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
              Cuatro principios para trabajar contigo
            </h2>
          </Reveal>
          <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
            {VALUES.map(({ icon: Icon, ...v }, i) => (
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
        <Image src="/images/lab-milling.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/85" />
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 lg:px-12">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
            Revisa lo que fabricamos
          </h2>
          <p className="max-w-[60ch] text-body/80">
            Cada línea de trabajo tiene su página en el catálogo.
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
