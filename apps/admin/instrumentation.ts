/**
 * Installs the retry/idempotency layer for every server-side request this app
 * makes to the API. Runs once per Next server process.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Los logs viven en disco: hay que instalarlos antes de cualquier otra cosa
  // para dejar rastro incluso si el proceso muere arrancando.
  const { instalarCapturaDeCaidas } = await import("@/lib/logger");
  instalarCapturaDeCaidas();

  const { instalarReintentos } = await import("@repo/api-client/reintentos");
  instalarReintentos({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003",
  });
}
