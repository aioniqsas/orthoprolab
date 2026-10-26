import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NuevoDoctorForm } from "./nuevo-doctor-form";

export const metadata: Metadata = { title: "Nuevo doctor" };

export default function NuevoDoctorPage() {
  return (
    <section className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <Link
          href="/doctores"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden /> Mis doctores
        </Link>
        <h1 className="text-2xl font-semibold">Nuevo doctor</h1>
      </div>
      <NuevoDoctorForm />
    </section>
  );
}
