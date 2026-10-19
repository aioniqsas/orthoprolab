import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Accent, SectionHeading } from "@/components/section-heading";
import { PriceDownloadButton } from "@/components/price-download-button";
import { ServiceIcon } from "@/components/service-icon";
import { SERVICES } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catálogo de Servicios | Orthopro Lab",
  description:
    "Líneas de producción clínica de OrthoPro Lab: ortodoncia fija y removible, alineadores, retenedores, férulas y prótesis CAD/CAM.",
};

export default function CatalogPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            as="h1"
            eyebrow="Catálogo de Servicios"
            title={<>Líneas de <Accent>Producción Clínica</Accent></>}
            description="Aparatología ortodóncica y prótesis de precisión. Los precios se entregan en el catálogo en PDF."
          />
          <PriceDownloadButton />
        </div>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <li key={service.slug}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4">
                  <ServiceIcon icon={service.icon} className="size-8 text-highlight" />
                  <h2 className="font-heading text-xl font-semibold text-body">
                    {service.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{service.materialTag}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <ClockIcon className="size-3.5" aria-hidden />
                      {service.turnaround}
                    </span>
                  </div>
                  <Link
                    href={`/catalogo/${service.slug}`}
                    className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-medium text-highlight hover:underline"
                  >
                    Ver servicios
                    <ArrowRightIcon className="size-4" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
