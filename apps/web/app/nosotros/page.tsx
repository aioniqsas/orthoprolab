import Link from "next/link";
import type { Metadata } from "next";
import {
  AlarmClockCheckIcon,
  BrainIcon,
  BuildingIcon,
  CheckCircle2Icon,
  CloudCheckIcon,
  HandshakeIcon,
  HeadsetIcon,
  MicroscopeIcon,
  PrinterIcon,
  RulerIcon,
  ShieldCheckIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { Accent, SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Nosotros | Orthopro Lab",
  description:
    "Misión, visión y valores de OrthoPro Lab, laboratorio dental biomédico CAD/CAM.",
};

type Point = { title: string; text: string; icon: LucideIcon };

const MISSION_POINTS: Point[] = [
  { icon: CheckCircle2Icon, title: "Tolerancia cero a desajustes", text: "Calibración micrométrica mediante escáner óptico dual-axis en cada etapa." },
  { icon: CheckCircle2Icon, title: "Biocompatibilidad de grado médico Clase IIa", text: "Polímeros y resinas fotosensibles estériles con certificación biológica de citotoxicidad negativa." },
  { icon: CheckCircle2Icon, title: "Tiempos de entrega exactos", text: "Sincronización logística con la fecha de turno clínico de tu paciente. Cero cancelaciones de agenda." },
];

const VISION_POINTS: Point[] = [
  { icon: BrainIcon, title: "Innovación Continua con IA Dental", text: "Algoritmos de compensación de contracción de polímeros y segmentación automática de raíces óseas en CBCT." },
  { icon: HeadsetIcon, title: "Soporte clínico personalizado uno a uno", text: "Canal directo con el protesista técnico asignado a tu consultorio para ajustes de torque, stripping y retención." },
  { icon: CloudCheckIcon, title: "Ecosistema 100% libre de impresiones analógicas", text: "Flujo de trabajo totalmente ecológico, eliminando yesos y alginatos para una odontología sustentable." },
];

const VALUES = [
  { tag: "01 / ESTÁNDAR", title: "Precisión Micrométrica", text: "Ajuste anatómico pasivo que erradica micro-movimientos indeseados y previene la inflamación de los tejidos periodontales.", icon: RulerIcon },
  { tag: "02 / MÉTODO", title: "Rigor Científico", text: "Prótesis y aparatología validadas bajo estudios de resistencia a la fatiga flexural y biodegradabilidad pasiva en boca.", icon: MicroscopeIcon },
  { tag: "03 / LOGÍSTICA", title: "Puntualidad Quirúrgica", text: "Respeto sagrado por los turnos clínicos. Entregas programadas mediante mensajería propia con control de temperatura.", icon: AlarmClockCheckIcon },
  { tag: "04 / RELACIÓN", title: "Alianza Clínica", text: "No somos un proveedor transaccional: somos consultores técnicos que participan activamente en la planificación de tu tratamiento.", icon: HandshakeIcon },
];

const EQUIPMENT = [
  { icon: PrinterIcon, title: "Impresoras 3D Formlabs Form 4B", text: "Tecnología LFS para modelos de alineadores y guías quirúrgicas a 25 micrones.", qty: "8 Unidades" },
  { icon: WorkflowIcon, title: "Fresadoras 5 Ejes VHF K5+", text: "Fresado simultáneo en seco y húmedo de circonio traslúcido, PEEK y PMMA.", qty: "4 Unidades" },
  { icon: BuildingIcon, title: "Escáneres de Laboratorio 3Shape E4", text: "Escaneo dual de mordida completa en solo 9 segundos con 4 cámaras de 5MP.", qty: "6 Estaciones" },
];

const CERTS = [
  { name: "ISO 13485", text: "Dispositivos Médicos de Calidad" },
  { name: "ANMAT", text: "Habilitación Oficial Laboratorio" },
  { name: "CE Mark", text: "Biomateriales Europeos Clase IIa" },
  { name: "FDA 510(k)", text: "Resinas de Impresión Validadas" },
];

function PointList({ points }: { points: Point[] }) {
  return (
    <ul className="space-y-4">
      {points.map(({ icon: Icon, ...p }) => (
        <li key={p.title} className="flex gap-3">
          <Icon className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden />
          <div>
            <p className="font-medium text-body">{p.title}</p>
            <p className="text-sm text-muted-foreground">{p.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <>
      {/* Intro */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-10 size-96 rounded-full bg-title/20 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 -left-20 size-80 rounded-full bg-highlight/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12 lg:px-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider">
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-highlight">
                <span className="size-2 animate-pulse rounded-full bg-highlight" />
                Laboratorio Dental Biomédico • Est. 2012
              </span>
              <span className="text-muted-foreground">Buenos Aires • CAD/CAM Facility</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              Conoce a <Accent>OrthoPro Lab</Accent>: Pasión por la ingeniería dental y la bioseguridad.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Más de una década perfeccionando el nexo entre el diagnóstico
              odontológico digital y la manufactura protésica de ultra-precisión
              para ortodoncistas y cirujanos maxilofaciales.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="relative flex h-80 items-end overflow-hidden rounded-xl bg-card shadow-2xl">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(72,251,193,0.2),transparent_60%)]" />
              <div className="relative w-full bg-gradient-to-t from-background to-transparent p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-title">Sede Central • Cleanroom ISO-8</p>
                <p className="font-heading text-lg font-semibold">Instalaciones de Grado Quirúrgico</p>
              </div>
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3 lg:col-span-12">
            <div className="rounded-xl bg-card p-6">
              <dt className="font-mono text-sm text-title">Casos Clínicos Exitosos</dt>
              <dd className="mt-1 font-heading text-3xl font-bold">140k+</dd>
              <dd className="mt-1 text-sm text-muted-foreground">Alineadores invisibles, disyuntores Hyrax y férulas de descarga.</dd>
            </div>
            <div className="rounded-xl bg-card p-6">
              <dt className="font-mono text-sm text-highlight">Turnaround CAD Digital</dt>
              <dd className="mt-1 font-heading text-3xl font-bold">24h</dd>
              <dd className="mt-1 text-sm text-muted-foreground">Integración directa STL con escáneres intraorales de sillón.</dd>
            </div>
            <div className="flex gap-3 rounded-xl bg-card p-6">
              <ShieldCheckIcon className="size-6 shrink-0 text-highlight" aria-hidden />
              <div>
                <dt className="font-heading font-semibold">Aval ANMAT &amp; Protocolo ISO</dt>
                <dd className="mt-1 text-sm text-muted-foreground">Trazabilidad lote por lote de resinas bio y aleaciones de titanio.</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-black/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <SectionHeading
            eyebrow="Fundamentos Estratégicos"
            title={<>Arquitectura del <Accent>Propósito Clínico</Accent></>}
            description="Nuestra labor trasciende el laboratorio: somos el brazo técnico y científico que respalda cada diagnóstico y tratamiento reconstructivo."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card id="mision">
              <CardContent className="space-y-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-title">01 • Misión Fundacional</span>
                <h3 className="text-2xl font-semibold text-body">Nuestra <Accent>Misión</Accent></h3>
                <p className="text-muted-foreground">
                  Proporcionar a odontólogos, ortodoncistas y cirujanos maxilofaciales soluciones ortodónticas y protésicas de precisión milimétrica, combinando tecnología digital 3D y artesanía dental experta para garantizar resultados predecibles y la mayor comodidad para cada paciente.
                </p>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-body">Compromisos de Ejecución</h4>
                <PointList points={MISSION_POINTS} />
              </CardContent>
            </Card>
            <Card id="vision">
              <CardContent className="space-y-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-title">02 • Proyección 2030</span>
                <h3 className="text-2xl font-semibold text-body">Nuestra <Accent>Visión</Accent></h3>
                <p className="text-muted-foreground">
                  Consolidarnos para el 2030 como el laboratorio de referencia nacional e internacional en odontología digital integrada, liderando la adopción de inteligencia artificial aplicada al modelado dental, manufactura aditiva y sostenibilidad en bio-materiales.
                </p>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-body">Pilares de Vanguardia</h4>
                <PointList points={VISION_POINTS} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <SectionHeading
            eyebrow="ADN Profesional"
            title="Valores Fundamentales"
            description="Principios innegociables que sustentan cada etapa del diseño mecánico, sinterizado y pulido intra-laboratorio."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, ...v }) => (
              <Card key={v.title}>
                <CardContent className="space-y-3">
                  <Icon className="size-7 text-highlight" aria-hidden />
                  <span className="block font-mono text-xs text-title">{v.tag}</span>
                  <h3 className="text-lg font-semibold text-body">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="bg-black/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
          <SectionHeading
            eyebrow="Infraestructura Industrial"
            title={<>Tecnología CAD/CAM de <Accent>Última Generación</Accent></>}
            description="El hardware y software más potente del mundo odontológico, operado exclusivamente por técnicos dentales universitarios con certificación internacional en modelado biomecánico."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {EQUIPMENT.map(({ icon: Icon, ...e }) => (
              <Card key={e.title}>
                <CardContent className="space-y-3">
                  <Icon className="size-7 text-highlight" aria-hidden />
                  <h3 className="text-lg font-semibold text-body">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{e.text}</p>
                  <span className="inline-block rounded bg-title/30 px-2.5 py-1 font-mono text-xs">{e.qty}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-card p-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-title">Equipo Técnico Especializado</span>
              <h3 className="mt-2 text-xl font-semibold text-body">Especialistas en Ortodoncia Digital</h3>
              <p className="mt-2 text-sm text-muted-foreground">Cada modelo de movimiento dental es supervisado y validado biomecánicamente por técnicos ortotécnicos con posgrado.</p>
              <p className="mt-3 text-sm text-highlight">Matrículas Nacionales Colegiadas</p>
            </div>
            <div className="rounded-xl bg-card p-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-title">Manufactura Aditiva &amp; Sustractiva</span>
              <h3 className="mt-2 text-xl font-semibold text-body">Sinterizado Térmico Controlado</h3>
              <p className="mt-2 text-sm text-muted-foreground">Hornos de alta temperatura Ivoclar Programat para alcanzar la máxima resistencia mecánica de hasta 1200 MPa en circonio.</p>
              <p className="mt-3 text-sm text-highlight">Curvas Térmicas Computarizadas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-3 lg:px-12">
          <div className="space-y-4 lg:col-span-2">
            <ShieldCheckIcon className="size-8 text-highlight" aria-hidden />
            <span className="block text-xs font-semibold uppercase tracking-widest text-title">Marco Regulatorio &amp; Garantía</span>
            <h2 className="text-3xl font-semibold text-body">Certificaciones Sanitarias y Aval de Calidad Riguroso</h2>
            <p className="text-muted-foreground">
              Todos los dispositivos fabricados en OrthoPro Lab cuentan con el Certificado de Cumplimiento de Buenas Prácticas de Fabricación (BPF) otorgado por la ANMAT, garantizando que cada insumo introducido en la boca de tus pacientes cumple con los estándares toxicológicos y de citotoxicidad más exigentes de la medicina contemporánea.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {CERTS.map((c) => (
                <li key={c.name} className="rounded-lg bg-card p-4">
                  <span className="font-heading font-semibold text-highlight">{c.name}</span>
                  <span className="block text-sm text-muted-foreground">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 self-start rounded-xl bg-card p-6 ring-1 ring-border">
            <BadgeIcon />
            <h3 className="text-xl font-semibold text-body">Garantía de Adaptación 100%</h3>
            <p className="text-sm text-muted-foreground">
              Si un aparato ortodóncico o férula presenta cualquier divergencia clínica no atribuible a un cambio anatómico sobrevenido, lo re-confeccionamos sin costo adicional en 24 horas.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-12">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-10 text-center ring-1 ring-border">
            <span className="text-xs font-semibold uppercase tracking-widest text-title">Únete a nuestra red de especialistas</span>
            <h2 className="text-2xl font-semibold text-body lg:text-3xl">¿Listo para elevar la predictibilidad de tu clínica?</h2>
            <p className="text-muted-foreground">Envíanos tu primer archivo STL y recibe un informe de viabilidad biomecánica sin cargo.</p>
            <Link
              href="/catalogo"
              className={cn(buttonVariants(), "h-auto rounded-lg px-6 py-3.5 font-bold shadow-[0_0_20px_rgba(72,251,193,0.3)]")}
            >
              Explorar Catálogo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function BadgeIcon() {
  return <CheckCircle2Icon className="size-8 text-highlight" aria-hidden />;
}
