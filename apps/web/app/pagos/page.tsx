import type { Metadata } from "next";
import { LandmarkIcon, ReceiptIcon, ShieldAlertIcon } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/card";
import { Accent, SectionHeading } from "@/components/section-heading";
import { CopyButton } from "@/components/copy-button";
import { BANK_ACCOUNTS } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Pagos y Cuentas | Orthopro Lab",
  description:
    "Cuentas bancarias oficiales de OrthoPro Lab para realizar tus pagos por transferencia o consignación.",
};

const STEPS = [
  { title: "Efectuar la transferencia exacta", text: "Transfiere el valor estipulado en tu cotización u orden de trabajo." },
  { title: "Generar el comprobante", text: "Descarga el comprobante bancario en PDF o una captura nítida donde se lean la fecha, el número de aprobación y el valor." },
  { title: "Notificar el comprobante", text: "Envíalo indicando el nombre del odontólogo y el código del caso para emitir la factura y programar el despacho." },
];

export default function PaymentsPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
        <SectionHeading
          as="h1"
          eyebrow="Pagos y Cuentas"
          title={<>Cuentas Oficiales y <Accent>Métodos de Pago</Accent></>}
          description="Gestionamos los pedidos mediante transferencias a nuestras cuentas corporativas verificadas."
        />

        <Card>
          <CardContent className="flex gap-3">
            <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden />
            <p className="text-sm text-muted-foreground">
              <strong className="text-body">Aviso de seguridad:</strong> OrthoPro Lab únicamente recibe pagos en las cuentas bancarias oficiales indicadas en esta página. No solicitamos transferencias a cuentas de personas naturales ni a billeteras virtuales no autorizadas.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="font-heading text-2xl font-semibold text-body">Cuentas bancarias habilitadas</h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {BANK_ACCOUNTS.map((account) => (
              <li key={account.id}>
                <Card className="h-full">
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <LandmarkIcon className="size-6 text-highlight" aria-hidden />
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-body">{account.bank}</h3>
                        <p className="text-sm text-muted-foreground">{account.accountType}</p>
                      </div>
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-title">Número de cuenta</dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-3">
                          <span className="font-mono text-lg text-body">{account.accountNumber}</span>
                          <CopyButton value={account.accountNumber} label={`número de cuenta ${account.bank}`} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-title">Titular</dt>
                        <dd className="text-muted-foreground">{account.holder}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-title">NIT</dt>
                        <dd className="text-muted-foreground">{account.taxId}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <h2 className="flex items-center gap-3 font-heading text-2xl font-semibold text-body">
            <ReceiptIcon className="size-6 text-highlight" aria-hidden />
            Confirmación del pago
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl bg-card p-6">
                <span className="font-heading text-3xl font-bold text-highlight">{i + 1}</span>
                <p className="mt-2 font-medium text-body">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
