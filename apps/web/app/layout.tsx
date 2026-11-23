import type { Metadata } from "next";
import { Outfit, Poppins } from "next/font/google";
import { CatalogLive } from "@/components/catalog-live";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, pageSocial } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_TITLE} | ${BRAND_NAME}`, template: `%s | ${BRAND_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  robots: { index: true, follow: true },
  ...pageSocial(`${SITE_TITLE} | ${BRAND_NAME}`, SITE_DESCRIPTION, "/"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${outfit.variable} ${poppins.variable} h-full`}
    >
      {/* Browser extensions (e.g. ColorZilla) inject attributes into <body> before hydration. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-highlight focus:px-4 focus:py-3 focus:font-semibold focus:text-background"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <SiteFooter />
        <CatalogLive />
      </body>
    </html>
  );
}
