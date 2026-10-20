"use client"

import * as React from "react"

export type FieldErrors<K extends string> = Partial<Record<K, string>>

interface Issue {
  path: ReadonlyArray<PropertyKey>
  message: string
}

/** Keeps the first issue message per top-level field. */
export function issuesToFieldErrors<K extends string>(
  issues: ReadonlyArray<Issue>
): FieldErrors<K> {
  const out: FieldErrors<K> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !(key in out)) {
      out[key as K] = issue.message
    }
  }
  return out
}

/** Tiny controlled-state helper: values, errors and a validator run on demand. */
export function useFormValues<K extends string>(initial: Record<K, string>) {
  const [values, setValues] = React.useState<Record<K, string>>(initial)
  const [errors, setErrors] = React.useState<FieldErrors<K>>({})

  const setValue = React.useCallback((key: K, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { values, setValue, errors, setErrors }
}
