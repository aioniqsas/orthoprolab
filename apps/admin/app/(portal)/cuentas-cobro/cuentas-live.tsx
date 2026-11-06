"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refreshes the billing-account list when the API reports a change. */
export function CuentasLive() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/cuentas-cobro/eventos");
    source.addEventListener("cuenta-cobro", () => router.refresh());
    return () => source.close();
  }, [router]);

  return null;
}
