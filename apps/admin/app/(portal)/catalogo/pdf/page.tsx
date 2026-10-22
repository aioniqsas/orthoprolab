import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { PageHeader } from "../../../_components/page-header";

export const metadata: Metadata = { title: "Vista previa del PDF" };

export default function PdfPreviewPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Vista previa del PDF"
        description="Así se ve el catálogo de aranceles que descargan los clientes desde el sitio."
        actions={
          <>
            <Link href="/catalogo" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft aria-hidden /> Volver
            </Link>
            <a
              href="/api/catalogo/pdf"
              download="catalogo-orthopro-lab.pdf"
              className={buttonVariants()}
            >
              <Download aria-hidden /> Descargar
            </a>
          </>
        }
      />
      <iframe
        src="/api/catalogo/pdf"
        title="Vista previa del catálogo en PDF"
        className="h-[calc(100vh-15rem)] min-h-[30rem] w-full rounded-xl border bg-muted"
      />
    </section>
  );
}
