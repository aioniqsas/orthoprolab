import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { isAdmin } from "@/lib/auth-guard";
import { filterClinicas, parseQuery } from "@/lib/data/helpers";
import { listClinicas } from "@/lib/data/repository";
import { CLINICAS_REASON, DisabledAction } from "../../_components/disabled-action";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";

export const metadata: Metadata = { title: "Clínicas" };

export default function ClinicasPage({ searchParams }: PageProps<"/clinicas">) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Directorio de clínicas odontológicas"
        description="Clínicas registradas y los doctores asociados a cada una."
        actions={
          <DisabledAction id="nueva-clinica-reason" variant="default" reason={CLINICAS_REASON}>
            <Plus aria-hidden /> Registrar clínica
          </DisabledAction>
        }
      />
      <SampleNotice section="clínicas" />
      <Suspense fallback={<ListSkeleton />}>
        <ClinicasView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ClinicasView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return null;
  const q = parseQuery(await searchParams);
  const clinicas = filterClinicas(await listClinicas(), q);

  return (
    <div className="flex flex-col gap-4">
      <form method="get" action="/clinicas" role="search" className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Buscar por clínica, dirección o doctor"
            placeholder="Buscar por clínica, dirección o doctor"
            className="h-10 rounded-xl pl-8"
          />
        </div>
        <Button type="submit" size="lg" className="h-10 rounded-xl px-4">
          Buscar
        </Button>
        {q ? (
          <Link href="/clinicas" className="text-sm text-primary underline-offset-4 hover:underline">
            Limpiar búsqueda
          </Link>
        ) : null}
      </form>
      <p role="status" className="text-sm text-muted-foreground">
        {clinicas.length === 1 ? "1 clínica" : `${clinicas.length} clínicas`}
      </p>

      {clinicas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-heading text-lg font-semibold">No hay clínicas con esta búsqueda</p>
          <p className="mt-1 text-sm text-muted-foreground">Prueba con otro término.</p>
        </div>
      ) : (
        <>
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-end">Doctores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinicas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/clinicas/${c.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {c.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{c.direccion ?? "Sin dirección"}</TableCell>
                    <TableCell className="text-end tabular-nums">{c.doctores.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {clinicas.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4">
                <Link
                  href={`/clinicas/${c.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {c.nombre}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{c.direccion ?? "Sin dirección"}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.doctores.length === 1 ? "1 doctor" : `${c.doctores.length} doctores`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
