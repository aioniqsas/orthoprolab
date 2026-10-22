import { API_URL } from "@/lib/api";

/**
 * Streams the catalog PDF through the admin origin with an inline disposition,
 * so the preview screen can show it in the browser's PDF viewer instead of
 * downloading a file.
 *
 * shortcut: every preview reaches the API, where the PDF throttle (5/min) is
 * shared by all callers; raise it if the catalog grows.
 */
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/catalogo/pdf`, { cache: "no-store" });
    if (!res.ok || !res.body) {
      return new Response("No se pudo generar el catálogo.", { status: 502 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="catalogo-orthopro-lab.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("No se pudo generar el catálogo.", { status: 502 });
  }
}
