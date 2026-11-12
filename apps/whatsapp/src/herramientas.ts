import { NO_DISPONIBLE, NO_ENCONTRADO, SIN_CLINICA, type DatosBot, type Filas } from './datos.js'

/**
 * Catálogo cerrado de herramientas de lectura (IA2, S3). La IA nunca escribe
 * SQL: elige un nombre del catálogo y la capa valida los parámetros y ejecuta
 * la consulta parametrizada fijada. Ninguna herramienta acepta `clinica_id`,
 * SQL, tabla, ORDER BY ni LIMIT: todo lo que no está aquí es irrepresentable.
 */

export type NombreHerramienta =
  | 'estado_orden'
  | 'ultima_orden_doctor'
  | 'cuenta_de_cobro'
  | 'listar_doctores'
  | 'listar_servicios'

export interface Herramienta<P> {
  nombre: NombreHerramienta
  /** Texto corto para la definición de tool del proveedor (IA3). */
  descripcion: string
  sql: string
  /** Tope de filas devueltas por la capa, por encima del LIMIT en SQL. */
  tope: number
  /** Valida la entrada cruda; null => se niega la herramienta. */
  validar(entrada: unknown): P | null
}

/** Números de orden / ids bigint: solo dígitos. */
const numero = (v: unknown): string | null =>
  typeof v === 'string' && /^\d{1,18}$/.test(v) ? v : null

/** Texto corto alfanumérico (número de cuenta de cobro, varchar(20)). */
const textoCorto = (v: unknown): string | null =>
  typeof v === 'string' && /^[0-9A-Za-z-]{1,20}$/.test(v) ? v : null

const DETALLES_JSON = `COALESCE((SELECT json_agg(json_build_object(
             'servicio', dt.servicio, 'cantidad', dt.cantidad,
             'color', dt.color_diente, 'dientes', dt.dientes)
           ORDER BY dt.id)
         FROM detalle_orden dt
         WHERE dt.orden_id = o.id AND dt.eliminado_en IS NULL), '[]'::json)`

const TOPE_LISTA = 50

/** Parámetros validados: posiciónales, ya tipados por `validar`. */
export interface Parametros {
  args: unknown[]
}

export const HERRAMIENTAS: Readonly<Record<NombreHerramienta, Herramienta<Parametros>>> = {
  estado_orden: {
    nombre: 'estado_orden',
    descripcion: 'Estado, fechas, doctor, paciente (solo id) y líneas de detalle de una orden por su número.',
    tope: 1,
    sql: `SELECT o.id, e.nombre AS estado, o.fecha_creacion, o.fecha_entrega, o.urgente, o.valor,
       d.nombres || ' ' || d.apellidos AS doctor,
       o.paciente_id,
       ${DETALLES_JSON} AS detalles
FROM orden o
JOIN estado_orden e ON e.id = o.estado_id
JOIN doctor d ON d.id = o.doctor_id
JOIN paciente p ON p.id = o.paciente_id
WHERE o.id = $1`,
    validar: (entrada: unknown) => {
      const n = numero(entrada)
      return n ? { args: [n] } : null
    },
  },
  ultima_orden_doctor: {
    nombre: 'ultima_orden_doctor',
    descripcion: 'La orden más reciente (no cancelada) del doctor: servicio, cantidad y color, para precargar un pedido.',
    tope: 1,
    sql: `SELECT o.id, o.fecha_creacion,
       ${DETALLES_JSON} AS detalles
FROM orden o
JOIN estado_orden e ON e.id = o.estado_id
WHERE o.doctor_id = $1 AND e.codigo <> 'cancelada'
ORDER BY o.fecha_creacion DESC
LIMIT 1`,
    validar: (entrada: unknown) => {
      const n = numero(entrada)
      return n ? { args: [n] } : null
    },
  },
  cuenta_de_cobro: {
    nombre: 'cuenta_de_cobro',
    descripcion: 'Una cuenta de cobro por su número: fechas, estado y total.',
    tope: 1,
    sql: `SELECT cc.numero, cc.fecha_emision, cc.fecha_vencimiento, cc.estado, cc.total
FROM cuenta_cobro cc
WHERE cc.numero = $1`,
    validar: (entrada: unknown) => {
      const n = textoCorto(entrada)
      return n ? { args: [n] } : null
    },
  },
  listar_doctores: {
    nombre: 'listar_doctores',
    descripcion: 'Doctores activos de la clínica del contacto.',
    tope: TOPE_LISTA,
    sql: `SELECT d.id, d.nombres, d.apellidos
FROM doctor d
WHERE d.activo
ORDER BY d.nombres
LIMIT ${TOPE_LISTA}`,
    validar: () => ({ args: [] }),
  },
  listar_servicios: {
    nombre: 'listar_servicios',
    descripcion: 'Catálogo de servicios activos. Nunca precios.',
    tope: TOPE_LISTA,
    sql: `SELECT s.id, s.nombre, s.descripcion
FROM servicio s
WHERE s.activo
ORDER BY s.nombre
LIMIT ${TOPE_LISTA}`,
    validar: () => ({ args: [] }),
  },
} as const

/** Entrada cruda que llega del modelo (IA3) para una herramienta. */
export interface LlamadaHerramienta {
  nombre: string
  entrada: unknown
}

export type RespuestaHerramienta =
  | { ok: true; filas: Filas[] }
  | { ok: false; texto: string }

const ES_HERRAMIENTA = new Set(Object.keys(HERRAMIENTAS))

/**
 * Ejecuta una llamada del modelo contra el catálogo. El `clinicaId` SIEMPRE
 * viene del contacto verificado (identity.ts); el modelo no puede influir en
 * él porque la firma no lo recibe de la llamada.
 */
export async function ejecutarHerramienta(
  datos: DatosBot,
  clinicaId: string | undefined,
  llamada: LlamadaHerramienta,
): Promise<RespuestaHerramienta> {
  if (!datos.disponible()) return { ok: false, texto: NO_DISPONIBLE }
  if (!ES_HERRAMIENTA.has(llamada.nombre)) {
    return { ok: false, texto: 'Eso no está disponible para el bot. Puedo ayudarte con órdenes, cuentas de cobro, doctores, pacientes y servicios.' }
  }
  const herramienta = HERRAMIENTAS[llamada.nombre as NombreHerramienta]
  const params = herramienta.validar(llamada.entrada)
  if (params === null) {
    return { ok: false, texto: 'Esos datos no se entendieron bien. Revisa e intenta de nuevo.' }
  }
  if (!clinicaId) return { ok: false, texto: SIN_CLINICA }
  try {
    const filas = await datos.transaccion(clinicaId, (q) => q.query(herramienta.sql, [...params.args]))
    const recortadas = filas.slice(0, herramienta.tope)
    if (recortadas.length === 0 && herramienta.tope === 1) return { ok: false, texto: NO_ENCONTRADO }
    return { ok: true, filas: recortadas }
  } catch {
    return { ok: false, texto: NO_DISPONIBLE }
  }
}
