import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessNotice } from "@repo/ui/auth/access-notice";
import { PortalFrame } from "@repo/ui/auth/portal-frame";
import { getAccess, getRequestPath } from "@/lib/session";
import { Logout } from "./logout";

function PortalNav() {
  const links = [
    { href: "/", label: "Inicio" },
    { href: "/doctores", label: "Doctores" },
    { href: "/ordenes", label: "Órdenes" },
    { href: "/cuentas-cobro", label: "Cuentas de cobro" },
  ];
  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl gap-1 px-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const access = await getAccess();

  if (access.kind === "login") {
    redirect(`/login?next=${encodeURIComponent(await getRequestPath())}`);
  }

  if (access.kind === "unavailable") {
    return (
      <AccessNotice
        title="No pudimos verificar tu sesión"
        description="Inténtalo de nuevo más tarde."
      >
        {/* A full document reload is intended here, not a client navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Recargar
        </a>
      </AccessNotice>
    );
  }

  if (access.kind === "forbidden") {
    return (
      <AccessNotice
        title="Usa el portal de administración"
        description="Esta cuenta es de administrador y no puede usar el portal de clientes."
      >
        <Logout />
      </AccessNotice>
    );
  }

  return (
    <PortalFrame
      productName="Portal de clínicas"
      usuario={access.usuario}
      actions={<Logout />}
      nav={<PortalNav />}
    >
      {children}
    </PortalFrame>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-6 text-sm text-muted-foreground">
          Cargando
        </div>
      }
    >
      <Gate>{children}</Gate>
    </Suspense>
  );
}
