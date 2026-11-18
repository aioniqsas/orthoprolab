const DEFAULT_API_BASE = "http://localhost:3003";

/**
 * Serves the generated catalog PDF from the site origin, so the download does
 * not depend on the API being publicly reachable.
 *
 * shortcut: every download reaches the API through this server, where the PDF
 * throttle (5/min) is shared by all visitors; raise it if the site grows.
 */
export async function GET() {
  const base = (process.env.API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/catalogo/pdf`, { cache: "no-store" });
    if (!res.ok || !res.body) {
      return new Response("No se pudo generar el catálogo.", { status: 502 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="catalogo-orthopro-lab.pdf"',
        // The CDN keeps the PDF for an hour, so the API is asked at most once per
        // hour instead of on every download (optimizacion B7). After editing the
        // catalog the PDF can lag up to one hour at the edge.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("No se pudo generar el catálogo.", { status: 502 });
  }
}
