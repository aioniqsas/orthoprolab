import type { MetadataRoute } from "next";

/** Manifest del portal: permite instalarlo como aplicación. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OrthoProLab Clientes",
    short_name: "Clientes",
    description: "Portal de clientes de OrthoPro Lab.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#171717",
    theme_color: "#171717",
    lang: "es-CO",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
