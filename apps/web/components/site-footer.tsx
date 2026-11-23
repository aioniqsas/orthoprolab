import Link from "next/link";
import { BRAND_NAME, LAB_ADDRESS, whatsappUrl } from "@/lib/site";
import { SERVICES } from "@/lib/catalog";
import { Brand } from "./brand";
import { CurrentYear } from "./current-year";

const FOOTER_LINK = "inline-flex min-h-11 items-center transition-colors hover:text-body";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-10 px-6 py-14 lg:px-12">
        <div className="flex flex-col gap-1">
          <Brand className="text-xl" />
          <address className="not-italic">{LAB_ADDRESS}</address>
          <a
            href={whatsappUrl("Hola, quiero enviar un caso a OrthoPro Lab.")}
            target="_blank"
            rel="noreferrer"
            className={FOOTER_LINK}
          >
            WhatsApp
          </a>
        </div>

        <nav aria-label="Servicios" className="flex flex-col gap-0.5">
          <strong className="font-heading text-sm font-semibold text-body">Servicios</strong>
          {SERVICES.map(({ slug, name }) => (
            <Link key={slug} href={`/catalogo/${slug}`} prefetch className={FOOTER_LINK}>
              {name}
            </Link>
          ))}
        </nav>

        <nav aria-label="Laboratorio" className="flex flex-col gap-0.5">
          <strong className="font-heading text-sm font-semibold text-body">Laboratorio</strong>
          <Link href="/nosotros" prefetch className={FOOTER_LINK}>
            Nosotros
          </Link>
          <Link href="/pagos" prefetch className={FOOTER_LINK}>
            Pagos
          </Link>
          <Link href="/privacidad" prefetch className={FOOTER_LINK}>
            Política de privacidad
          </Link>
        </nav>
      </div>
      <div className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © <CurrentYear /> {BRAND_NAME}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
