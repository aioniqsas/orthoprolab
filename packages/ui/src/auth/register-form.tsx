"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import {
  PASSWORD_RULE_HINT,
  registerFormSchema,
  toRegisterPayload,
} from "@repo/api-client/schemas"
import type { RegisterInput } from "@repo/api-client/schemas"
import { Alert, AlertDescription } from "@repo/ui/components/alert"
import { Button } from "@repo/ui/components/button"
import { FormField } from "@repo/ui/auth/form-field"
import { PasswordField } from "@repo/ui/auth/password-field"
import type { AuthResult } from "@repo/ui/lib/auth-types"
import { issuesToFieldErrors, useFormValues } from "@repo/ui/lib/form"
import { formatCountdown } from "@repo/ui/auth/login-form"

export interface RegisterFormProps {
  title?: string
  description?: string
  /** Performs the registration with the API-accepted payload (no confirmPassword). */
  onSubmit: (values: RegisterInput) => Promise<AuthResult>
  /** Shown after a successful registration, e.g. a link to the login screen. */
  successSlot?: React.ReactNode
  submitLabel?: string
}

type Key =
  | "nombres"
  | "apellidos"
  | "cedula"
  | "correo"
  | "password"
  | "confirmPassword"

const GENERIC_FAILURE =
  "No pudimos completar el registro en este momento. Inténtalo de nuevo más tarde."

export function RegisterForm({
  title = "Crear cuenta",
  description,
  onSubmit,
  successSlot,
  submitLabel = "Crear cuenta",
}: RegisterFormProps) {
  const { values, setValue, errors, setErrors } = useFormValues<Key>({
    nombres: "",
    apellidos: "",
    cedula: "",
    correo: "",
    password: "",
    confirmPassword: "",
  })
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const [lockUntil, setLockUntil] = React.useState<number | null>(null)
  const [remaining, setRemaining] = React.useState(0)

  React.useEffect(() => {
    if (lockUntil === null) return
    const id = window.setInterval(() => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000)
      if (left <= 0) {
        setLockUntil(null)
        setRemaining(0)
      } else {
        setRemaining(left)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [lockUntil])

  const locked = lockUntil !== null

  function validateField(key: Key) {
    const parsed = registerFormSchema.safeParse(values)
    const all = parsed.success
      ? {}
      : issuesToFieldErrors<Key>(parsed.error.issues)
    setErrors((prev) => ({ ...prev, [key]: all[key] }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || locked) return
    setError(null)

    const parsed = registerFormSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(issuesToFieldErrors<Key>(parsed.error.issues))
      return
    }
    setErrors({})

    setPending(true)
    try {
      const result = await onSubmit(toRegisterPayload(parsed.data))
      if (result.ok) {
        setDone(true)
        return
      }
      if (result.kind === "rate-limited") {
        const seconds = Math.max(1, result.retryAfterSeconds ?? 60)
        setLockUntil(Date.now() + seconds * 1000)
        setRemaining(seconds)
      } else {
        setError(
          result.kind === "validation"
            ? (result.message ?? "Revisa los datos ingresados.")
            : (result.message ?? GENERIC_FAILURE)
        )
      }
    } catch {
      setError(GENERIC_FAILURE)
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Cuenta creada
        </h2>
        <p className="text-sm text-muted-foreground">
          Tu registro se completó. Ya puedes iniciar sesión.
        </p>
        {successSlot}
      </div>
    )
  }

  const bind = (key: Key) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValue(key, e.target.value),
    onBlur: () => {
      if (values[key] !== "") validateField(key)
    },
    error: errors[key],
  })

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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            name="nombres"
            label="Nombres"
            autoComplete="given-name"
            {...bind("nombres")}
          />
          <FormField
            name="apellidos"
            label="Apellidos"
            autoComplete="family-name"
            {...bind("apellidos")}
          />
        </div>
        <FormField
          name="cedula"
          label="Cédula"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          {...bind("cedula")}
        />
        <FormField
          name="correo"
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="username"
          {...bind("correo")}
        />
        <PasswordField
          name="password"
          label="Contraseña"
          autoComplete="new-password"
          hint={`Debe tener ${PASSWORD_RULE_HINT}`}
          {...bind("password")}
        />
        <PasswordField
          name="confirmPassword"
          label="Confirmar contraseña"
          autoComplete="new-password"
          {...bind("confirmPassword")}
        />
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
              Creando cuenta
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </div>
  )
}
