import { Suspense } from "react";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { WEB_URL } from "@/lib/site-url";
import { isAdmin } from "@/lib/auth-guard";
import { listContenidoAdmin } from "@/lib/contenido-api";
import { ListSkeleton } from "../../_components/list-skeleton";
import { PageHeader } from "../../_components/page-header";
import { ContenidoForm } from "./contenido-form";

export const metadata: Metadata = { title: "CMS y gestión web" };

export default function CmsPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="CMS y gestión web"
        description="Edita el contenido del sitio público. Los cambios se publican al guardar."
        actions={
          <a
            href={WEB_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <ExternalLink aria-hidden /> Ver sitio
          </a>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <CmsView />
      </Suspense>
    </section>
  );
}

async function CmsView() {
  if (!(await isAdmin())) return null;
  const contenido = await listContenidoAdmin();
  if (!contenido) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        No se pudo cargar el contenido del sitio.
      </p>
    );
  }
  return <ContenidoForm contenido={contenido} />;
}
