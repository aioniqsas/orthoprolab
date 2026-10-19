import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  CloudIcon,
  CpuIcon,
  HeadsetIcon,
  PencilRulerIcon,
  RefreshCwIcon,
  ScanLineIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { SERVICES } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Inicio | Orthopro Lab",
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
    title: "Enviar el escaneo",
    text: "Recibimos archivos STL o PLY de tu escáner, o retiramos los modelos físicos.",
    icon: ScanLineIcon,
  },
  {
    title: "Planificar en 3D",
    text: "Diseñamos el caso en CAD y lo validas en un enlace web antes de fabricar.",
    icon: PencilRulerIcon,
  },
  {
    title: "Fabricar el aparato",
    text: "Impresión 3D y fresado CNC en un entorno de temperatura controlada.",
    icon: CpuIcon,
  },
  {
    title: "Entregar en consultorio",
    text: "Empaque individual con código QR para trazar el lote de materiales.",
    icon: TruckIcon,
  },
];

const PERKS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Contacto directo",
    text: "Chat con el técnico dental a cargo de tu caso.",
    icon: HeadsetIcon,
  },
  {
    title: "Respaldo en la nube",
    text: "Tus archivos STL quedan guardados de forma segura.",
    icon: CloudIcon,
  },
  {
    title: "Reposición",
    text: "Repetimos el aparato si presenta un desajuste.",
    icon: RefreshCwIcon,
  },
];

// PLACEHOLDER: mock testimonials from the Stitch design. Replace with real
// quotes (and permission to publish them) before launch.
const TESTIMONIALS = [
  {
    quote:
      "El ajuste de los disyuntores soldados con láser es impecable. Redujimos las citas de reacomodamiento.",
    name: "Dr. Roberto Santoro",
    role: "Especialista en Ortodoncia y Ortopedia Maxilar",
  },
  {
    quote:
      "Enviar los STL desde nuestro escáner simplificó la logística de alineadores.",
    name: "Dra. Mariana López",
    role: "Directora clínica, Dental Design & Aligners",
  },
];

export default function Home() {
  const [featured, ...others] = SERVICES;

  return (
    <>
      {/* Hero: full-width image under a vertical gray-to-black mask. Copy sits
          in the lower, darker part of the mask so body text keeps AA contrast. */}
      <section className="relative isolate flex min-h-[calc(100dvh-4rem)] items-end overflow-hidden pt-24 pb-20 lg:min-h-[calc(115dvh-4rem)] lg:pb-32">
        <Image
          src="/images/hero.jpg"
          alt="Alineador transparente sobre una base de obsidiana en el laboratorio"
          fill
          priority
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
                Aparatología ortodóntica <span className="text-highlight">de precisión</span> para tu clínica
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-[60ch] text-lg text-body/90 md:text-xl">
                Laboratorio digital de ortodoncia fija, removible, alineadores y prótesis para odontólogos y especialistas.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="#servicios" className={cn(buttonVariants(), CTA_BASE)}>
                Explorar servicios
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
              Cinco áreas de trabajo, un mismo flujo digital
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
              Del escaneo a tu consultorio en cuatro pasos
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

      {/* Perks: split with image */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="lg:col-span-6">
            <div className={cn("relative aspect-[4/3] overflow-hidden ring-1 ring-border", RADIUS, TINTED_SHADOW)}>
              <Image
                src="/images/team-technician.jpg"
                alt="Técnica del laboratorio revisando un alineador con microscopio"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className="flex flex-col gap-8 lg:col-span-6">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
                Un técnico a cargo de cada caso
              </h2>
            </Reveal>
            <ul className="divide-y divide-border">
              {PERKS.map(({ icon: Icon, ...p }, i) => (
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

      {/* Testimonials: one dominant quote, one secondary (asymmetric, no card grid) */}
      <section className="bg-surface-raised/40 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1} className={i === 0 ? "lg:col-span-7" : "lg:col-span-5 lg:pt-16"}>
              <figure className="flex flex-col gap-5">
                <blockquote
                  className={cn(
                    "font-heading tracking-tight text-body",
                    i === 0 ? "text-2xl leading-snug lg:text-3xl" : "text-lg leading-snug text-body/80 lg:text-xl",
                  )}
                >
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="text-sm">
                  <span className="font-semibold text-body">{t.name}</span>
                  <span className="text-muted-foreground">, {t.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

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
            Revisa servicios, materiales y tiempos
          </h2>
          <p className="max-w-[60ch] text-body/80">
            Consulta el catálogo por área y descarga la lista de precios en PDF.
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
