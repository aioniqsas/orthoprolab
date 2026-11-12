import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@repo/ui/components/button";
import { WhatsappVinculacion } from "./whatsapp-vinculacion";

export const metadata: Metadata = { title: "Inicio" };

const sections = [
  {
    href: "/doctores",
    title: "Mis doctores",
    description: "Registrá, editá y gestioná los doctores de tu clínica.",
  },
  {
    href: "/ordenes",
    title: "Órdenes",
    description: "Consultá el estado de tus pedidos de laboratorio.",
  },
  {
    href: "/cuentas-cobro",
    title: "Cuentas de cobro",
    description: "Revisá tus cuentas de cobro y el estado de pagos.",
  },
];

export default function PortalHomePage() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Bienvenido al portal</h1>
        <p className="text-sm text-muted-foreground">
          Desde acá podés gestionar tu clínica en OrthoPro Lab.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 hover:bg-muted/50 transition-colors"
          >
            <p className="font-semibold text-title">{s.title}</p>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>

      <WhatsappVinculacion />

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-2">Acciones rápidas</h2>
        <div className="flex gap-3 flex-wrap">
          <Link href="/doctores/nuevo" className={buttonVariants({ variant: "outline" })}>
            Nuevo doctor
          </Link>
          <Link href="/ordenes" className={buttonVariants({ variant: "outline" })}>
            Ver órdenes
          </Link>
        </div>
      </div>
    </section>
  );
}
