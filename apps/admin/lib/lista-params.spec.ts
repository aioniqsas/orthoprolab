import { describe, expect, it } from "vitest";
import {
  LISTA_TAMANO,
  listaBooleano,
  listaOpcion,
  listaOrden,
  listaPagina,
  listaQuery,
  listaSiguienteOrden,
  listaTamano,
} from "./lista-params";

describe("listaPagina", () => {
  it("falls back to page 1 for a missing or invalid page", () => {
    expect(listaPagina(undefined)).toBe(1);
    expect(listaPagina("0")).toBe(1);
    expect(listaPagina("abc")).toBe(1);
    expect(listaPagina("3")).toBe(3);
  });
});

describe("listaTamano", () => {
  it("defaults to 10 rows per page", () => {
    expect(LISTA_TAMANO).toBe(10);
    expect(listaTamano(undefined)).toBe(10);
  });

  it("only accepts the offered sizes", () => {
    expect(listaTamano("25")).toBe(25);
    expect(listaTamano("100")).toBe(LISTA_TAMANO);
    expect(listaTamano("7")).toBe(LISTA_TAMANO);
  });
});

describe("listaOrden, listaOpcion and listaBooleano", () => {
  it("keeps only asc/desc", () => {
    expect(listaOrden("asc")).toBe("asc");
    expect(listaOrden("desc")).toBe("desc");
    expect(listaOrden("sideways")).toBeUndefined();
    expect(listaOrden(undefined)).toBeUndefined();
  });

  it("keeps only whitelisted options", () => {
    const grupos = ["pendientes", "pagadas", "canceladas"] as const;
    expect(listaOpcion("pagadas", grupos)).toBe("pagadas");
    expect(listaOpcion("inventado", grupos)).toBeUndefined();
    expect(listaOpcion(undefined, grupos)).toBeUndefined();
  });

  it("keeps only true/false", () => {
    expect(listaBooleano("true")).toBe(true);
    expect(listaBooleano("false")).toBe(false);
    expect(listaBooleano("si")).toBeUndefined();
    expect(listaBooleano(undefined)).toBeUndefined();
  });
});

describe("listaQuery", () => {
  it("keeps the search term when changing page", () => {
    const qs = listaQuery({ q: "gomez", page: "1" }, { page: 2 });
    expect(qs).toBe("q=gomez&page=2");
  });

  it("goes back to page 1 when searching", () => {
    const qs = listaQuery({ q: "gomez", page: "3", size: "25" }, { q: "perez" });
    expect(qs).toBe("q=perez&size=25");
  });

  it("drops the term when the search is cleared but keeps the page size", () => {
    const qs = listaQuery({ q: "gomez", page: "2", size: "50" }, { q: "  " });
    expect(qs).toBe("size=50");
  });

  it("leaves the defaults out of the URL", () => {
    expect(listaQuery({}, { page: 1, size: 10 })).toBe("");
  });

  it("keeps the page size with the search term", () => {
    expect(listaQuery({ q: "gomez", size: "25" }, { page: 3 })).toBe(
      "q=gomez&page=3&size=25",
    );
  });

  it("sends the chosen filter and goes back to page 1", () => {
    expect(
      listaQuery({ q: "x", page: "3", grupo: "pagadas" }, { grupo: "canceladas" }),
    ).toBe("q=x&grupo=canceladas");
  });

  it("keeps the filters when changing page", () => {
    expect(
      listaQuery(
        { grupo: "pagadas", sort: "numero", order: "asc" },
        { page: 2 },
      ),
    ).toBe("page=2&sort=numero&order=asc&grupo=pagadas");
  });

  it("sends the sort and goes back to page 1", () => {
    expect(
      listaQuery({ q: "x", page: "2", grupo: "pagadas" }, { sort: "total", order: "desc" }),
    ).toBe("q=x&sort=total&order=desc&grupo=pagadas");
  });

  it("clears the sort when the column is clicked a third time", () => {
    expect(
      listaQuery(
        { grupo: "pagadas", sort: "total", order: "desc", page: "2" },
        { sort: undefined, order: undefined },
      ),
    ).toBe("grupo=pagadas");
  });

  it("drops a filter when it is set back to all", () => {
    expect(listaQuery({ grupo: "pagadas", q: "x" }, { grupo: undefined })).toBe(
      "q=x",
    );
  });
});

describe("listaSiguienteOrden", () => {
  it("starts a new column in ascending order", () => {
    expect(listaSiguienteOrden({}, "total")).toEqual({ sort: "total", order: "asc" });
  });

  it("alternates asc and desc on the same column", () => {
    expect(listaSiguienteOrden({ sort: "total", order: "asc" }, "total")).toEqual({
      sort: "total",
      order: "desc",
    });
  });

  it("clears the sort on the third click", () => {
    expect(listaSiguienteOrden({ sort: "total", order: "desc" }, "total")).toEqual({
      sort: undefined,
      order: undefined,
    });
  });
});
