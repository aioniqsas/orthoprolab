import Link from "next/link";
import { PageHeader } from "../_components/page-header";

export default function NotFound() {
  return (
    <section className="flex flex-col gap-4">
      <PageHeader title="No encontramos lo que buscas" />
      <p className="text-sm text-muted-foreground">
        El registro no existe o la dirección no es válida.
      </p>
      <Link href="/ordenes" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Volver a órdenes
      </Link>
    </section>
  );
}
