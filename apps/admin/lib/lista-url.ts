"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { listaQuery, listaSiguienteOrden } from "./lista-params";

/**
 * Everything that describes a list lives in the URL (`?q=&page=&size=&sort=
 * &order=&<filtros>`): the server searches, filters, sorts and paginates, so a
 * view can be linked, reloaded and reached with the browser's back button.
 * Changing anything except the page goes back to page 1.
 */
export function useListaUrl({
  q,
  sort,
  order,
  filterIds = [],
}: {
  q?: string;
  sort?: string;
  order?: string;
  filterIds?: readonly string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(q ?? "");

  function navegar(patch: Record<string, string | number | undefined>) {
    const actual: Record<string, string | undefined> = {
      q: params.get("q") ?? undefined,
      page: params.get("page") ?? undefined,
      size: params.get("size") ?? undefined,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") ?? undefined,
    };
    for (const id of filterIds) actual[id] = params.get(id) ?? undefined;
    const qs = listaQuery(actual, patch);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onSearch(texto: string) {
    setValor(texto);
    navegar({ q: texto });
  }

  function onSort(key: string) {
    navegar(
      listaSiguienteOrden(
        { sort, order: order === "asc" || order === "desc" ? order : undefined },
        key,
      ),
    );
  }

  const filterValues: Record<string, string> = {};
  for (const id of filterIds) filterValues[id] = params.get(id) ?? "all";

  const direccion: "asc" | "desc" | undefined =
    order === "asc" || order === "desc" ? order : undefined;

  return {
    value: valor,
    onSearch,
    sort,
    order: direccion,
    onSort,
    filterValues,
    onFilter: (id: string, value: string) =>
      navegar({ [id]: value === "all" ? undefined : value }),
    onPage: (next: number) => navegar({ page: next }),
    onSize: (next: number) => navegar({ page: 1, size: next }),
  };
}
