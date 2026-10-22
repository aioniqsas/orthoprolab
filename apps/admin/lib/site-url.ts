/**
 * Origin of the public site. Kept out of `api.ts` so client components can read
 * one string without pulling the API client into the browser bundle.
 */
export const WEB_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
