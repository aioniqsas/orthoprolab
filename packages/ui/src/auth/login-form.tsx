"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { loginSchema } from "@repo/api-client/schemas"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { Button } from "@repo/ui/components/button"
import { FormField } from "@repo/ui/auth/form-field"
import { PasswordField } from "@repo/ui/auth/password-field"
import type { AuthResult } from "@repo/ui/lib/auth-types"
import {
  issuesToFieldErrors,
  useFormValues,
} from "@repo/ui/lib/form"

export interface LoginValues {
  correo: string
  password: string
}

export interface LoginFormProps {
  title?: string
  description?: string
  /** Performs the login. Supplied by the app; this component never calls the API. */
  onSubmit: (values: LoginValues) => Promise<AuthResult>
  onSuccess?: () => void
  /** Slot next to the password label, e.g. a "forgot password" link. */
  linkSlot?: React.ReactNode
  submitLabel?: string
}

const MESSAGES = {
  credentials: "Correo o contraseña incorrectos.",
  validation: "Revisa los datos ingresados.",
  unavailable:
    "No pudimos iniciar sesión en este momento. Inténtalo de nuevo más tarde.",
  network: "No pudimos conectar con el servidor. Revisa tu conexión.",
} as const

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

export function LoginForm({
  title = "Iniciar sesión",
  description,
  onSubmit,
  onSuccess,
  linkSlot,
  submitLabel = "Ingresar",
}: LoginFormProps) {
  const { values, setValue, errors, setErrors } = useFormValues({
    correo: "",
    password: "",
  })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lockUntil, setLockUntil] = React.useState<number | null>(null)
  const [remaining, setRemaining] = React.useState(0)

  React.useEffect(() => {
    if (lockUntil === null) return
    const tick = () => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000)
      if (left <= 0) {
        setLockUntil(null)
        setRemaining(0)
      } else {
        setRemaining(left)
      }
    }
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [lockUntil])

  const locked = lockUntil !== null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || locked) return
    setError(null)

    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(issuesToFieldErrors<"correo" | "password">(parsed.error.issues))
      return
    }
    setErrors({})

    setPending(true)
    try {
      const result = await onSubmit(parsed.data)
      if (result.ok) {
        onSuccess?.()
        return
      }
      if (result.kind === "rate-limited") {
        const seconds = Math.max(1, result.retryAfterSeconds ?? 60)
        setLockUntil(Date.now() + seconds * 1000)
        setRemaining(seconds)
      } else {
        setError(result.message ?? MESSAGES[result.kind])
      }
    } catch {
      setError(MESSAGES.unavailable)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {locked ? (
        <Alert variant="destructive" role="status">
          <AlertDescription>
            Demasiados intentos. Podrás intentarlo de nuevo en{" "}
            <span className="font-medium tabular-nums">
              {formatCountdown(remaining)}
            </span>
            .
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          name="correo"
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={values.correo}
          onChange={(e) => setValue("correo", e.target.value)}
          error={errors.correo}
        />
        <div className="flex flex-col gap-1.5">
          <PasswordField
            name="password"
            label="Contraseña"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValue("password", e.target.value)}
            error={errors.password}
          />
          {linkSlot ? (
            <div className="text-end text-xs text-muted-foreground">
              {linkSlot}
            </div>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={pending || locked}
          aria-busy={pending}
          className="h-10 w-full rounded-xl"
        >
          {pending ? (
            <>
              <LoaderCircle
                aria-hidden
                className="size-4 motion-safe:animate-spin"
              />
              Ingresando
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </div>
  )
}
