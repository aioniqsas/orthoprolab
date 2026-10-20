import * as React from "react"
import { cn } from "@repo/ui/lib/utils"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

export interface FormFieldProps
  extends Omit<React.ComponentProps<"input">, "id" | "name"> {
  name: string
  label: string
  error?: string
  hint?: string
  /** Rendered inside the input row, after the input (e.g. a toggle button). */
  trailing?: React.ReactNode
}

export function FormField({
  name,
  label,
  error,
  hint,
  trailing,
  className,
  ...inputProps
}: FormFieldProps) {
  const id = React.useId()
  const inputId = `${id}-${name}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId} className="text-sm text-foreground">
        {label}
      </Label>
      <div className="relative flex items-center">
        <Input
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("h-10 rounded-xl px-3", trailing && "pe-11", className)}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
