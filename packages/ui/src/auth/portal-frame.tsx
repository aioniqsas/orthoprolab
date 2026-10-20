import * as React from "react"
import type { Rol, Usuario } from "@repo/api-client"

const ROLE_LABELS: Record<Rol, string> = {
  administrador: "Administrador",
  odontologo: "Odontólogo",
  asistente: "Asistente",
}

export function roleLabel(rol: Rol): string {
  return ROLE_LABELS[rol]
}

export interface PortalFrameProps {
  productName: string
  usuario: Pick<Usuario, "nombres" | "apellidos" | "rol">
  /** Slot for the logout button. */
  actions?: React.ReactNode
  children: React.ReactNode
}

/** Minimal authenticated shell: header with user, role and actions. */
export function PortalFrame({
  productName,
  usuario,
  actions,
  children,
}: PortalFrameProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
          <span className="font-heading text-lg font-semibold tracking-tight">
            {productName}
          </span>
          <div className="flex items-center gap-4">
            <div className="text-end text-sm leading-tight">
              <p className="font-medium">
                {usuario.nombres} {usuario.apellidos}
              </p>
              <p className="text-xs text-muted-foreground">
                {roleLabel(usuario.rol)}
              </p>
            </div>
            {actions}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
