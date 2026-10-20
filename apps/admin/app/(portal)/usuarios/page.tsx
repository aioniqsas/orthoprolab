import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { isAdmin } from "@/lib/auth-guard";
import { filterUsuarios, parseUsuarioFilters, rolLabel } from "@/lib/data/gestion";
import type { UsuarioFilters } from "@/lib/data/gestion";
import { fullName } from "@/lib/data/helpers";
import { listUsuarios } from "@/lib/data/repository";
import { ROLES } from "@/lib/data/types";
import { DisabledAction, USUARIOS_REASON } from "../../_components/disabled-action";
import { FilterTabs } from "../../_components/filter-tabs";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";
import { SearchForm } from "../../_components/search-form";
import { ActivoBadge, RolBadge } from "../../_components/status-badges";
import { PermisosMatrix } from "./permisos-matrix";

export const metadata: Metadata = { title: "Usuarios y permisos" };

function hrefWith(filters: UsuarioFilters, rol: UsuarioFilters["rol"]): string {
  const params = new URLSearchParams();
  if (rol) params.set("rol", rol);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return qs ? `/usuarios?${qs}` : "/usuarios";
}

export default function UsuariosPage({ searchParams }: PageProps<"/usuarios">) {
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
        <UsuariosView searchParams={searchParams} />
      </Suspense>
      <PermisosMatrix />
    </section>
  );
}

async function UsuariosView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return null;
  const filters = parseUsuarioFilters(await searchParams);
  const all = await listUsuarios();
  const base = filterUsuarios(all, { q: filters.q });
  const usuarios = filterUsuarios(all, filters);
  const tabs = [
    { rol: undefined, label: "Todos", count: base.length },
    ...ROLES.map((rol) => ({
      rol,
      label: rolLabel(rol),
      count: base.filter((u) => u.rol === rol).length,
    })),
  ].map((t) => ({
    href: hrefWith(filters, t.rol),
    label: t.label,
    count: t.count,
    active: filters.rol === t.rol,
  }));

  return (
    <div className="flex flex-col gap-4">
      <SearchForm
        action="/usuarios"
        q={filters.q ?? ""}
        label="Buscar por nombre o correo"
        hidden={filters.rol ? { rol: filters.rol } : {}}
      />
      <FilterTabs label="Filtrar por rol" tabs={tabs} />
      <p role="status" className="text-sm text-muted-foreground">
        {usuarios.length === 1 ? "1 usuario" : `${usuarios.length} usuarios`}
      </p>
      {usuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay usuarios con estos filtros</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otro rol o término.</p>
        </div>
      ) : (
        <>
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cédula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        href={`/usuarios/${u.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {fullName(u)}
                      </Link>
                    </TableCell>
                    <TableCell>{u.correo}</TableCell>
                    <TableCell>
                      <RolBadge rol={u.rol} />
                    </TableCell>
                    <TableCell>
                      <ActivoBadge activo={u.activo} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.cedulaEnmascarada}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {usuarios.map((u) => (
              <li key={u.id} className="rounded-xl border border-border bg-card p-4">
                <Link
                  href={`/usuarios/${u.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {fullName(u)}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{u.correo}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RolBadge rol={u.rol} />
                  <ActivoBadge activo={u.activo} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
