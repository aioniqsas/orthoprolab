import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AlarmClockCheckIcon,
  ArrowRightIcon,
  BrainIcon,
  CheckCircle2Icon,
  CloudCheckIcon,
  HandshakeIcon,
  HeadsetIcon,
  MicroscopeIcon,
  RulerIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Nosotros | Orthopro Lab",
  description:
    "Misión, visión y valores de OrthoPro Lab, laboratorio dental digital de ortodoncia y prótesis CAD/CAM.",
};

const RADIUS = "rounded-xl";
const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";
const CTA_BASE = `h-auto gap-2 ${RADIUS} px-6 py-3.5 font-semibold whitespace-nowrap transition-transform active:scale-[0.98]`;

type Point = { title: string; text: string; icon: LucideIcon };

const MISSION_POINTS: Point[] = [
  { icon: CheckCircle2Icon, title: "Ajuste preciso", text: "Cada aparato se revisa contra el modelo digital antes de salir del laboratorio." },
  { icon: CheckCircle2Icon, title: "Materiales de uso odontológico", text: "Resinas, acrílicos y aleaciones pensados para permanecer en boca." },
  { icon: CheckCircle2Icon, title: "Entregas a tiempo", text: "Planificamos la fabricación según la fecha de cita de tu paciente." },
];

const VISION_POINTS: Point[] = [
  { icon: CloudCheckIcon, title: "Flujo 100 % digital", text: "Escaneo, diseño y fabricación sin yesos ni alginatos." },
  { icon: BrainIcon, title: "Mejora continua", text: "Sumamos herramientas de modelado y fabricación a medida que maduran." },
  { icon: HeadsetIcon, title: "Soporte cercano", text: "Un técnico dental asignado a tu consultorio." },
];

const VALUES: Point[] = [
  { icon: RulerIcon, title: "Precisión", text: "Un ajuste pasivo protege los tejidos y reduce las citas de corrección." },
  { icon: MicroscopeIcon, title: "Rigor técnico", text: "Cada caso pasa por revisión de diseño y control de calidad antes de fabricarse." },
  { icon: AlarmClockCheckIcon, title: "Puntualidad", text: "Respetamos la agenda clínica: la entrega sigue la fecha de tu cita." },
  { icon: HandshakeIcon, title: "Alianza clínica", text: "Participamos en la planificación contigo, no solo fabricamos." },
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
                Un laboratorio digital pensado <span className="text-highlight">para el odontólogo</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[60ch] text-lg text-body/80">
                Unimos diagnóstico digital y fabricación de precisión para que cada aparato llegue listo a tu consultorio.
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
                Dar a odontólogos y ortodoncistas aparatología de precisión, combinando tecnología 3D y oficio técnico para lograr resultados predecibles y cómodos para cada paciente.
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
                Ser el laboratorio de referencia en odontología digital para ortodoncistas y odontólogos de Colombia, con un flujo sin impresiones analógicas y mejora constante.
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
              Cuatro principios en cada caso
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
            Conoce lo que fabricamos para tu clínica
          </h2>
          <p className="max-w-[60ch] text-body/80">
            Revisa cada servicio con sus materiales, requisitos y tiempos.
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
