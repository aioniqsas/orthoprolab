"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { createServicio, updateServicio } from "./actions";
import type { Servicio } from "@/lib/data/types";
import { ActivoBadge } from "../../_components/status-badges";

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

  const servicio = props.mode === "edit" ? props.servicio : null;

  return (
    <form
      action={formAction}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-sm text-destructive lg:col-span-2">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Datos del servicio</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nombre" className="text-sm font-medium">
                Nombre *
              </label>
              <Input
                id="nombre"
                name="nombre"
                required
                minLength={2}
                maxLength={120}
                defaultValue={servicio?.nombre ?? ""}
                className="h-10 rounded-xl"
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
                defaultValue={servicio?.descripcion ?? ""}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Arancel</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="precio" className="text-xs text-muted-foreground">
                Precio (COP) *
              </label>
              <Input
                id="precio"
                name="precio"
                required
                pattern="^\d{1,10}(\.\d{1,2})?$"
                defaultValue={servicio?.precio ?? ""}
                className="mt-1 h-12 rounded-xl text-2xl font-semibold tabular-nums md:text-2xl"
              />
            </div>
            {servicio ? (
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <div className="mt-1">
                  <ActivoBadge activo={servicio.activo} />
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Imagen</h2>
        {servicio?.imagenUrl ? (
          <Image
            src={servicio.imagenUrl}
            alt={servicio.nombre}
            width={320}
            height={320}
            className="h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImageIcon aria-hidden className="size-6" />
            <span className="sr-only">Sin imagen</span>
          </div>
        )}
        {servicio ? (
          <Link
            href={`/catalogo/${servicio.id}`}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Cambiar la imagen desde la ficha del servicio
          </Link>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="imagen" className="text-sm font-medium">
                Imagen del servicio
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
          </>
        )}
      </section>

      <div className="flex gap-3 lg:col-span-2">
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
