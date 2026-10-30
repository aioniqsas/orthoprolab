import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { listCuentasCobro } from "@/lib/data/repository";
import type { EstadoCuentaCobro } from "@/lib/data/types";

export const metadata: Metadata = { title: "Cuentas de cobro" };

const ESTADO_LABEL: Record<EstadoCuentaCobro, string> = {
  borrador: "Sin emitir",
  emitida: "Emitida",
  pagada: "Pagada",
  pagada_parcial: "Pago parcial",
  anulada: "Anulada",
};

const ESTADO_CLASS: Record<EstadoCuentaCobro, string> = {
  borrador: "bg-muted text-muted-foreground",
  emitida: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pagada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pagada_parcial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600",
  anulada: "bg-destructive/10 text-destructive",
};

async function CuentasList() {
  const cuentas = await listCuentasCobro();

  if (cuentas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay cuentas de cobro emitidas aún.</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
      {cuentas.map((c) => (
        <li key={c.id}>
          <Link
            href={`/cuentas-cobro/${c.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{c.numero}</p>
              <p className="text-xs text-muted-foreground">
                Emitida:{" "}
                {c.fechaEmision
                  ? new Date(c.fechaEmision).toLocaleDateString("es-CO")
                  : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                ${Number(c.total).toLocaleString("es-CO")}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[c.estado]}`}
              >
                {ESTADO_LABEL[c.estado]}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CuentasCobroPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Cuentas de cobro</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <CuentasList />
      </Suspense>
    </section>
  );
}
