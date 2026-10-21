"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to catalog changes and re-renders the current route.
 * The stream also expires the `catalog` cache tag on the server.
 */
export function CatalogLive() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/catalogo/eventos");
    source.addEventListener("catalogo", () => router.refresh());
    return () => source.close();
  }, [router]);

  return null;
}
