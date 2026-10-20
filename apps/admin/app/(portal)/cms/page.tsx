import { Suspense } from "react";
import type { Metadata } from "next";
import { Eye, Rocket, Save } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { isAdmin } from "@/lib/auth-guard";
import { listPaginasWeb } from "@/lib/data/repository";
import { CMS_REASON, DisabledAction } from "../../_components/disabled-action";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { SampleNotice } from "../../_components/sample-notice";

export const metadata: Metadata = { title: "CMS y gestión web" };

export default function CmsPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="CMS y gestión web"
        description="Áreas editables del sitio público y el contenido que muestran hoy."
        actions={
          <>
            <DisabledAction id="guardar-borrador-reason" reason={CMS_REASON}>
              <Save aria-hidden /> Guardar borrador
            </DisabledAction>
            <DisabledAction id="publicar-reason" variant="default" reason={CMS_REASON}>
              <Rocket aria-hidden /> Publicar cambios
            </DisabledAction>
          </>
        }
      />
      <SampleNotice section="contenido web" />
      <p role="note" className="text-sm text-muted-foreground">
        Esta pantalla es de solo lectura. El modelo de datos no tiene tablas de contenido y no hay
        un servicio que guarde o publique cambios; hoy el contenido vive en el código del sitio
        público. Los títulos y descripciones son los que el sitio declara actualmente.
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <CmsView />
      </Suspense>
    </section>
  );
}

async function CmsView() {
  if (!(await isAdmin())) return null;
  const paginas = await listPaginasWeb();

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {paginas.map((p) => (
        <li key={p.ruta}>
          <article
            aria-labelledby={`pagina-${p.nombre}`}
            className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5"
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id={`pagina-${p.nombre}`} className="font-heading text-lg font-semibold">
                  {p.nombre}
                </h2>
                <p className="font-mono text-xs text-muted-foreground">{p.ruta}</p>
              </div>
              <Badge variant="outline" className="h-6 rounded-xl px-2.5">
                Solo lectura
              </Badge>
            </header>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`titulo-${p.nombre}`}>Título de la página</Label>
              <Input
                id={`titulo-${p.nombre}`}
                value={p.titulo}
                readOnly
                disabled
                aria-describedby={`titulo-${p.nombre}-n`}
                className="h-10 rounded-xl"
              />
              <p id={`titulo-${p.nombre}-n`} className="text-xs text-muted-foreground">
                {p.titulo.length} caracteres
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`desc-${p.nombre}`}>Descripción para buscadores</Label>
              <Input
                id={`desc-${p.nombre}`}
                value={p.descripcion}
                readOnly
                disabled
                aria-describedby={`desc-${p.nombre}-n`}
                className="h-10 rounded-xl"
              />
              <p id={`desc-${p.nombre}-n`} className="text-xs text-muted-foreground">
                {p.descripcion.length} caracteres
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <DisabledAction id={`ver-${p.nombre}-reason`} reason={CMS_REASON}>
                <Eye aria-hidden /> Vista previa
              </DisabledAction>
              <DisabledAction id={`editar-${p.nombre}-reason`} reason={CMS_REASON}>
                Editar contenido
              </DisabledAction>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
