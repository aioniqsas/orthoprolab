import { Fragment, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { formatDate, formatCop } from "@/lib/data/helpers";
import { getCuentaCobro, getOrdenesDisponibles } from "@/lib/data/repository";
import { ListSkeleton } from "../../../_components/list-skeleton";
import { PageHeader } from "../../../_components/page-header";
import { AdjuntarOrdenesForm } from "./adjuntar-ordenes-form";
import { RegistrarPagoForm } from "./registrar-pago-form";
import { EnviarForm } from "./enviar-form";
import { anularPago } from "./actions";
import type { CuentaCobro, EstadoCuentaCobro, PagoItem } from "@/lib/data/types";

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

const ESTADO_LABELS: Record<EstadoCuentaCobro, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada_parcial: "Pago parcial",
  pagada: "Pagada",
  anulada: "Anulada",
};

const ESTADO_CLASS: Record<EstadoCuentaCobro, string> = {
  borrador:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground",
  emitida:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pagada_parcial:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  pagada:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  anulada:
    "inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function EstadoBadge({ estado }: { estado: EstadoCuentaCobro }) {
  return <span className={ESTADO_CLASS[estado]}>{ESTADO_LABELS[estado]}</span>;
}

const EDITABLE_ESTADOS: EstadoCuentaCobro[] = [
  "borrador",
  "emitida",
  "pagada_parcial",
];

function isEditable(estado: EstadoCuentaCobro): boolean {
  return EDITABLE_ESTADOS.includes(estado);
}

function AnularPagoButton({
  cuentaId,
  pago,
}: {
  cuentaId: string;
  pago: PagoItem;
}) {
  const action = anularPago.bind(null, cuentaId, pago.id);
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pago.anulado}
        className="text-xs text-destructive underline-offset-4 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pago.anulado ? "Anulado" : "Anular"}
      </button>
    </form>
  );
}

async function CuentaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cuenta, ordenesDisponibles] = await Promise.all([
    getCuentaCobro(id),
    getOrdenesDisponibles(id),
  ]);

  if (!cuenta) notFound();

  const editable = isEditable(cuenta.estado);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={cuenta.numero} />

      {/* Header card */}
      <section
        aria-labelledby="cuenta-header"
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 id="cuenta-header" className="font-heading text-lg font-semibold">
                {cuenta.numero}
              </h2>
              <EstadoBadge estado={cuenta.estado} />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Doctor", cuenta.doctorNombre],
                ["Correo", cuenta.doctorCorreo],
                ["Fecha de emisión", formatDate(cuenta.fechaEmision)],
                ["Fecha de vencimiento", formatDate(cuenta.fechaVencimiento)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {formatCop(cuenta.total)}
            </p>
          </div>
        </div>

        {cuenta.pdfUrl ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <FileText aria-hidden className="size-4" />
              PDF generado
            </span>
            <a
              href={cuenta.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver PDF <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </div>
        ) : null}

        {cuenta.observaciones ? (
          <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-3">
            {cuenta.observaciones}
          </p>
        ) : null}
      </section>

      {/* Órdenes adjuntas */}
      <section
        aria-labelledby="ordenes-adjuntas"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2
          id="ordenes-adjuntas"
          className="font-heading text-lg font-semibold mb-4"
        >
          Órdenes adjuntas
        </h2>
        {cuenta.ordenes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay órdenes adjuntas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Orden
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Paciente / Servicios
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuenta.ordenes.map((item) => (
                  <Fragment key={item.ordenId}>
                    <tr
                      className="border-t border-border first:border-t-0"
                    >
                      <td className="py-2 pr-4 align-top">
                        <Link
                          href={`/ordenes/${item.ordenId}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          #{item.ordenId}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{item.orden.paciente.nombre}</p>
                        {item.orden.detalles.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.orden.detalles.map((d) => (
                              <li
                                key={d.id}
                                className="text-xs text-muted-foreground"
                              >
                                {d.servicio} × {d.cantidad}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums align-top">
                        {formatCop(item.valorSnapshot)}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Agregar órdenes */}
      {editable ? (
        <section
          aria-labelledby="agregar-ordenes"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="agregar-ordenes"
            className="font-heading text-lg font-semibold mb-4"
          >
            Agregar órdenes
          </h2>
          <AdjuntarOrdenesForm
            cuentaId={cuenta.id}
            ordenes={ordenesDisponibles}
          />
        </section>
      ) : null}

      {/* Pagos */}
      <section
        aria-labelledby="pagos"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2 id="pagos" className="font-heading text-lg font-semibold mb-4">
          Pagos
        </h2>
        {cuenta.pagos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Fecha
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Método
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">
                    Referencia
                  </th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">
                    Monto
                  </th>
                  <th className="pb-2 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {cuenta.pagos.map((pago) => (
                  <tr
                    key={pago.id}
                    className={`border-b border-border last:border-0 ${pago.anulado ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 pr-4">{formatDate(pago.fechaPago)}</td>
                    <td className="py-2 pr-4 capitalize">{pago.metodo}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {pago.referencia ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatCop(pago.monto)}
                    </td>
                    <td className="py-2">
                      <AnularPagoButton cuentaId={cuenta.id} pago={pago} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Registrar pago */}
      {editable ? (
        <section
          aria-labelledby="registrar-pago"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="registrar-pago"
            className="font-heading text-lg font-semibold mb-4"
          >
            Registrar pago
          </h2>
          <RegistrarPagoForm cuentaId={cuenta.id} />
        </section>
      ) : null}

      {/* Enviar por email */}
      <section
        aria-labelledby="enviar-email"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2
          id="enviar-email"
          className="font-heading text-lg font-semibold mb-4"
        >
          Enviar por email
        </h2>
        <EnviarForm cuentaId={cuenta.id} pdfUrl={cuenta.pdfUrl} doctorCorreo={cuenta.doctorCorreo} />
      </section>
    </div>
  );
}

export default function CuentaCobroDetailPage({
  params,
}: {
  params: Params;
}) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/cuentas-cobro"
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver a cuentas de cobro
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <CuentaDetail params={params} />
      </Suspense>
    </section>
  );
}
