import type { NextConfig } from "next";

// A Content-Security-Policy needs per-request nonces to work with Next inline
// scripts; it is tracked as a follow-up and intentionally omitted here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/api-client"],
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  experimental: {
    // Catalog images are up to 5 MB; server actions default to 1 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";
    return [{ source: "/api-proxy/:path*", destination: `${apiUrl}/:path*` }];
  },
  async redirects() {
    return [{ source: "/", destination: "/ordenes", permanent: false }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The dashboard preview frames this response itself, so it allows
      // same-origin framing instead of DENY.
      {
        source: "/api/catalogo/pdf",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
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
