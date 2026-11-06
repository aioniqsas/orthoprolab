import type { Metadata, Viewport } from "next";
import { Outfit, Poppins } from "next/font/google";
import "./globals.css";
import { PwaRegistro } from "./_components/pwa-registro";

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
  manifest: "/manifest.webmanifest",
  applicationName: "OrthoPro Lab",
  appleWebApp: { capable: true, title: "OrthoPro Clientes", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  title: { default: "OrthoPro Lab", template: "%s | OrthoPro Lab" },
  description: "Portal de clientes de OrthoPro Lab.",
  robots: { index: false, follow: false },
};

/** Colorea la barra del sistema cuando el portal corre instalado. */
export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${outfit.variable} ${poppins.variable} h-full antialiased`}
    >
      {/* Browser extensions inject attributes into <body> before hydration. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PwaRegistro />
        {children}
      </body>
    </html>
  );
}
