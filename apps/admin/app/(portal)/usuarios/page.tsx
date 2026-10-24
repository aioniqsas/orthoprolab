import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { listUsuarios } from "@/lib/data/repository";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
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
          <Link href="/usuarios/nuevo" className={buttonVariants()}>
            <UserPlus aria-hidden /> Nuevo usuario
          </Link>
        }
      />
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
