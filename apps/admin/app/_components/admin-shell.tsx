import * as React from "react";
import { Cog } from "lucide-react";
import { roleLabel } from "@repo/ui/auth/portal-frame";
import type { Usuario } from "@repo/api-client";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { TopbarTitle } from "./topbar-title";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Cog aria-hidden className="size-5" />
      </span>
      <div className="leading-tight">
        <p className="font-heading text-lg font-semibold text-foreground">OrthoPro Lab</p>
        <p className="text-[0.65rem] font-medium tracking-widest text-title uppercase">
          Admin backoffice
        </p>
      </div>
    </div>
  );
}

export interface AdminShellProps {
  usuario: Pick<Usuario, "nombres" | "apellidos" | "rol">;
  /** Slot for the logout button (client component). */
  actions: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ usuario, actions, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <aside
        aria-label="Barra lateral"
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-border bg-card px-3 py-6 lg:flex"
      >
        <Brand />
        <div>
          <p className="mb-2 px-3 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Módulos
          </p>
          <NavLinks />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <MobileNav />
          <div className="min-w-0 flex-1">
            <TopbarTitle />
          </div>
          <div className="text-end text-sm leading-tight">
            <p className="font-medium">
              {usuario.nombres} {usuario.apellidos}
            </p>
            <p className="text-xs text-muted-foreground">{roleLabel(usuario.rol)}</p>
          </div>
          {actions}
        </header>
        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 outline-none sm:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
