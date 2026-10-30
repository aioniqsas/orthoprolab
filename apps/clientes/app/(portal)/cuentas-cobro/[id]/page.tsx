import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCuentaCobro, listMetodosPagoBancarios } from "@/lib/data/repository";
import type { CuentaCobroDetalle, EstadoCuentaCobro, MetodoPagoBancario } from "@/lib/data/types";
import { ComprobanteForm } from "./comprobante-form";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const cuenta = await getCuentaCobro(id);
  return { title: cuenta?.numero ?? "Cuenta de cobro" };
}

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
  pagada_parcial:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600",
  anulada: "bg-destructive/10 text-destructive",
};

function formatCop(value: string): string {
  return `$${Number(value).toLocaleString("es-CO")}`;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-CO") : "—";
}

function EstadoBadge({ estado }: { estado: EstadoCuentaCobro }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}

function CuentaDetalle({
  cuenta,
}: {
  cuenta: CuentaCobroDetalle & { metodosBancarios: MetodoPagoBancario[] };
}) {
  const pagado = cuenta.pagos
    .filter((p) => !p.anulado)
    .reduce((sum, p) => sum + Number(p.monto), 0);
  const editable = cuenta.estado !== "anulada" && cuenta.estado !== "pagada";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/cuentas-cobro"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Cuentas de cobro
      </Link>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{cuenta.numero}</h1>
              <EstadoBadge estado={cuenta.estado} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Emitida</dt>
                <dd>{formatDate(cuenta.fechaEmision)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Vence</dt>
                <dd>{formatDate(cuenta.fechaVencimiento)}</dd>
              </div>
            </dl>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCop(cuenta.total)}
            </p>
            {pagado > 0 ? (
              <p className="text-xs text-muted-foreground">
                Pagado: {formatCop(String(pagado))}
              </p>
            ) : null}
          </div>
        </div>
        {cuenta.pdfUrl ? (
          <a
            href={cuenta.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver cuenta de cobro (PDF)
          </a>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Métodos bancarios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Transfiere o consigna a una de estas cuentas y luego sube el comprobante.
        </p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {cuenta.metodosBancarios.map((metodo) => (
            <li
              key={metodo.id}
              className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{metodo.banco}</p>
                <p className="text-xs text-muted-foreground">{metodo.tipoCuenta}</p>
                <p className="mt-3 font-mono text-lg">{metodo.numeroCuenta}</p>
                <p className="text-sm text-muted-foreground">{metodo.titular}</p>
              </div>
              {metodo.qrUrl ? (
                <Image
                  src={metodo.qrUrl}
                  alt={`Código QR de ${metodo.banco}`}
                  width={150}
                  height={150}
                  className="h-auto w-[150px] rounded-lg bg-white"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {editable ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Registrar pago</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Sube el comprobante de la transferencia o consignación. Los
            administradores recibirán el aviso por correo.
          </p>
          <ComprobanteForm
            cuentaId={cuenta.id}
            hoy={new Date().toISOString().slice(0, 10)}
          />
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Esta cuenta no admite nuevos pagos en su estado actual.
        </p>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Pagos registrados</h2>
        {cuenta.pagos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Todavía no hay pagos registrados.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {cuenta.pagos.map((pago) => (
              <li
                key={pago.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{formatCop(pago.monto)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(pago.fechaPago)}
                    {pago.referencia ? ` · Ref. ${pago.referencia}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {pago.comprobanteUrl ? (
                    <a
                      href={pago.comprobanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Comprobante
                    </a>
                  ) : null}
                  {pago.anulado ? (
                    <span className="text-xs text-destructive">Anulado</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function Detalle({ params }: { params: Params }) {
  const { id } = await params;
  const [cuenta, metodosBancarios] = await Promise.all([
    getCuentaCobro(id),
    listMetodosPagoBancarios(),
  ]);
  if (!cuenta) notFound();
  return <CuentaDetalle cuenta={{ ...cuenta, metodosBancarios }} />;
}

export default function CuentaCobroPage({ params }: { params: Params }) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}
      >
        <Detalle params={params} />
      </Suspense>
    </section>
  );
}
