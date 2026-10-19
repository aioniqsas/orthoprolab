import Link from "next/link";
import { BadgeCheckIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { NAV_LINKS } from "@/lib/site";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:px-12">
        <div className="space-y-4">
          <Brand className="text-xl" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Ingeniería ortodóncica de alta precisión y manufactura de prótesis
            digital CAD/CAM de grado clínico biomecánico.
          </p>
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs text-highlight">
            <BadgeCheckIcon className="size-4" aria-hidden />
            ISO 13485 • ANMAT Cert.
          </span>
        </div>

        <nav aria-label="Pie de página" className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest">
            Navegación
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-body">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest">
            Sede Central &amp; Tiempos
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
              Parque Tecnológico Biomédico, Torre Norte PB, CABA
            </li>
            <li className="flex gap-2">
              <ClockIcon className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
              <span>
                Lunes a Viernes: 08:00 - 19:30 hs
                <br />
                Sábados (Guardias CAD): 09:00 - 13:00 hs
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © 2024 OrthoPro Dental Laboratory S.A. Todos los derechos reservados. •
        Protocolo ISO Certificado • Soporte Exclusivo Odontólogos
      </div>
    </footer>
  );
}
