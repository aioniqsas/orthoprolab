import type { Metadata } from "next";
import Image from "next/image";
import { FileCheckIcon, LandmarkIcon, SendIcon, ShieldAlertIcon, WalletIcon, type LucideIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { AccountQr } from "@/components/account-qr";
import { CopyButton } from "@/components/copy-button";
import { Reveal } from "@/components/reveal";
import { BANK_ACCOUNTS } from "@/lib/payments";
import { BRAND_NAME, pageSocial } from "@/lib/site";

const PAYMENTS_TITLE = "Pagos y cuentas bancarias";
const PAYMENTS_DESCRIPTION =
  "Cuenta bancaria oficial de OrthoPro Lab para pagar por transferencia o consignación y confirmar tu pago.";

export const metadata: Metadata = {
  title: PAYMENTS_TITLE,
  description: PAYMENTS_DESCRIPTION,
  ...pageSocial(`${PAYMENTS_TITLE} | ${BRAND_NAME}`, PAYMENTS_DESCRIPTION, "/pagos"),
};

const RADIUS = "rounded-xl";
const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  { icon: WalletIcon, title: "Deposita el valor", text: "Transfiere o consigna en la cuenta de esta página." },
  { icon: FileCheckIcon, title: "Guarda el comprobante", text: "Un PDF o una captura donde se lean la fecha, el valor y la aprobación." },
  { icon: SendIcon, title: "Confirma el pago", text: "Indica el nombre del odontólogo y el caso al que corresponde el pago." },
];

export default function PaymentsPage() {
  return (
    <>
      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <Reveal className="flex flex-col gap-6 lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tighter text-body md:text-5xl">
              Paga por <span className="text-highlight">transferencia</span>
            </h1>
            <p className="max-w-[60ch] text-lg text-body/80">
              Recibimos pagos solo en la cuenta bancaria de esta página.
            </p>
            <div className="flex gap-3 border-l-2 border-highlight/60 pl-4">
              <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden />
              <p className="text-sm text-body/80">
                <strong className="font-semibold text-body">Aviso de seguridad:</strong> paga únicamente en la cuenta de esta página.
              </p>
            </div>
          </Reveal>

          {/* Official account lives in lib/payments.ts */}
          <ul className="flex flex-col gap-5 lg:col-span-7">
            {BANK_ACCOUNTS.map((account, i) => (
              <li key={account.id}>
                <Reveal delay={i * 0.08}>
                  <article
                    className={cn("bg-card p-6 ring-1 ring-border lg:p-8", RADIUS, TINTED_SHADOW)}
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <LandmarkIcon className="size-6 text-highlight" strokeWidth={1.5} aria-hidden />
                          <div>
                            <h2 className="font-heading text-xl font-semibold text-body">{account.bank}</h2>
                            <p className="text-sm text-muted-foreground">{account.accountType}</p>
                          </div>
                        </div>
                        <dl className="mt-6 space-y-5">
                          <div>
                            <dt className="text-sm text-muted-foreground">Número de cuenta</dt>
                            <dd className="mt-1 flex flex-wrap items-center gap-3">
                              <span className="font-mono text-2xl tracking-tight text-body">{account.accountNumber}</span>
                              <CopyButton value={account.accountNumber} label={`número de cuenta ${account.bank}`} />
                              <AccountQr account={account} className="md:hidden" />
                            </dd>
                          </div>
                          <div className={cn("grid gap-5", account.taxId && "sm:grid-cols-2")}>
                            <div>
                              <dt className="text-sm text-muted-foreground">Titular</dt>
                              <dd className="mt-1 text-body">{account.holder}</dd>
                            </div>
                            {account.taxId ? (
                              <div>
                                <dt className="text-sm text-muted-foreground">NIT</dt>
                                <dd className="mt-1 font-mono text-body">{account.taxId}</dd>
                              </div>
                            ) : null}
                          </div>
                        </dl>
                      </div>
                      {/* The card's right half is empty on wide screens; the QR fills it. Only on
                          phones (below md) does the icon next to the account number open it in a
                          dialog, because the card there is far too narrow for the code. */}
                      <figure className="hidden min-w-0 flex-col items-center gap-3 md:flex md:max-w-[220px] lg:max-w-[160px] xl:max-w-[220px]">
                        <Image
                          src="/images/qr-cuenta.webp"
                          alt={`Código QR de la ${account.accountType.toLowerCase()} de ${account.bank} de ${BRAND_NAME}`}
                          width={220}
                          height={229}
                          className="h-auto w-full rounded-lg bg-white"
                        />
                        <figcaption className="text-center text-xs text-muted-foreground">
                          Escanea el QR desde tu app bancaria.
                        </figcaption>
                      </figure>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-surface-raised/40 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl space-y-14 px-6 lg:px-12">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-body lg:text-4xl">
              Cómo pagar y confirmar en tres pasos
            </h2>
          </Reveal>
          <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ icon: Icon, ...s }, i) => (
              <li key={s.title}>
                <Reveal delay={i * 0.08} className="flex flex-col gap-4 border-t border-border pt-6 md:border-highlight/40">
                  <Icon className="size-6 text-highlight" strokeWidth={1.5} aria-hidden />
                  <h3 className="font-heading text-lg font-semibold text-body">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
