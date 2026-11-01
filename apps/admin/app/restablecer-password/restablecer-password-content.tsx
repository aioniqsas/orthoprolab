"use client";
import { use, useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { forgotPassword, resetPassword } from "./actions";

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-highlight";

interface Props {
  searchParamsPromise: Promise<{ token?: string }>;
}

export function RestablecerPasswordContent({ searchParamsPromise }: Props) {
  const { token } = use(searchParamsPromise);

  if (token) {
    return <ResetForm token={token} />;
  }

  return <ForgotForm />;
}

function ForgotForm() {
  const [state, formAction, isPending] = useActionState(forgotPassword, null);

  if (state?.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 flex flex-col gap-4 text-center">
          <h1 className="text-xl font-semibold text-title">Revisa tu correo</h1>
          <p className="text-sm text-body">{state.message}</p>
          <Link
            href="/login"
            className="text-sm text-highlight hover:underline underline-offset-4"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-title">Restablecer contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="correo" className="text-sm font-medium text-body">
              Correo electrónico
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              required
              autoComplete="email"
              className={inputCls}
              placeholder="tu@correo.com"
            />
          </div>

          {state && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <ActionButton type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
            Enviar enlace
          </ActionButton>
        </form>

        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

function ResetForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-title">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Crea una nueva contraseña para tu cuenta.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />

          <div className="flex flex-col gap-1">
            <label htmlFor="nuevaPassword" className="text-sm font-medium text-body">
              Nueva contraseña
            </label>
            <input
              id="nuevaPassword"
              name="nuevaPassword"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground">Mínimo 12 caracteres.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirmarPassword" className="text-sm font-medium text-body">
              Confirmar contraseña
            </label>
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <ActionButton type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
            Guardar contraseña
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
