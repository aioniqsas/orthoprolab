import { Suspense } from "react";
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { isAdmin } from "@/lib/auth-guard";
import { listUsuarios } from "@/lib/data/repository";
import { DisabledAction, USUARIOS_REASON } from "../../_components/disabled-action";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";
import { PermisosMatrix } from "./permisos-matrix";
import { UsuariosTable } from "./usuarios-table";

export const metadata: Metadata = { title: "Usuarios y permisos" };

export default function UsuariosPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios y permisos"
        description="Cuentas del sistema, su rol y qué puede hacer cada rol."
        actions={
          <DisabledAction id="invitar-usuario-reason" variant="default" reason={USUARIOS_REASON}>
            <UserPlus aria-hidden /> Invitar usuario
          </DisabledAction>
        }
      />
      <SampleNotice section="usuarios" />
      <Suspense fallback={<ListSkeleton />}>
        <UsuariosView />
      </Suspense>
      <PermisosMatrix />
    </section>
  );
}

async function UsuariosView() {
  if (!(await isAdmin())) return null;
  const usuarios = await listUsuarios();
  return <UsuariosTable usuarios={usuarios} />;
}
