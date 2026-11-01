"use client";
import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { WEB_URL } from "@/lib/site-url";
import type { ContenidoAdmin, ContenidoCampo } from "@/lib/contenido-api";
import { saveContenido } from "./actions";

export function ContenidoForm({ contenido }: { contenido: ContenidoAdmin }) {
  const [state, formAction, pending] = useActionState(saveContenido, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Los campos vacíos usan el texto que ya tiene el sitio.
      </p>

      {contenido.grupos.map((grupo) => (
        <section key={grupo.grupo} className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">{grupo.grupo}</h2>
          <div className="mt-4 flex flex-col gap-4">
            {grupo.campos.map((campo) => (
              <Campo key={campo.clave} campo={campo} imagenes={contenido.imagenes} />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <ActionButton type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </ActionButton>
        {state?.ok ? (
          <p role="status" className="text-sm text-muted-foreground">
            Contenido guardado.
          </p>
        ) : null}
        {state && !state.ok ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Campo({ campo, imagenes }: { campo: ContenidoCampo; imagenes: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {campo.tipo === "imagen" ? (
        <ImagenField campo={campo} imagenes={imagenes} />
      ) : (
        <>
          <Label htmlFor={campo.clave}>{campo.etiqueta}</Label>
          {campo.tipo === "parrafo" ? (
            <textarea
              id={campo.clave}
              name={campo.clave}
              rows={3}
              defaultValue={campo.valor ?? ""}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          ) : (
            <Input
              id={campo.clave}
              name={campo.clave}
              defaultValue={campo.valor ?? ""}
              className="h-10 rounded-xl"
            />
          )}
        </>
      )}
      {campo.ayuda ? <p className="text-xs text-muted-foreground">{campo.ayuda}</p> : null}
    </div>
  );
}

function ImagenField({ campo, imagenes }: { campo: ContenidoCampo; imagenes: string[] }) {
  const [valor, setValor] = useState(campo.valor ?? "");

  return (
    <>
      <Label htmlFor={campo.clave}>{campo.etiqueta}</Label>
      <select
        id={campo.clave}
        name={campo.clave}
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        className="h-10 w-full rounded-xl border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">Usa la imagen actual del sitio</option>
        {imagenes.map((imagen) => (
          <option key={imagen} value={imagen}>
            {imagen.slice(imagen.lastIndexOf("/") + 1)}
          </option>
        ))}
      </select>
      {/* Plain <img>: the files live in the public site, not in this app. */}
      {valor ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the public site, not this app
        <img
          src={`${WEB_URL}${valor}`}
          alt={campo.etiqueta}
          className="h-36 w-full max-w-sm rounded-lg border border-border object-cover"
        />
      ) : null}
    </>
  );
}
