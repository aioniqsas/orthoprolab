"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to order changes and re-renders the current route so the
 * client list stays in sync with the admin portal.
 */
export function OrdenesLive() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api-proxy/mi-clinica/ordenes/eventos");
    source.addEventListener("orden", () => router.refresh());
    return () => source.close();
  }, [router]);

  return null;
}
