import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BoxIcon,
  CheckCircle2Icon,
  CloudIcon,
  CpuIcon,
  FileTextIcon,
  FlaskConicalIcon,
  HeadsetIcon,
  LayersIcon,
  PencilRulerIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  StarIcon,
  TimerIcon,
  TruckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { Accent, SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Inicio | Orthopro Lab",
};

const STATS = [
  { value: "+12,000", title: "Casos Exitosos", text: "Planificados y entregados a clínicas." },
  { value: "99.4%", title: "Ajuste Clínico", text: "Tasa mínima de rebase o modificación." },
  { value: "48h", title: "Envíos Urgentes", text: "Protocolo express en CABA y GBA." },
  { value: "+350", title: "Clínicas Aliadas", text: "Especialistas activos en red." },
];

const SERVICES: {
  code: string;
  area: string;
  name: string;
  text: string;
  material: string;
  turnaround: string;
  icon: LucideIcon;
}[] = [
  {
    code: "MOD-01",
    area: "Ortodoncia Interceptiva",
    name: "Ortodoncia Fija & Disyuntores",
    text: "Disyuntores Hyrax, Hass, McNamara sinterizados por láser o con bandas electro-soldadas de máxima pasividad.",
    material: "Acero Quirúrgico 316L / Ti6Al4V",
    turnaround: "Turnaround: 3-4 días hábiles",
    icon: WrenchIcon,
  },
  {
    code: "MOD-02",
    area: "Termoformado Robótico",
    name: "Alineadores Invisibles CAD/CAM",
    text: "Placas alineadoras secuenciales recortadas por fresado perimetral computarizado sin bordes filosos.",
    material: "Poliuretano Termoplástico Tri-Capa",
    turnaround: "Turnaround: 48-72 hrs",
    icon: LayersIcon,
  },
  {
    code: "MOD-03",
    area: "Retención & Funcional",
    name: "Placas Removibles & Retenedores",
    text: "Placas Hawley, Bionator, pistas planas y placas de mordida con polimerización en olla de presión hidroneumática.",
    material: "Acrílico Libre de Monómero Residual",
    turnaround: "Turnaround: 3 días hábiles",
    icon: ShieldCheckIcon,
  },
  {
    code: "MOD-04",
    area: "Implantología & CAD",
    name: "Prótesis & Cirugía Guiada",
    text: "Férulas quirúrgicas con casquillos metálicos y estructuras completas fresadas en Zirconia multicapa de alta traslucidez.",
    material: "Zirconia Katana HT / Resina Médica II",
    turnaround: "Turnaround: 4-5 días hábiles",
    icon: BoxIcon,
  },
];

const STEPS: { phase: string; title: string; text: string; icon: LucideIcon }[] = [
  {
    phase: "FASE 01",
    title: "Escaneo o Impresión",
    text: "Recepción directa de archivos STL/PLY desde cualquier escáner (iTero, Trios, Medit) o retiro motorizado de modelos físicos.",
    icon: ScanLineIcon,
  },
  {
    phase: "FASE 02",
    title: "Planificación 3D",
    text: "Diseño asistido por computadora por especialistas en ortodoncia. Enlace web interactivo para validación del especialista.",
    icon: PencilRulerIcon,
  },
  {
    phase: "FASE 03",
    title: "Fabricación Robotizada",
    text: "Impresión 3D de alta definición (50 micrones) y fresado CNC en atmósfera de temperatura controlada.",
    icon: CpuIcon,
  },
  {
    phase: "FASE 04",
    title: "Entrega & Trazabilidad",
    text: "Empaque estéril individualizado con código QR de trazabilidad de lote de materiales y entrega segura en consultorio.",
    icon: TruckIcon,
  },
];

const PERKS: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Interacción Directa", text: "Chat en vivo con el técnico dental a cargo de tu caso.", icon: HeadsetIcon },
  { title: "Respaldo Digital Cloud", text: "Guardado seguro de archivos STL por 5 años sin costo.", icon: CloudIcon },
  { title: "Garantía de Reposición", text: "Re-impresión inmediata ante desajuste biomecánico.", icon: BadgeCheckIcon },
];

const TESTIMONIALS = [
  {
    quote:
      "El ajuste pasivo de los disyuntores soldados por láser es impecable. Reduje a la mitad las citas de reacomodamiento en niños y pacientes con maxilares atrésicos.",
    initials: "DR",
    name: "Dr. Roberto Santoro",
    role: "Especialista en Ortodoncia & Ortopedia Maxilar (UBA)",
  },
  {
    quote:
      "La integración directa mediante envío de archivos STL desde nuestro escáner Trios simplificó toda la logística de alineadores. Cumplen religiosamente con las 48h de entrega.",
    initials: "ML",
    name: "Dra. Mariana López Rossi",
    role: "Directora Clínica Dental Design & Aligners",
  },
];

const glowButton =
  "h-auto gap-2 rounded-lg px-6 py-3.5 font-bold shadow-[0_0_20px_rgba(72,251,193,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(72,251,193,0.5)]";

export default function Home() {
  return (
    <>
      {/* Hero + stats */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-10 size-96 rounded-full bg-title/20 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -left-20 size-80 rounded-full bg-highlight/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-card px-4 py-1.5">
                <span className="size-2 animate-pulse rounded-full bg-highlight" />
                <span className="text-xs font-semibold uppercase tracking-wider text-highlight">
                  Tecnología CAD/CAM &amp; Ortodoncia Digital
                </span>
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
                Precisión que transforma <Accent>sonrisas</Accent> y optimiza tu{" "}
                <Accent>clínica</Accent>.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Laboratorio especializado en aparatología ortodóntica fija,
                removible, alineadores invisibles y prótesis de vanguardia para
                odontólogos y especialistas de alta exigencia biomecánica.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link href="#servicios" className={cn(buttonVariants(), glowButton)}>
                  Explorar Servicios
                  <ArrowRightIcon className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/catalogo"
                  className={cn(buttonVariants({ variant: "secondary" }), "h-auto gap-2 rounded-lg bg-card px-6 py-3.5 text-body hover:bg-card/70")}
                >
                  <FileTextIcon className="size-4" aria-hidden />
                  Ver Catálogo de Servicios
                </Link>
              </div>
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-highlight" aria-hidden />
                  Certificación ANMAT
                </li>
                <li className="flex items-center gap-2">
                  <FlaskConicalIcon className="size-4 text-highlight" aria-hidden />
                  Resinas Clase IIa Médicas
                </li>
              </ul>
            </div>

            {/* CAD showcase (CSS stand-in for the Stitch render) */}
            <div className="relative lg:col-span-5">
              <div className="relative flex h-[400px] items-center justify-center overflow-hidden rounded-xl bg-card shadow-2xl">
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(72,251,193,0.22),transparent_60%)]" />
                <BoxIcon aria-hidden className="relative size-32 text-highlight/70" strokeWidth={1} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-lg bg-card/95 p-4 shadow-xl backdrop-blur-md">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-title">
                      Dispositivo En Render 3D
                    </p>
                    <p className="font-heading text-lg font-semibold">Hyrax CAD/CAM Titanio</p>
                  </div>
                  <span className="rounded bg-title/30 px-2.5 py-1 font-mono text-xs">Tol: ±0.02mm</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 hidden items-center gap-3 rounded-lg bg-card p-4 shadow-xl ring-1 ring-border sm:flex">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ShieldCheckIcon className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Calibración Activa</p>
                  <p className="text-sm font-bold text-highlight">100% Sin distorsión</p>
                </div>
              </div>
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
            {STATS.map((s, i) => (
              <div key={s.title} className="flex flex-col rounded-xl bg-card p-6">
                <dt className="sr-only">{s.title}</dt>
                <span className={cn("font-mono text-sm", i % 2 ? "text-highlight" : "text-title")}>{s.value}</span>
                <dd className="mt-1">
                  <span className="block font-heading text-2xl font-bold tracking-tight">{s.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{s.text}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="bg-black/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Especialidades de Manufactura"
              title={<>Soluciones de ingeniería <Accent>biomecánica</Accent></>}
            />
            <p className="max-w-md text-muted-foreground">
              Cada dispositivo se modela paramétricamente en software CAD 3D de
              grado quirúrgico bajo directrices del ortodoncista tratante.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ icon: Icon, ...s }) => (
              <Card key={s.code} className="transition-transform duration-300 hover:scale-[1.02]">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex h-44 items-center justify-center rounded-lg bg-[radial-gradient(circle_at_50%_40%,rgba(72,251,193,0.15),transparent_65%)] bg-background">
                    <Icon aria-hidden className="size-14 text-highlight/80" strokeWidth={1.25} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-title">{s.area}</span>
                    <span className="font-mono text-xs text-highlight">{s.code}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-body">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                  <ul className="mt-auto space-y-2 font-mono text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2Icon className="size-4 shrink-0 text-highlight" aria-hidden />
                      {s.material}
                    </li>
                    <li className="flex items-center gap-2">
                      <TimerIcon className="size-4 shrink-0 text-highlight" aria-hidden />
                      {s.turnaround}
                    </li>
                  </ul>
                  <Link
                    href="/catalogo"
                    className={cn(buttonVariants({ variant: "secondary" }), "h-auto w-full rounded-lg bg-muted-foreground/10 py-2.5 text-body hover:bg-primary hover:text-primary-foreground")}
                  >
                    Ver Catálogo del Área
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-14 px-6 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <SectionHeading
              eyebrow="Protocolo Estandarizado"
              title="Por Qué Trabajar Con Nosotros"
              description="Un flujo de trabajo digital unificado que elimina los márgenes de error analógicos y acelera los tiempos en el sillón dental."
            />
          </div>
          <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, ...s }) => (
              <li key={s.phase} className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-card text-highlight shadow-[0_0_20px_rgba(72,251,193,0.15)] ring-1 ring-border">
                  <Icon className="size-7" aria-hidden />
                </div>
                <span className="font-mono text-xs text-highlight">{s.phase}</span>
                <h3 className="text-lg font-semibold text-body">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
          <ul className="grid gap-4 md:grid-cols-3">
            {PERKS.map(({ icon: Icon, ...p }) => (
              <li key={p.title} className="flex items-start gap-4 rounded-xl bg-card p-5">
                <Icon className="size-6 shrink-0 text-highlight" aria-hidden />
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted-foreground">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-black/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <SectionHeading
            eyebrow="Aval Clínico"
            title={<>Opiniones de <Accent>Especialistas</Accent></>}
            description="Ortodoncistas y cirujanos maxilofaciales que confían su flujo de trabajo en OrthoPro Lab."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name}>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex gap-1 text-highlight" role="img" aria-label="5 de 5 estrellas">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon key={i} className="size-4 fill-current" aria-hidden />
                    ))}
                  </div>
                  <blockquote className="text-muted-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-title/30 text-sm font-bold">
                      {t.initials}
                    </span>
                    <div>
                      <p className="font-heading font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-12">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-10 text-center shadow-[0_0_40px_rgba(72,251,193,0.08)] ring-1 ring-border">
            <FileTextIcon className="size-10 text-highlight" aria-hidden />
            <h2 className="text-2xl font-semibold text-body lg:text-3xl">
              Lista Completa de Precios &amp; Tiempos 2024
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Descargá el nomenclador técnico oficial para clínicas y
              consultorios odontológicos en PDF.
            </p>
            <Link href="/catalogo" className={cn(buttonVariants(), glowButton)}>
              Ver Catálogo
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
