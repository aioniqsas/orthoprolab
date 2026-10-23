import { createApiClient } from "@repo/api-client";

// In the browser, route through the Next.js rewrite so auth cookies land on
// the same origin (vercel.app) and the middleware can read them.
// On the server (SSR / server actions), call the API directly.
export const API_URL =
  typeof window !== "undefined"
    ? "/api-proxy"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003");

export const api = createApiClient({ baseUrl: API_URL });
