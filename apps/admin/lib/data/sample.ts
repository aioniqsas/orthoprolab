/**
 * SAMPLE DATA. Every name, address, e-mail and amount below is fictional.
 * Do not present any of it as real. Consumed only by `repository.ts`.
 */
import { maskCedula } from "./gestion";
import { normalizeText, orderTotal } from "./helpers";
import type {
  Clinica,
  DetalleOrden,
  Doctor,
  EstadoOrden,
  HistorialEstado,
  Orden,
  Paciente,
  UsuarioDetalle,
} from "./types";

const doctor = (
  n: number,
  nombres: string,
  apellidos: string,
  clinicaId: string,
): Doctor => ({
  id: String(n),
  nombres,
  apellidos,
  correo: `${normalizeText(nombres.split(" ")[0]!)}.${n}@ejemplo.test`,
  clinicaId,
  activo: true,
});

const DOCTORES: Doctor[] = [
  doctor(1, "Camila", "Restrepo Ejemplo", "1"),
  doctor(2, "Andrés", "Villamizar Muestra", "1"),
  doctor(3, "Lucía", "Quintero Prueba", "2"),
  doctor(4, "Julián", "Moncada Ficticio", "3"),
  doctor(5, "Valentina", "Arboleda Demo", "3"),
  doctor(6, "Sebastián", "Pineda Ejemplo", "4"),
  doctor(7, "Mariana", "Cardona Muestra", "5"),
];

const doctorAt = (i: number): Doctor => DOCTORES[i]!;

export const SAMPLE_CLINICAS: Clinica[] = [
  { id: 1, nombre: "Clínica Dental Aurora (ejemplo)", correo: "aurora@ejemplo.test", direccion: "Calle 100 # 00-00, Bogotá", doctores: [doctorAt(0), doctorAt(1)] },
  { id: 2, nombre: "Odontología Montaña Verde (ejemplo)", correo: null, direccion: "Carrera 00 # 00-00, Medellín", doctores: [doctorAt(2)] },
  { id: 3, nombre: "Centro Sonrisa del Valle (ejemplo)", correo: "sonrisa@ejemplo.test", direccion: "Avenida 0 # 00-00, Cali", doctores: [doctorAt(3), doctorAt(4)] },
  { id: 4, nombre: "Consultorio Brisa Caribe (ejemplo)", correo: null, direccion: "Calle 00 # 0-00, Barranquilla", doctores: [doctorAt(5)] },
  { id: 5, nombre: "Estudio Odontológico Andino (ejemplo)", correo: "andino@ejemplo.test", direccion: null, doctores: [doctorAt(6)] },
  { id: 6, nombre: "Clínica Nueva sin doctores (ejemplo)", correo: null, direccion: "Carrera 0 # 00-00, Bucaramanga", doctores: [] },
];

const PRECIOS = {
  corona: ["Corona de zirconio", "850000.00"],
  carilla: ["Carilla de porcelana", "620000.00"],
  modelo: ["Modelo de estudio", "95000.00"],
  ferula: ["Férula de descarga", "380000.00"],
  puente: ["Puente de 3 unidades", "2100000.00"],
  parcial: ["Prótesis parcial acrílica", "760000.00"],
  guia: ["Guía quirúrgica", "540000.00"],
} as const;

type Linea = [keyof typeof PRECIOS, number, string?];

function detalles(lineas: Linea[], base: number): DetalleOrden[] {
  return lineas.map(([key, cantidad, observaciones], i) => ({
    id: base * 10 + i + 1,
    servicio: PRECIOS[key][0],
    cantidad,
    precioUnitario: PRECIOS[key][1],
    dientes: [],
    observaciones: observaciones ?? null,
  }));
}

const STEPS: EstadoOrden[] = ["creada", "recibida", "en_proceso", "terminada"];

function historial(id: number, estado: EstadoOrden, creada: string): HistorialEstado[] {
  const start = new Date(creada).getTime();
  return STEPS.slice(0, STEPS.indexOf(estado) + 1).map((nuevo, i) => ({
    id: id * 10 + i + 1,
    estadoAnterior: i === 0 ? null : STEPS[i - 1]!,
    estadoNuevo: nuevo,
    usuario: i === 0 ? "Recepción de ejemplo" : "Administrador de ejemplo",
    fechaCambio: new Date(start + i * 36 * 3600 * 1000).toISOString(),
    observaciones:
      i === 0 ? "Orden recibida con modelos digitales." : i === 1 ? "Inicia fabricación." : "Control final aprobado.",
  }));
}

function orden(
  id: number,
  doctorIdx: number,
  paciente: Paciente,
  estado: EstadoOrden,
  urgente: boolean,
  creada: string,
  entrega: string | null,
  lineas: Linea[],
): Orden {
  const items = detalles(lineas, id);
  return {
    id,
    doctor: doctorAt(doctorIdx),
    paciente,
    estado,
    estadoDbId: "0", // placeholder — sample data only, never used when SAMPLE_DATA is false
    valor: orderTotal(items),
    urgente,
    fechaCreacion: creada,
    fechaEntrega: entrega,
    detalles: items,
    historial: historial(id, estado, creada),
  };
}

const P = (id: number, nombre: string): Paciente => ({ id, nombre });

export const SAMPLE_ORDENES: Orden[] = [
  orden(1001, 0, P(1, "Paciente Ejemplo Uno"), "recibida", true, "2025-10-15T14:00:00.000Z", "2025-10-18T20:00:00.000Z", [["corona", 2, "Color A2, preparación en 26 y 27."]]),
  orden(1002, 2, P(2, "Paciente Ejemplo Dos"), "en_proceso", false, "2025-10-13T15:30:00.000Z", "2025-10-20T20:00:00.000Z", [["carilla", 4], ["modelo", 1]]),
  orden(1003, 3, P(3, "Paciente Ejemplo Tres"), "terminada", false, "2025-10-06T13:10:00.000Z", "2025-10-12T20:00:00.000Z", [["puente", 1, "Estructura en zirconio, color B1."]]),
  orden(1004, 1, P(4, "Paciente Ejemplo Cuatro"), "en_proceso", true, "2025-10-16T16:45:00.000Z", "2025-10-19T20:00:00.000Z", [["ferula", 1]]),
  orden(1005, 5, P(5, "Paciente Ejemplo Cinco"), "recibida", false, "2025-10-17T12:20:00.000Z", "2025-10-24T20:00:00.000Z", [["parcial", 1, "Ganchos en piezas 34 y 44."], ["modelo", 2]]),
  orden(1006, 4, P(6, "Paciente Ejemplo Seis"), "terminada", false, "2025-10-02T18:00:00.000Z", "2025-10-09T20:00:00.000Z", [["guia", 1]]),
  orden(1007, 6, P(7, "Paciente Ejemplo Siete"), "recibida", false, "2025-10-18T15:00:00.000Z", null, [["corona", 1]]),
  orden(1008, 0, P(8, "Paciente Ejemplo Ocho"), "en_proceso", false, "2025-10-14T17:00:00.000Z", "2025-10-21T20:00:00.000Z", [["corona", 3], ["modelo", 1]]),
  orden(1009, 2, P(9, "Paciente Ejemplo Nueve"), "terminada", true, "2025-10-08T14:30:00.000Z", "2025-10-10T20:00:00.000Z", [["ferula", 2]]),
  orden(1010, 3, P(10, "Paciente Ejemplo Diez"), "en_proceso", false, "2025-10-12T19:00:00.000Z", "2025-10-22T20:00:00.000Z", [["carilla", 2]]),
];

const uid = (n: number) => `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`;
const clinicaPorId = new Map(SAMPLE_CLINICAS.map((c) => [c.id, c.nombre]));

/** Fictional cedulas: they exist only to demonstrate masking, never stored in `Usuario`. */
const CEDULAS_FICTICIAS = ["1000000101", "1000000202", "1000000303", "1000000404"];

const base = (
  n: number,
  nombres: string,
  apellidos: string,
  rol: UsuarioDetalle["rol"],
  activo = true,
): UsuarioDetalle => ({
  id: uid(n),
  nombres,
  apellidos,
  correo: `${normalizeText(nombres.split(" ")[0]!)}.${n}@ejemplo.test`,
  rol,
  activo,
  cedulaEnmascarada: maskCedula(CEDULAS_FICTICIAS[n % CEDULAS_FICTICIAS.length]! + String(n)),
  clinica: null,
  doctoresAsignados: [],
});

const CLINICA_USUARIOS: UsuarioDetalle[] = SAMPLE_CLINICAS.filter((c) => c.doctores.length > 0).map((c) => ({
  ...base(100 + c.id, c.nombre.split(" ")[0]!, "Administrador", "clinica"),
  id: uid(100 + c.id),
  correo: c.correo ?? `clinica${c.id}@ejemplo.test`,
  cedulaEnmascarada: maskCedula(`100000000${c.id}`),
  clinica: { id: c.id, nombre: c.nombre },
  doctoresAsignados: [],
}));

export const SAMPLE_USUARIOS: UsuarioDetalle[] = [
  base(1, "Administrador", "Ejemplo Uno", "administrador"),
  base(2, "Administradora", "Ejemplo Dos", "administrador", false),
  ...CLINICA_USUARIOS,
];

