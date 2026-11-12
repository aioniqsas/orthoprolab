"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Search kept in the URL (`?q=`) so the server filters the list. The text is
 * sent only when the user submits (Buscar or Enter): the server searches its
 * indexes with it, instead of the browser downloading and filtering everything.
 */
export function useBusquedaUrl(inicial: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(inicial);

  function onSearch(texto: string) {
    setValor(texto);
    const next = new URLSearchParams(params.toString());
    const q = texto.trim();
    if (q) next.set("q", q);
    else next.delete("q");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return { value: valor, onSearch };
}
