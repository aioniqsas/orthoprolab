import type { Metadata } from "next";
import Image from "next/image";
import { LandmarkIcon, ShieldAlertIcon } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { Reveal } from "@/components/reveal";
import { fetchContenido, texto } from "@/lib/content";
import { CTA_BASE, RADIUS, SECTION_BAND, TINTED_SHADOW } from "@/lib/ui";
import { BANK_ACCOUNTS } from "@/lib/payments";
import { BRAND_NAME, pageSocial, whatsappUrl } from "@/lib/site";

const PAYMENTS_TITLE = "Pagos por transferencia en Medellín";
const PAYMENTS_DESCRIPTION =
  "Cuenta bancaria oficial de OrthoPro Lab en Medellín para pagar por transferencia o consignación y confirmar tu pago.";

export const metadata: Metadata = {
  title: PAYMENTS_TITLE,
  description: PAYMENTS_DESCRIPTION,
  ...pageSocial(`${PAYMENTS_TITLE} | ${BRAND_NAME}`, PAYMENTS_DESCRIPTION, "/pagos"),
};

// The page body awaits the cached content before rendering anything, so the
// navigation cannot produce an instant shell without that data.
export const instant = false;

export default async function PaymentsPage() {
  const contenido = await fetchContenido();
  const t = (clave: string, porDefecto: string) => texto(contenido, clave, porDefecto);

  // There is no lead form: the CTA opens WhatsApp with the receipt message.
  const whatsappHref = whatsappUrl(
    t("pagos.whatsapp.mensaje", "Hola, ya realicé el pago y envío el comprobante."),
  );

  const steps = [
    {
      title: t("pagos.pasos.paso1.titulo", "Deposita el valor"),
      text: t("pagos.pasos.paso1.texto", "Transfiere o consigna en la cuenta de esta página."),
    },
    {
      title: t("pagos.pasos.paso2.titulo", "Guarda el comprobante"),
      text: t(
        "pagos.pasos.paso2.texto",
        "Un PDF o una captura donde se lean la fecha, el valor y la aprobación.",
      ),
    },
    {
      title: t("pagos.pasos.paso3.titulo", "Confirma el pago"),
      text: t(
        "pagos.pasos.paso3.texto",
        "Indica el nombre del odontólogo y el caso al que corresponde el pago.",
      ),
    },
  ];

  return (
    <>
      <section
        aria-labelledby="h1"
        className="mx-auto flex max-w-7xl flex-wrap items-start gap-12 px-6 pt-16 pb-24 lg:gap-14 lg:px-12 lg:pt-18"
      >
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-6">
          <h1
            id="h1"
            className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.04] font-bold tracking-[-0.04em] text-balance text-body"
          >
            {t("pagos.hero.titulo", "Paga por")}{" "}
            <span className="text-highlight">{t("pagos.hero.titulo_destacado", "transferencia")}</span>
          </h1>
          <p className="max-w-[44ch] text-[19px] text-surface-alt">
            {t("pagos.hero.intro", "Recibimos pagos solo en la cuenta bancaria de esta página.")}
          </p>
          <aside
            aria-labelledby="aviso"
            className="flex items-start gap-3.5 rounded-2xl border border-destructive/45 bg-destructive/10 p-4.5"
          >
            <ShieldAlertIcon
              className="mt-0.5 size-6 shrink-0 text-destructive"
              strokeWidth={1.8}
              aria-hidden
            />
            <p className="text-[15px] text-body">
              <strong id="aviso" className="font-semibold text-destructive">
                {t("pagos.hero.aviso_titulo", "Aviso de seguridad:")}
              </strong>{" "}
              {t("pagos.hero.aviso_texto", "paga únicamente en la cuenta de esta página.")}
            </p>
          </aside>
        </div>

        {/* Official account lives in lib/payments.ts */}
        <ul className="flex min-w-0 flex-[1.6_1_520px] flex-col gap-5">
          {BANK_ACCOUNTS.map((account, i) => (
            <li key={account.id}>
              <Reveal delay={i * 0.08}>
                <article
                  aria-labelledby={`cuenta-${account.id}`}
                  className={cn("overflow-hidden border border-border bg-card", TINTED_SHADOW, RADIUS)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-border bg-body/5 px-8 py-6">
                    <div className="flex items-center gap-3.5">
                      <LandmarkIcon
                        className="size-7 shrink-0 text-highlight"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <div>
                        <h2
                          id={`cuenta-${account.id}`}
                          className="font-heading text-2xl leading-tight font-semibold text-body"
                        >
                          {t("pagos.cuenta.banco", account.bank)}
                        </h2>
                        <p className="text-sm text-surface-alt">
                          {t("pagos.cuenta.tipo", account.accountType)}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-highlight/50 px-3 py-1 text-xs font-semibold tracking-[0.06em] text-highlight uppercase">
                      {t("pagos.cuenta.badge", "Cuenta oficial")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-8 p-8">
                    <dl className="flex min-w-0 flex-[1_1_280px] flex-col gap-6.5">
                      <div>
                        <dt className="text-sm text-surface-alt">
                          {t("pagos.cuenta.label_numero", "Número de cuenta")}
                        </dt>
                        <dd className="mt-1.5 flex flex-wrap items-center gap-3.5">
                          <span className="font-mono text-[clamp(1.625rem,3vw,2.125rem)] tracking-[0.04em] tabular-nums text-body">
                            {t("pagos.cuenta.numero", account.accountNumber)}
                          </span>
                          <CopyButton
                            value={account.accountNumber}
                            label={`número de cuenta ${account.bank}`}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-surface-alt">
                          {t("pagos.cuenta.label_titular", "Titular")}
                        </dt>
                        <dd className="mt-1.5 text-[19px] font-medium text-body">
                          {t("pagos.cuenta.titular", account.holder)}
                        </dd>
                      </div>
                      {/* Optional: hidden until the lab provides the tax id. */}
                      {account.taxId ? (
                        <div>
                          <dt className="text-sm text-surface-alt">
                            {t("pagos.cuenta.label_nit", "NIT")}
                          </dt>
                          <dd className="mt-1.5 font-mono text-body">{account.taxId}</dd>
                        </div>
                      ) : null}
                    </dl>

                    <figure className="flex flex-none flex-col items-center gap-3">
                      <Image
                        src={t("pagos.qr.imagen", "/images/qr-cuenta.webp")}
                        alt={`Código QR de la ${account.accountType.toLowerCase()} de ${account.bank} de ${BRAND_NAME}`}
                        width={200}
                        height={208}
                        className="h-auto w-full max-w-[200px] rounded-2xl bg-white p-3"
                      />
                      <figcaption className="max-w-[200px] text-center text-sm text-surface-alt">
                        {t("pagos.qr.texto", "Escanea el QR desde tu app bancaria.")}
                      </figcaption>
                    </figure>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="pasos"
        className={cn("border-y border-border bg-surface-raised", SECTION_BAND)}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-12 px-6 lg:gap-14 lg:px-12">
          <h2
            id="pasos"
            className="min-w-0 flex-[1_1_320px] self-start font-heading text-[clamp(1.875rem,3.4vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-balance text-body"
          >
            {t("pagos.pasos.titulo", "Cómo pagar y confirmar en tres pasos")}
          </h2>
          <ol className="flex min-w-0 flex-[1.6_1_520px] list-none flex-col">
            {steps.map((step, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={step.title} className={cn("flex gap-5.5", !last && "pb-9")}>
                  <div className="flex flex-none flex-col items-center">
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full border-[1.5px] border-highlight font-heading text-[19px] font-semibold",
                        last ? "bg-highlight text-surface" : "text-highlight",
                      )}
                    >
                      {i + 1}
                    </span>
                    {!last && <span aria-hidden className="mt-2 w-px flex-1 bg-border" />}
                  </div>
                  <Reveal delay={i * 0.08} className="flex min-w-0 flex-col gap-2.5 pt-1.5">
                    <div>
                      <h3 className="mb-1.5 font-heading text-[22px] font-semibold text-body">
                        {step.title}
                      </h3>
                      <p className="text-surface-alt">{step.text}</p>
                    </div>
                    {last && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants(),
                          CTA_BASE,
                          "self-start text-center whitespace-normal",
                        )}
                      >
                        {t("pagos.pasos.boton", "Enviar comprobante por WhatsApp")}
                      </a>
                    )}
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
