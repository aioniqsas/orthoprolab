import { cacheTag, cacheLife } from "next/cache";

const DEFAULT_API_BASE = "http://localhost:3003";

/** Flat map of the values an administrator saved, keyed by `<pagina>.<seccion>.<campo>`. */
export type Contenido = Record<string, string>;

export async function fetchContenido(): Promise<Contenido> {
  // Inline instead of file level: `texto` is a sync helper and a file-level
  // `"use cache"` would demand every export be async.
  "use cache";
  cacheTag("contenido");
  cacheLife("catalogo");

  const base = (process.env.API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/contenido`, {
      signal: AbortSignal.timeout(3000),
      // Same short lifetime and tag as the function above, so
      // `revalidateTag("contenido")` always wins.
      next: { revalidate: 10, tags: ["contenido"] },
    });
    if (!res.ok) return {};

    const data = (await res.json()) as unknown;
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};

    return Object.fromEntries(
      Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

/** Saved value when it has visible text, otherwise the literal the page already ships. */
export function texto(contenido: Contenido, clave: string, porDefecto: string): string {
  const valor = contenido[clave];
  return typeof valor === "string" && valor.trim().length > 0 ? valor : porDefecto;
}
