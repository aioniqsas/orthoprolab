"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Search text kept in the URL (`?q=`) so the server can filter the list.
 * The input updates at once; the URL, and with it the server request, follows
 * after `delay` ms without typing (debounce), so each keystroke is not a
 * round-trip.
 */
export function useBusquedaUrl(inicial: string, delay = 300) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(inicial);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function onChange(nuevo: string) {
    setValor(nuevo);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      const q = nuevo.trim();
      if (q) next.set("q", q);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, delay);
  }

  return { value: valor, onChange };
}
