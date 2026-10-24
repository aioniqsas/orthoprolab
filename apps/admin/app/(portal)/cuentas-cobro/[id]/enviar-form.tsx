"use client";
import { useState, useActionState, useTransition } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { generarPdf, enviarEmail } from "./actions";

interface Props {
  cuentaId: string;
  pdfUrl: string | null;
  doctorCorreo: string;
}

export function EnviarForm({ cuentaId, pdfUrl: initialPdfUrl, doctorCorreo }: Props) {
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState("");

  const boundEnviar = enviarEmail.bind(null, cuentaId);
  const [emailState, emailAction, emailPending] = useActionState(
    boundEnviar,
    null,
  );

  const [pdfPending, startPdfTransition] = useTransition();

  function handleGenerarPdf() {
    startPdfTransition(async () => {
      await generarPdf(cuentaId);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* PDF section */}
      <div className="flex flex-wrap items-center gap-3">
        {initialPdfUrl ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <FileText aria-hidden className="size-4" />
              PDF generado
            </span>
            <a
              href={initialPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver PDF <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Sin PDF generado</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pdfPending}
          onClick={handleGenerarPdf}
        >
          {pdfPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
          ) : null}
          {initialPdfUrl ? "Regenerar PDF" : "Generar PDF"}
        </Button>
      </div>

      {/* Email section */}
      <form action={emailAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label htmlFor="email" className="text-sm font-medium text-body">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={useCustomEmail ? customEmail : doctorCorreo}
                readOnly={!useCustomEmail}
                onChange={(e) => {
                  if (useCustomEmail) setCustomEmail(e.target.value);
                }}
                placeholder="otro@correo.com"
                className={`rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight${!useCustomEmail ? " opacity-60 cursor-not-allowed" : ""}`}
              />
            </div>
            <Button type="submit" variant="outline" disabled={emailPending}>
              {emailPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
              ) : null}
              Enviar por email
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useCustomEmail}
              onChange={(e) => {
                setUseCustomEmail(e.target.checked);
                if (!e.target.checked) setCustomEmail("");
              }}
              className="rounded border-border"
            />
            Enviar a otra dirección
          </label>
        </div>

        {emailState && !emailState.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {emailState.error}
          </p>
        ) : null}
        {emailState?.ok ? (
          <p
            role="status"
            className="text-sm text-green-600 dark:text-green-400"
          >
            Correo enviado correctamente.
          </p>
        ) : null}
      </form>
    </div>
  );
}
