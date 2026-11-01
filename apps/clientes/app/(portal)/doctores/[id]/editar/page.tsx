import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FullWidthStack } from "@repo/ui/section";
import { getDoctor } from "@/lib/data/repository";
import { EditarDoctorForm } from "./editar-doctor-form";

export const metadata: Metadata = { title: "Editar doctor" };

export default async function EditarDoctorPage({
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
          href={`/doctores/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden /> {doctor.apellidos}, {doctor.nombres}
        </Link>
        <h1 className="text-2xl font-semibold">Editar doctor</h1>
      </div>
      <EditarDoctorForm doctor={doctor} />
    </FullWidthStack>
  );
}
