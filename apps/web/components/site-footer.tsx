import Link from "next/link";
import { MapPinIcon } from "lucide-react";
import { BRAND_NAME, LAB_ADDRESS, NAV_LINKS } from "@/lib/site";
import { Brand } from "./brand";
import { CurrentYear } from "./current-year";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-12 lg:px-12">
        <div className="space-y-4 md:col-span-6">
          <Brand className="text-xl" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Laboratorio digital de ortodoncia y prótesis CAD/CAM para
            odontólogos y especialistas.
          </p>
          <div className="flex max-w-sm gap-2 text-sm text-body/80">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
            <address className="not-italic">{LAB_ADDRESS}</address>
          </div>
        </div>

        <nav aria-label="Pie de página" className="md:col-span-3 md:col-start-10">
          <h2 className="font-heading text-sm font-semibold text-body">Navegación</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-body">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © <CurrentYear /> {BRAND_NAME}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
