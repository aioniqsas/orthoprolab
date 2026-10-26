import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { isAdmin } from "@/lib/auth-guard";
import { fullName } from "@/lib/data/helpers";
import { getUsuario } from "@/lib/data/repository";
import { ListSkeleton } from "../../../_components/list-skeleton";
import { PageHeader } from "../../../_components/page-header";
import { ActivoBadge, RolBadge } from "../../../_components/status-badges";
import { UsuarioAcciones } from "./usuario-acciones";

export const metadata: Metadata = { title: "Detalle de usuario" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UsuarioDetailPage({ params }: PageProps<"/usuarios/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/usuarios"
        className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Volver a usuarios
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <UsuarioDetail params={params} />
      </Suspense>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

async function UsuarioDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const usuario = await getUsuario(id);
  if (!usuario) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fullName(usuario)}
        description={usuario.correo}
        actions={
          <>
            <Link href={`/usuarios/${usuario.id}/editar`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
            <UsuarioAcciones id={usuario.id} activo={usuario.activo} />
          </>
        }
      />
      <section aria-labelledby="perfil" className="rounded-xl border border-border bg-card p-5">
        <h2 id="perfil" className="font-heading text-lg font-semibold">
          Perfil
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombres">{usuario.nombres}</Field>
          <Field label="Apellidos">{usuario.apellidos}</Field>
          <Field label="Correo">{usuario.correo}</Field>
          <Field label="Rol">
            <RolBadge rol={usuario.rol} />
          </Field>
          <Field label="Estado">
            <ActivoBadge activo={usuario.activo} />
          </Field>

        </dl>

      </section>
      {usuario.rol === "clinica" ? (
        <section aria-labelledby="clinica" className="rounded-xl border border-border bg-card p-5">
          <h2 id="clinica" className="font-heading text-lg font-semibold">
            Clínica
          </h2>
          {usuario.clinica ? (
            <Link
              href={`/clinicas/${usuario.clinica.id}`}
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {usuario.clinica.nombre}
            </Link>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Sin clínica asociada.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
