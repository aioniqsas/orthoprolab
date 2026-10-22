import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Expires the cached catalog and content so the next render fetches fresh data.
 *
 * It has to be its own request: `revalidateTag` only records the tag in the
 * current request's pending revalidations, and those are applied when the
 * response finishes. A streaming response (the SSE bridge) never finishes, so
 * its invalidations would be dropped.
 */
export async function POST() {
  revalidateTag("catalog", { expire: 0 });
  revalidateTag("contenido", { expire: 0 });
  revalidatePath("/catalogo");
  revalidatePath("/catalogo", "layout");
  revalidatePath("/");
  revalidatePath("/nosotros");
  revalidatePath("/pagos");
  return Response.json({ ok: true });
}
