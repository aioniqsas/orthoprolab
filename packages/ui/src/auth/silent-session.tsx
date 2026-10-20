"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import type { Usuario } from "@repo/api-client"

export interface SilentSessionProps {
  /** Only the two calls this component needs; the app injects its client. */
  client: {
    auth: { refresh: () => Promise<void>; me: () => Promise<Usuario> }
  }
  onAuthenticated: (usuario: Usuario) => void
  onAnonymous: () => void
  label?: string
}

/**
 * On mount, tries `refresh()` then `me()` exactly once and reports the outcome.
 * No retries and no loops: any failure means "anonymous".
 */
export function SilentSession({
  client,
  onAuthenticated,
  onAnonymous,
  label = "Verificando tu sesión",
}: SilentSessionProps) {
  const started = React.useRef(false)
  const handlers = React.useRef({ onAuthenticated, onAnonymous })
  handlers.current = { onAuthenticated, onAnonymous }

  React.useEffect(() => {
    // Guards against the double effect run of React Strict Mode.
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        await client.auth.refresh()
        const usuario = await client.auth.me()
        handlers.current.onAuthenticated(usuario)
      } catch {
        handlers.current.onAnonymous()
      }
    })()
  }, [client])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
      <span>{label}</span>
    </div>
  )
}
