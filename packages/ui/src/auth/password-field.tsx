"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { FormField, type FormFieldProps } from "@repo/ui/auth/form-field"

export type PasswordFieldProps = Omit<FormFieldProps, "type" | "trailing">

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false)
  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute end-1 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </button>
      }
    />
  )
}
