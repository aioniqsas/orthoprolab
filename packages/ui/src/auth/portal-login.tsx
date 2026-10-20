"use client"

import * as React from "react"
import { safeRedirectPath, toAuthResult } from "@repo/api-client"
import type { ApiClient, Rol } from "@repo/api-client"
import { AuthShell } from "@repo/ui/auth/auth-shell"
import type { AuthShellProps } from "@repo/ui/auth/auth-shell"
import { LoginForm } from "@repo/ui/auth/login-form"
import { SilentSession } from "@repo/ui/auth/silent-session"
import type { AuthResult } from "@repo/ui/lib/auth-types"

export interface PortalLoginProps {
  client: ApiClient
  /** Roles that may enter this portal. */
  allowedRoles: readonly Rol[]
  /** Safe message shown when valid credentials belong to a role without access. */
  deniedMessage: string
  /** Raw `next` query value; sanitized here with `safeRedirectPath`. */
  next: string | null
  /** App-provided navigation, e.g. `router.replace`. */
  navigate: (path: string) => void
  shell: Omit<AuthShellProps, "children" | "footer">
  title?: string
  description?: string
  footer?: React.ReactNode
}

/** Login screen shared by both portals: silent session check, then the form. */
export function PortalLogin({
  client,
  allowedRoles,
  deniedMessage,
  next,
  navigate,
  shell,
  title,
  description,
  footer,
}: PortalLoginProps) {
  const [checking, setChecking] = React.useState(true)
  const target = safeRedirectPath(next, "/")

  async function onSubmit(values: {
    correo: string
    password: string
  }): Promise<AuthResult> {
    try {
      const usuario = await client.auth.login(values)
      if (!allowedRoles.includes(usuario.rol)) {
        await client.auth.logout().catch(() => undefined)
        return { ok: false, kind: "credentials", message: deniedMessage }
      }
      return { ok: true }
    } catch (error) {
      return toAuthResult(error)
    }
  }

  return (
    <AuthShell {...shell} footer={footer}>
      {checking ? (
        <SilentSession
          client={client}
          onAuthenticated={(usuario) => {
            if (allowedRoles.includes(usuario.rol)) navigate(target)
            else setChecking(false)
          }}
          onAnonymous={() => setChecking(false)}
        />
      ) : (
        <LoginForm
          title={title}
          description={description}
          onSubmit={onSubmit}
          onSuccess={() => navigate(target)}
        />
      )}
    </AuthShell>
  )
}
