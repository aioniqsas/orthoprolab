import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccessNotice } from "@repo/ui/auth/access-notice";
import { PortalFrame } from "@repo/ui/auth/portal-frame";
import { getAccess, getRequestPath } from "@/lib/session";
import { Logout } from "./logout";

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
        title="Sin permisos"
        description="Tu cuenta no tiene acceso al portal de administración."
      >
        <Logout />
      </AccessNotice>
    );
  }

  return (
    <PortalFrame productName="OrthoPro Admin" usuario={access.usuario} actions={<Logout />}>
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
