"use client"

import * as React from "react"
import { Button } from "@repo/ui/components/button"

export interface LogoutButtonProps {
  /** Calls the API logout. Failures are ignored on purpose. */
  onLogout: () => Promise<unknown>
  /** Navigation after logout, e.g. `() => router.replace("/login")`. */
  onDone: () => void
  label?: string
}

export function LogoutButton({
  onLogout,
  onDone,
  label = "Cerrar sesión",
}: LogoutButtonProps) {
  const [pending, setPending] = React.useState(false)

  async function handleClick() {
    if (pending) return
    setPending(true)
    try {
      await onLogout()
    } catch {
      // Navigate to the login screen regardless of the result.
    } finally {
      onDone()
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
    >
      {label}
    </Button>
  )
}
