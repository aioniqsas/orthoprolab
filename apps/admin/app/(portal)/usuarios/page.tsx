import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { listUsuariosPage } from "@/lib/data/repository";
import {
  listaBooleano,
  listaOpcion,
  listaOrden,
  listaPagina,
  listaTamano,
} from "@/lib/lista-params";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { PermisosMatrix } from "./permisos-matrix";
import { UsuariosTable } from "./usuarios-table";

export const metadata: Metadata = { title: "Usuarios y permisos" };

export default function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    activo?: string;
    sort?: string;
    order?: string;
  }>;
}) {
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
        <UsuariosView searchParams={searchParams} />
      </Suspense>
      <PermisosMatrix />
    </section>
  );
}

const SORTS_USUARIO = ["nombre", "correo", "rol", "activo", "creado"] as const;

async function UsuariosView({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    size?: string;
    activo?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  const { q, page: pageParam, size: sizeParam, activo, sort, order } =
    await searchParams;
  if (!(await isAdmin())) return null;
  const page = listaPagina(pageParam);
  const size = listaTamano(sizeParam);
  const filtros = {
    activo: listaBooleano(activo),
    sort: listaOpcion(sort, SORTS_USUARIO),
    order: listaOrden(order),
  };
  const usuarios = await listUsuariosPage(q, page, size, filtros);
  return (
    <UsuariosTable
      usuarios={usuarios.data}
      total={usuarios.total}
      page={page}
      size={size}
      busquedaInicial={q ?? ""}
      filtros={filtros}
    />
  );
}
