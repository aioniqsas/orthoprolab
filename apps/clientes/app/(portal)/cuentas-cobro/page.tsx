import { Suspense } from "react";
import type { Metadata } from "next";
import { listCuentasCobro } from "@/lib/data/repository";
import { CuentasTable } from "./cuentas-table";
import { CuentasLive } from "./cuentas-live";

export const metadata: Metadata = { title: "Cuentas de cobro" };

async function CuentasList({ searchParams }: { searchParams: Promise<{ q?: string }>; }) {
  const { q } = await searchParams;
  const cuentas = await listCuentasCobro(q);

  if (cuentas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay cuentas de cobro emitidas aún.</p>
    );
  }

  return <CuentasTable cuentas={cuentas} busquedaInicial={q ?? ""} />;
}

export default function CuentasCobroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <CuentasLive />
      <h1 className="text-2xl font-semibold">Cuentas de cobro</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <CuentasList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
