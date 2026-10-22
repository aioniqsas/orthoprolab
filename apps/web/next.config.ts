import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@repo/ui"],
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // The catalog changes whenever an administrator edits it, so the cached
    // copy is refreshed every few seconds instead of every hour.
    catalogo: { stale: 30, revalidate: 10, expire: 300 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
