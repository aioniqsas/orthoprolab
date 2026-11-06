/**
 * Installs the retry/idempotency layer for every server-side request this app
 * makes to the API. Runs once per Next server process.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { instalarReintentos } = await import("@repo/api-client/reintentos");
  instalarReintentos({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003",
  });
}
