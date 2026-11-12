"use client";

import { useState, useTransition } from "react";
import { Button } from "@repo/ui/components/button";
import { generarCodigoWhatsApp } from "./actions";

/**
 * Bloque de vinculación de WhatsApp (T8): genera un código de 6 dígitos que la
 * persona envía desde WhatsApp como "VINCULAR <código>". El código vence en 10
 * minutos y sirve una sola vez.
 */
export function WhatsappVinculacion() {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof generarCodigoWhatsApp>> | null>(null);

  const generar = () => {
    startTransition(async () => {
      setResultado(await generarCodigoWhatsApp());
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-2">Usar el bot de WhatsApp</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Genera un código y pídeselo a la persona que usará WhatsApp: debe enviar
        <span className="font-medium text-title"> VINCULAR </span>
        seguido del código desde ese número. El código vence en 10 minutos y solo sirve una vez.
      </p>
      <Button variant="outline" onClick={generar} disabled={pendiente}>
        {pendiente ? "Generando…" : "Generar código"}
      </Button>
      {resultado?.ok && (
        <p className="mt-3 text-2xl font-bold tracking-widest text-title">{resultado.codigo}</p>
      )}
      {resultado && !resultado.ok && (
        <p className="mt-3 text-sm text-destructive">{resultado.error}</p>
      )}
    </div>
  );
}
