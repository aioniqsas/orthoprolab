"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to order changes and re-renders the current route so the
 * admin table and stats stay in sync with the client portal.
 */
export function OrdenesLive() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api-proxy/ordenes/eventos");
    source.addEventListener("orden", () => router.refresh());
    return () => source.close();
  }, [router]);

  return null;
}
