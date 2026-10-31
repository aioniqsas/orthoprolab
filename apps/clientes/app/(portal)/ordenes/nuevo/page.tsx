import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listDoctores } from "@/lib/data/repository";
import { NuevaOrdenForm } from "./nueva-orden-form";

export const metadata: Metadata = { title: "Nueva orden" };

export default async function NuevaOrdenPage() {
  const doctores = await listDoctores(false);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/ordenes"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden /> Órdenes
        </Link>
        <h1 className="text-2xl font-semibold">Nueva orden</h1>
      </div>
      <NuevaOrdenForm doctores={doctores} />
    </section>
  );
}
