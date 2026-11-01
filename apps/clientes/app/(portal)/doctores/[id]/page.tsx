import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { FullWidthStack, Section } from "@repo/ui/section";
import { getDoctor } from "@/lib/data/repository";
import { DoctorAcciones } from "./doctor-acciones";

export const metadata: Metadata = { title: "Doctor" };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function DoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();

  return (
    <FullWidthStack>
      <div className="flex flex-col gap-1">
        <Link
          href="/doctores"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden /> Mis doctores
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">
            {doctor.apellidos}, {doctor.nombres}
            {!doctor.activo ? (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground align-middle">
                Inactivo
              </span>
            ) : null}
          </h1>
        </div>
      </div>

      <Section className="flex flex-col gap-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Datos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombres" value={doctor.nombres} />
          <Field label="Apellidos" value={doctor.apellidos} />
          {doctor.correo ? <Field label="Correo" value={doctor.correo} /> : null}
        </div>
      </Section>

      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/doctores/${id}/editar`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Pencil className="size-4 mr-1" aria-hidden /> Editar
        </Link>
        {doctor.activo ? (
          <DoctorAcciones
            doctorId={id}
            nombre={`${doctor.nombres} ${doctor.apellidos}`}
          />
        ) : null}
      </div>
    </FullWidthStack>
  );
}
