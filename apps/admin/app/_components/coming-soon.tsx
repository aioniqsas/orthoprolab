import { Hourglass } from "lucide-react";
import { PageHeader } from "./page-header";

export function ComingSoon({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <Hourglass aria-hidden className="size-8 text-primary" />
        <p className="font-heading text-lg font-semibold">Próximamente</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Esta sección todavía no está disponible en el portal de administración.
        </p>
      </div>
    </section>
  );
}
