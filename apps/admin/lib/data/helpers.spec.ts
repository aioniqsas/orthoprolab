import { describe, expect, it } from "vitest";
import {
  esEstadoFinal,
  estadoLabel,
  filterClinicas,
  filterOrdenes,
  formatCop,
  formatDate,
  lineSubtotal,
  orderTotal,
  parseOrdenFilters,
} from "./helpers";
import type { Clinica, Orden } from "./types";

const doctor = (nombres: string, apellidos: string) => ({
  id: "d",
  nombres,
  apellidos,
  correo: "x@example.test" as string | null,
  clinicaId: "1",
  activo: true,
});

const orden = (over: Partial<Orden>): Orden => ({
  id: 1,
  doctor: doctor("Ana", "Ramírez"),
  paciente: { id: 1, nombre: "Pedro Pérez" },
  estado: "recibida",
  estadoDbId: "1",
  valor: "0.00",
  urgente: false,
  fechaCreacion: "2025-10-01T15:00:00.000Z",
  fechaEntrega: null,
  detalles: [],
  historial: [],
  ...over,
});

describe("money helpers", () => {
  it("computes a line subtotal as cantidad x precio with 2 decimals", () => {
    expect(lineSubtotal(3, "150000.50")).toBe("450001.50");
    expect(lineSubtotal(1, "0.10")).toBe("0.10");
    expect(lineSubtotal(3, "0.10")).toBe("0.30");
  });

  it("sums the order total without floating point drift", () => {
    expect(
      orderTotal([
        { cantidad: 3, precioUnitario: "0.10" },
        { cantidad: 2, precioUnitario: "89000.00" },
      ]),
    ).toBe("178000.30");
    expect(orderTotal([])).toBe("0.00");
  });

  it("formats COP with es-CO grouping and no decimals", () => {
    const out = formatCop("1250000.00").replace(/\s/g, " ");
    expect(out).toContain("1.250.000");
    expect(out).toContain("$");
    expect(out).not.toContain(",");
  });
});

describe("labels and dates", () => {
  it("labels order states in Spanish", () => {
    expect(estadoLabel("recibida")).toBe("Recibida");
    expect(estadoLabel("en_proceso")).toBe("En proceso");
    expect(estadoLabel("terminada")).toBe("Terminada");
    expect(estadoLabel("cancelada")).toBe("Cancelada");
    expect(estadoLabel("devuelta_correccion")).toBe("Devuelta");
  });

  it("marks only cancelada and terminada as final states", () => {
    expect(esEstadoFinal("cancelada")).toBe(true);
    expect(esEstadoFinal("terminada")).toBe(true);
    expect(esEstadoFinal("creada")).toBe(false);
    expect(esEstadoFinal("recibida")).toBe(false);
    expect(esEstadoFinal("en_proceso")).toBe(false);
    expect(esEstadoFinal("en_entrega")).toBe(false);
    expect(esEstadoFinal("devuelta_correccion")).toBe(false);
  });

  it("formats dates in the Bogota time zone", () => {
    expect(formatDate("2025-10-02T03:00:00.000Z")).toBe("1 de oct de 2025");
    expect(formatDate(null)).toBe("Sin fecha");
  });
});

describe("filterOrdenes", () => {
  const data = [
    orden({ id: 11, estado: "recibida", urgente: true }),
    orden({
      id: 12,
      estado: "en_proceso",
      doctor: doctor("Luis", "Gómez"),
      paciente: { id: 2, nombre: "María Núñez" },
    }),
    orden({ id: 13, estado: "terminada" }),
  ];

  it("returns everything with empty filters", () => {
    expect(filterOrdenes(data, {})).toHaveLength(3);
  });

  it("filters by estado and urgente", () => {
    expect(filterOrdenes(data, { estado: "en_proceso" }).map((o) => o.id)).toEqual([12]);
    expect(filterOrdenes(data, { urgente: true }).map((o) => o.id)).toEqual([11]);
  });

  it("searches doctor, patient and id ignoring case and accents", () => {
    expect(filterOrdenes(data, { q: "gomez" }).map((o) => o.id)).toEqual([12]);
    expect(filterOrdenes(data, { q: "NUNEZ" }).map((o) => o.id)).toEqual([12]);
    expect(filterOrdenes(data, { q: "#13" }).map((o) => o.id)).toEqual([13]);
  });

  it("combines filters", () => {
    expect(filterOrdenes(data, { estado: "recibida", urgente: true, q: "ramirez" })).toHaveLength(1);
    expect(filterOrdenes(data, { estado: "terminada", urgente: true })).toHaveLength(0);
  });
});

describe("parseOrdenFilters", () => {
  it("parses valid params and ignores invalid ones", () => {
    expect(parseOrdenFilters({ estado: "terminada", urgente: "1", q: "  ana " })).toEqual({
      estado: "terminada",
      urgente: true,
      q: "ana",
    });
    expect(parseOrdenFilters({ estado: "nope", urgente: "0" })).toEqual({
      estado: undefined,
      urgente: false,
      q: "",
    });
  });

  it("takes the first value of repeated params", () => {
    expect(parseOrdenFilters({ q: ["a", "b"] }).q).toBe("a");
  });
});

describe("filterClinicas", () => {
  const clinicas: Clinica[] = [
    { id: 1, nombre: "Sonrisa Norte", correo: null, direccion: "Calle 1 # 2-3, Bogotá", doctores: [doctor("Ana", "Ramírez")] },
    { id: 2, nombre: "Clínica Sur", correo: null, direccion: null, doctores: [] },
  ];

  it("matches name, address and doctor names", () => {
    expect(filterClinicas(clinicas, "norte").map((c) => c.id)).toEqual([1]);
    expect(filterClinicas(clinicas, "bogota").map((c) => c.id)).toEqual([1]);
    expect(filterClinicas(clinicas, "ramirez").map((c) => c.id)).toEqual([1]);
    expect(filterClinicas(clinicas, "").map((c) => c.id)).toEqual([1, 2]);
    expect(filterClinicas(clinicas, "zzz")).toEqual([]);
  });
});
