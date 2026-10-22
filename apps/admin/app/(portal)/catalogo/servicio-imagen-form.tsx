"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import { uploadImagenServicio } from "./actions";

export function ServicioImagenForm({ id }: { id: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    uploadImagenServicio.bind(null, id),
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="imagen" className="text-sm font-medium">
          Imagen del servicio
        </label>
        <input
          id="imagen"
          name="imagen"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">JPEG, PNG o WebP. Máximo 5 MB.</p>
      </div>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-muted-foreground">
          Imagen actualizada.
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Subiendo…" : "Subir imagen"}
      </Button>
    </form>
  );
}
