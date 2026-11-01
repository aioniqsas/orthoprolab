import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FullWidthStack } from "@repo/ui/section";
import { NuevoDoctorForm } from "./nuevo-doctor-form";

export const metadata: Metadata = { title: "Nuevo doctor" };

export default function NuevoDoctorPage() {
  return (
    <FullWidthStack>
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
    </FullWidthStack>
  );
}
