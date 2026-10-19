import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClockIcon, FlaskConicalIcon, StethoscopeIcon, UploadIcon } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Accent, SectionHeading } from "@/components/section-heading";
import { PriceDownloadButton } from "@/components/price-download-button";
import { ServiceIcon } from "@/components/service-icon";
import { SERVICES, getService } from "@/lib/catalog";

type Props = { params: Promise<{ servicio: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ servicio: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { servicio } = await params;
  const service = getService(servicio);
  if (!service) return {};
  return {
    title: `${service.name} | Catálogo | Orthopro Lab`,
    description: service.description,
  };
}

export default async function ServicePage({ params }: Props) {
  const { servicio } = await params;
  const service = getService(servicio);
  if (!service) notFound();

  const details = [
    { icon: StethoscopeIcon, label: "Indicación", key: "indication" },
    { icon: FlaskConicalIcon, label: "Material", key: "material" },
    { icon: UploadIcon, label: "Requisito clínico", key: "requirement" },
  ] as const;

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl space-y-12 px-6 lg:px-12">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-body"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Volver al catálogo
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <ServiceIcon icon={service.icon} className="size-9 text-highlight" />
            <SectionHeading
              as="h1"
              eyebrow={service.materialTag}
              title={<Accent>{service.name}</Accent>}
              description={service.description}
            />
          </div>
          <PriceDownloadButton />
        </div>

        <ul className="grid gap-6 lg:grid-cols-2">
          {service.items.map((item) => (
            <li key={item.code}>
              <Card className="h-full">
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">{item.code}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <ClockIcon className="size-3.5" aria-hidden />
                      {item.turnaround}
                    </span>
                  </div>
                  <h2 className="font-heading text-lg font-semibold text-body">{item.name}</h2>
                  <dl className="space-y-3">
                    {details.map(({ icon: Icon, label, key }) => (
                      <div key={key} className="flex gap-3">
                        <Icon className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-title">{label}</dt>
                          <dd className="text-sm text-muted-foreground">{item[key]}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
