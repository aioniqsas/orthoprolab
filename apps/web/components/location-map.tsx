import { MapPinIcon } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Reveal } from "@/components/reveal";
import { BRAND_NAME, LAB_ADDRESS, LAB_FULL_ADDRESS } from "@/lib/site";

// Keyless Google Maps URLs (no API key exists for this project).
const DIRECTIONS_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LAB_FULL_ADDRESS)}`;
const EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(LAB_FULL_ADDRESS)}&output=embed`;

export function LocationMap() {
  return (
    <section id="ubicacion" className="scroll-mt-16 py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-12 lg:items-stretch lg:gap-14 lg:px-12">
        <Reveal className="flex flex-col justify-center gap-6 lg:col-span-4">
          <h2 className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
            Dónde estamos en Medellín
          </h2>
          <p className="text-body/80">
            {BRAND_NAME} atiende a odontólogos y especialistas desde su laboratorio en Medellín.
          </p>
          <address className="flex items-start gap-3 not-italic text-body">
            <MapPinIcon className="mt-0.5 size-5 shrink-0 text-highlight" strokeWidth={1.5} aria-hidden />
            <span>{LAB_ADDRESS}</span>
          </address>
          <a
            href={DIRECTIONS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto w-fit gap-2 rounded-xl border-body/40 px-6 py-3.5 font-semibold",
            )}
          >
            Cómo llegar
            <span className="sr-only"> al laboratorio en Google Maps (se abre en una pestaña nueva)</span>
          </a>
        </Reveal>
        <Reveal className="lg:col-span-8">
          <div className="aspect-[4/3] min-h-80 w-full overflow-hidden rounded-xl bg-card ring-1 ring-body/20 lg:aspect-auto lg:h-full lg:min-h-[28rem]">
            <iframe
              src={EMBED_SRC}
              title={`Mapa de Google con la ubicación de ${BRAND_NAME} en Medellín`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="size-full border-0"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
