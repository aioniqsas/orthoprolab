"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import { createServicio, updateServicio } from "./actions";
import type { Servicio } from "@/lib/data/types";

type Props = { mode: "create" } | { mode: "edit"; servicio: Servicio };

export function ServicioForm(props: Props) {
  const router = useRouter();

  const action =
    props.mode === "create"
      ? createServicio
      : updateServicio.bind(null, String(props.servicio.id));

  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok && state.data) {
      router.push(`/catalogo/${state.data.id}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre *
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          minLength={2}
          maxLength={120}
          defaultValue={props.mode === "edit" ? props.servicio.nombre : ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="descripcion" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          maxLength={2000}
          rows={4}
          defaultValue={
            props.mode === "edit" ? (props.servicio.descripcion ?? "") : ""
          }
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="precio" className="text-sm font-medium">
          Precio (COP) *
        </label>
        <input
          id="precio"
          name="precio"
          required
          pattern="^\d{1,10}(\.\d{1,2})?$"
          defaultValue={props.mode === "edit" ? props.servicio.precio : ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>
      {props.mode === "create" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="imagen" className="text-sm font-medium">
            Imagen
          </label>
          <input
            id="imagen"
            name="imagen"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <p className="text-xs text-muted-foreground">
            JPEG, PNG o WebP. Máximo 5 MB. Opcional: si falla la carga, el
            servicio no se crea.
          </p>
        </div>
      ) : null}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Guardando…"
            : props.mode === "create"
              ? "Crear servicio"
              : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
