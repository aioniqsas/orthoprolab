import { esDienteValido } from '@repo/api-client/dientes'
import { ApiError, type ApiClient, type DetalleOrdenApi, type OrdenApi } from './api.js'
import { formatoOrden } from './flows.js'
import { SALUDO } from './menu.js'
import { esPalabraNumerica, numeroEnPalabras } from './numeros.js'
import { UltimaOrdenVista, type ConversationStore } from './state.js'
import { entregaDeTexto, esDelDia, fechaCorta, fechaLarga, fechaLocal, resolverDiaReferencia } from './tiempo.js'
import {
  CONFIRMAR_NO,
  CONFIRMAR_SI,
  NO_DISPONIBLE_ORDENES,
  OPCION_CANCELAR_ORDEN,
  coincidirNombre,
  nombrePresentable,
  normalizarParaCoincidir,
} from './write-flows.js'

/**
 * Conversación sobre una orden que ya existe (S1–S7): se identifica por el
 * nombre del paciente, por el número o por las dos cosas, y también por un día
 * ("la del martes"). Cada turno reinterpreta el mensaje completo contra el
 * borrador guardado, así que nada de lo ya dicho se vuelve a preguntar.
 *
 * Lo que nunca pasa por el modelo: de qué clínica son las órdenes (la sesión
 * del contacto), si se puede escribir (aquí, por estado) y cuándo se escribe
 * (solo tras un sí literal). Los cambios se muestran antes → después y se
 * mandan a `PUT /mi-clinica/ordenes/:id` con la misma forma que arma el portal.
 */

export const PASO_CAMBIO = 'cambio-orden'
export const CONFIRMAR_CAMBIO = '¿Lo dejo así? Responde sí o no.'
export const EJEMPLO_CAMBIO = 'Por ejemplo: «quita el 42 de la orden de Sara Jiménez».'
export const AYUDA_CAMBIAR =
  'Si quieres cambiar algo, dímelo con tus palabras: quitar o agregar dientes, la cantidad, el color o la fecha de entrega, o marcarla urgente.'
export const SIN_DOCUMENTO =
  'Puedo buscar una orden por el nombre del paciente, por su número o por el día en que la hiciste.'

/** Toda salida sin avance dice qué sí se entiende y trae un ejemplo, nunca "No entendí" a secas. */
export function sinAvance(entendido: string): string {
  return `${entendido}\n${EJEMPLO_CAMBIO}`
}

type Campos = Record<string, string>

/** Lo que se puede entender de un mensaje, sin depender de lo anterior. */
export interface Interpretacion {
  pacienteTexto: string
  numero: string
  dia: string | null
  quitar: string[]
  agregar: string[]
  color: string
  cantidad: string
  /** Día de ENTREGA pedido ("para el viernes"), hacia adelante; distinto de `dia` (creación, hacia atrás). */
  entrega: string | null
  urgente: boolean
}

const RE_ORDEN_NUMERO = /\b(?:orden|pedido)\s*(?:n[uú]?m\.?\s*)?#?\s*(\d{1,9})\b/i
const RE_CANTIDAD = /\bcantidad\s*(?:a|de|en|:|es)?\s*(\d{1,2})\b|\b(\d{1,2})\s*unidades?\b/i
const RE_COLOR = /\bcolor(?:\s+(?:a|en|es)\b(?=\s))?\s*:?\s*([\p{L}0-9]{1,20})/iu
const RE_QUITAR =
  /\b(quita\w*|quitar\w*|saca\w*|sacar\w*|elimina\w*|eliminar\w*|borra\w*|ya\s+no\s+(?:vamos\s+a\s+hacer(?:le)?|hay\s+que\s+hacer(?:le)?)|no\s+va\s+m[áa]s)\b/i
const RE_AGREGAR = /\b(agrega\w*|agregar\w*|a[ñn]ade\w*|a[ñn]adir\w*|suma\w*|sumar\w*|pon\w*)\b/i

/** Palabras que nunca son parte de un nombre de paciente. */
const PARAR_NOMBRE = new Set([
  'la', 'el', 'los', 'las', 'del', 'de', 'para', 'por', 'con', 'que', 'se', 'su', 'sus',
  'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'al', 'en', 'lo', 'me', 'mi', 'mis',
  'es', 'fue', 'hay', 'ya', 'no', 'vamos', 'quiero', 'quisiera', 'necesito', 'puedes',
  'orden', 'ordenes', 'pedido', 'pedidos', 'paciente', 'trabajo', 'doctor', 'doctora',
  'diente', 'dientes', 'color', 'cantidad', 'cambio', 'cambiar', 'hola', 'cuando',
  'como', 'hoy', 'ayer', 'anteayer', 'antier', 'manana', 'semana',
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
])

/** Número de orden dicho como "la orden 18", "el pedido #18" o un número solo. */
export function numeroDeOrden(texto: string): string {
  const conNombre = RE_ORDEN_NUMERO.exec(texto)
  if (conNombre?.[1]) return conNombre[1]
  const solo = /^\s*(\d{1,9})\s*$/.exec(texto)
  if (solo?.[1]) return solo[1]
  // "la orden diecisiete": el número dicho con palabras.
  const cola = /\b(?:orden|pedido)\s+(?:n[uú]mero\s+)?(.{2,40})/i.exec(texto)?.[1]
  if (cola) {
    const n = numeroEnPalabras(cola.split(/[\s,.;:!?]+/).slice(0, 4).join(' '))
    if (n !== null) return String(n)
  }
  return ''
}

/** Conectores que sí pueden ir delante del nombre ("de Sara", "del paciente Sara"). */
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'al', 'paciente'])

function nombreDeFragmento(crudo: string): string {
  const palabras = crudo
    .replace(/^[\d\s.,;:¡!¿?"'()-]+/, '')
    .split(/[\s,.;:!?]+/)
    .filter((p) => p !== '')
  const nombre: string[] = []
  for (const palabra of palabras) {
    const limpia = normalizarParaCoincidir(palabra)
    // Cualquier otra palabra funcional corta el nombre: "la orden que te hice" no es un paciente.
    if (PARAR_NOMBRE.has(limpia)) {
      if (nombre.length === 0 && CONECTORES.has(limpia)) continue
      break
    }
    if (/\d/.test(palabra)) {
      if (nombre.length === 0) continue
      break
    }
    // "diecisiete" es un número, no un paciente: se salta, y con nombre ya
    // empezado corta, igual que las cifras.
    if (esPalabraNumerica(palabra)) {
      if (nombre.length === 0) continue
      break
    }
    nombre.push(palabra)
    if (nombre.length >= 4) break
  }
  return nombre.join(' ')
}

/** Nombre del paciente en "la orden de Sara Jiménez", "la orden 18 de Sara" o "el paciente Sara". */
export function pacienteDeOrden(texto: string): string {
  const m = /\b(?:orden|pedido|paciente)\s+(?:de\s+|del\s+)?(.{2,80})/i.exec(texto)
  return m?.[1] ? nombreDeFragmento(m[1]) : ''
}

function cantidadDeTexto(texto: string): string {
  const m = RE_CANTIDAD.exec(texto)
  return m?.[1] ?? m?.[2] ?? ''
}

function colorDeTexto(texto: string): string {
  const m = RE_COLOR.exec(texto)
  const valor = m?.[1] ?? ''
  return normalizarParaCoincidir(valor) === '' || ['de', 'del', 'la', 'el', 'es', 'en'].includes(normalizarParaCoincidir(valor))
    ? ''
    : valor
}

/**
 * Dientes que se quitan y que se agregan: cada número vale como diente solo si
 * es FDI y si el marcador más cercano hacia atrás dice quitar o agregar.
 */
export function cambiosDeDientes(texto: string): { quitar: string[]; agregar: string[] } {
  const quitar = new Set<string>()
  const agregar = new Set<string>()
  const marcas: Array<{ i: number; tipo: 'quitar' | 'agregar' }> = []
  for (const m of texto.matchAll(new RegExp(RE_QUITAR.source, 'gi'))) marcas.push({ i: m.index ?? 0, tipo: 'quitar' })
  for (const m of texto.matchAll(new RegExp(RE_AGREGAR.source, 'gi'))) marcas.push({ i: m.index ?? 0, tipo: 'agregar' })
  marcas.sort((a, b) => a.i - b.i)
  const global: 'quitar' | 'agregar' | null =
    marcas.length === 1 ? marcas[0]!.tipo : marcas.length > 1 && marcas.every((m) => m.tipo === 'quitar') ? 'quitar' : null
  for (const m of texto.matchAll(/\b\d{1,2}\b/g)) {
    const numero = Number(m[0])
    if (!esDienteValido(numero)) continue
    const i = m.index ?? 0
    const previas = marcas.filter((marca) => marca.i < i)
    const tipo = previas.length > 0 ? previas[previas.length - 1]!.tipo : global
    if (tipo === 'quitar') quitar.add(String(numero))
    else if (tipo === 'agregar') agregar.add(String(numero))
  }
  return { quitar: [...quitar], agregar: [...agregar] }
}

/** Interpreta el mensaje completo, sin mirar el borrador. */
export function interpretar(texto: string, ahora: Date): Interpretacion {
  // La entrega se saca primero y se trabaja con el resto (S4): "para el
  // viernes" es entrega hacia adelante y no debe leerse como "la del viernes".
  const e = entregaDeTexto(texto, ahora)
  const numero = numeroDeOrden(e.resto)
  let limpio = numero !== '' ? e.resto.replace(RE_ORDEN_NUMERO, ' ') : e.resto
  const cantidad = cantidadDeTexto(limpio)
  if (cantidad !== '') limpio = limpio.replace(RE_CANTIDAD, ' ')
  const color = colorDeTexto(limpio)
  if (color !== '') limpio = limpio.replace(RE_COLOR, ' ')
  const { quitar, agregar } = cambiosDeDientes(limpio)
  return {
    pacienteTexto: pacienteDeOrden(e.resto),
    numero,
    dia: resolverDiaReferencia(e.resto, ahora),
    quitar,
    agregar,
    color,
    cantidad,
    entrega: e.fecha,
    urgente: e.urgente,
  }
}

function unirDientes(previo: string | undefined, nuevos: string[]): string {
  const set = new Set((previo ?? '').split(',').filter((d) => d !== ''))
  for (const d of nuevos) set.add(d)
  return [...set].join(',')
}

function sinDientes(previo: string | undefined, fuera: string[]): string {
  return (previo ?? '')
    .split(',')
    .filter((d) => d !== '' && !fuera.includes(d))
    .join(',')
}

/** Suma lo entendido al borrador: lo nuevo manda, lo anterior no se pierde. */
export function fusionar(campos: Campos, i: Interpretacion): Campos {
  const nuevo: Campos = { ...campos }
  if (i.pacienteTexto !== '') nuevo.pacienteTexto = i.pacienteTexto
  if (i.numero !== '') nuevo.numero = i.numero
  if (i.dia !== null) nuevo.dia = i.dia
  if (i.color !== '') nuevo.color = i.color
  if (i.cantidad !== '') nuevo.cantidad = i.cantidad
  if (i.entrega !== null) nuevo.entrega = i.entrega
  if (i.urgente) nuevo.urgente = '1'
  if (i.quitar.length > 0) {
    nuevo.quitar = unirDientes(nuevo.quitar, i.quitar)
    nuevo.agregar = sinDientes(nuevo.agregar, i.quitar)
  }
  if (i.agregar.length > 0) {
    nuevo.agregar = unirDientes(nuevo.agregar, i.agregar)
    nuevo.quitar = sinDientes(nuevo.quitar, i.agregar)
  }
  // Un nombre, un número o un día nuevos eligen de nuevo: las candidatas viejas ya no aplican.
  if (i.pacienteTexto !== '' || i.numero !== '' || i.dia !== null) delete nuevo.candidatas
  return nuevo
}

export function estadoNombre(orden: OrdenApi): string {
  return orden.estado?.nombre ?? 'sin estado'
}

export function nombrePaciente(orden: OrdenApi): string {
  return orden.asignacion?.paciente?.nombre ?? 'un paciente sin nombre'
}

const listaDe = (valor: string | undefined): string[] => (valor ?? '').split(',').filter((d) => d !== '')

/**
 * Si la orden admite cambios lo dice la API en `editable` (S8): la regla de la
 * ventana de gracia vive allá y el bot no la reimplementa. El respaldo por
 * estado solo cubre una API vieja que todavía no manda el campo (legado).
 */
export function esEditable(orden: OrdenApi): boolean {
  if (typeof orden.editable === 'boolean') return orden.editable
  // Legado: antes de S8 la única orden editable era la que estaba `creada`.
  const codigo = orden.estado?.codigo
  if (typeof codigo === 'string' && codigo !== '') return codigo === 'creada'
  return normalizarParaCoincidir(estadoNombre(orden)) === 'creada'
}

/** Lo que la API espera en `detalles` (CreateDetalleOrdenDto), ni un campo más. */
export interface DetallePayload {
  servicio: string
  cantidad: number
  dientes: number[]
  colorDiente: string
  observaciones?: string
}

export interface Cambios {
  quitar: string[]
  agregar: string[]
  color?: string
  cantidad?: string
  entrega?: string
  urgente?: boolean
}

export type ResultadoCambio =
  | { ok: true; despues: DetallePayload[]; avisos: string[]; entrega?: string; urgente?: boolean }
  | { ok: false; texto: string; esPregunta?: boolean }

function renderLinea(detalle: DetallePayload): string {
  const unidades = detalle.cantidad === 1 ? '1 unidad' : `${detalle.cantidad} unidades`
  const dientes = detalle.dientes.length > 0 ? `dientes ${detalle.dientes.join(' ')}` : 'sin dientes'
  return `${detalle.servicio}, ${unidades}, ${dientes}, color ${detalle.colorDiente || 'por definir'}`
}

/** Las líneas de la orden tal como están hoy, en la forma que espera la API. */
export function lineasIniciales(orden: OrdenApi): DetallePayload[] {
  return (orden.detalles ?? []).map((d: DetalleOrdenApi) => ({
    servicio: d.servicio,
    cantidad: d.cantidad,
    dientes: [...(d.dientes ?? [])],
    colorDiente: d.colorDiente ?? '',
    ...(d.observaciones ? { observaciones: d.observaciones } : {}),
  }))
}

/**
 * Calcula la orden después del cambio, sin tocar nada. Si quitar un diente deja
 * la línea sin dientes, la línea se va; si se va todo, no se escribe (el portal
 * tampoco puede guardar una orden sin líneas).
 */
export function aplicarCambios(orden: OrdenApi, cambios: Cambios): ResultadoCambio {
  const lineas: DetallePayload[] = lineasIniciales(orden)
  if (lineas.length === 0) return { ok: false, texto: `La orden ${orden.id} no tiene trabajos para cambiar.` }
  const avisos: string[] = []

  for (const diente of cambios.quitar) {
    const numero = Number(diente)
    const linea = lineas.find((l) => l.dientes.includes(numero))
    if (!linea) return { ok: false, texto: `La orden ${orden.id} no tiene el diente ${diente}.` }
    linea.dientes = linea.dientes.filter((d) => d !== numero)
    avisos.push(`quito el ${diente}`)
  }

  const conDientes = lineas.filter((l) => l.dientes.length > 0)
  if (conDientes.length === 0) {
    return { ok: false, texto: `Si quito esos dientes la orden ${orden.id} quedaría sin trabajos, y eso no lo puedo hacer por acá.` }
  }
  lineas.length = 0
  lineas.push(...conDientes)

  for (const diente of cambios.agregar) {
    const numero = Number(diente)
    if (lineas.some((l) => l.dientes.includes(numero))) {
      avisos.push(`el ${diente} ya estaba`)
      continue
    }
    lineas[0]!.dientes = [...lineas[0]!.dientes, numero].sort((a, b) => a - b)
    avisos.push(`agrego el ${diente}`)
  }

  if (cambios.color) {
    for (const linea of lineas) linea.colorDiente = cambios.color
    avisos.push(`el color queda en ${cambios.color}`)
  }

  // shortcut: la cantidad se aplica a la primera línea; una orden con varias
  // líneas y cantidades distintas se termina de ajustar desde el portal.
  if (cambios.cantidad) {
    const cantidad = Number(cambios.cantidad)
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
      return { ok: false, texto: `La cantidad ${cambios.cantidad} no me sirve para la orden ${orden.id}.` }
    }
    lineas[0]!.cantidad = cantidad
    avisos.push(`la cantidad queda en ${cantidad}`)
  }

  // Entrega y urgencia (S1, whatsapp-humano): van a nivel de orden, no de línea.
  const entregaActual = orden.fechaEntrega ? fechaLocal(new Date(orden.fechaEntrega)) : null
  const cambiaEntrega = Boolean(cambios.entrega) && cambios.entrega !== entregaActual
  const cambiaUrgente = cambios.urgente === true && orden.urgente !== true
  if (cambiaEntrega) avisos.push(`la entrega queda para el ${fechaLarga(cambios.entrega!)}`)
  if (cambiaUrgente) avisos.push('la marco urgente')

  if (lineas.some((l) => l.colorDiente.trim() === '')) {
    return {
      ok: false,
      esPregunta: true,
      texto: `Antes de guardar necesito el color del trabajo de la orden ${orden.id}. ¿De qué color es?`,
    }
  }

  const antes = JSON.stringify((lineasIniciales(orden)).map(renderLinea))
  const despues = JSON.stringify(lineas.map(renderLinea))
  if (antes === despues && !cambiaEntrega && !cambiaUrgente) return { ok: false, texto: `La orden ${orden.id} ya está así.` }
  return {
    ok: true,
    despues: lineas,
    avisos,
    ...(cambiaEntrega ? { entrega: cambios.entrega! } : {}),
    ...(cambiaUrgente ? { urgente: true } : {}),
  }
}

/** Antes → después, una frase por lado, y el pedido de confirmación. */
export function resumenCambio(orden: OrdenApi, despues: DetallePayload[], avisos: string[]): string {
  const antes = lineasIniciales(orden).map(renderLinea)
  const lineas = [
    `Orden ${orden.id} – ${nombrePaciente(orden)} (${estadoNombre(orden)})`,
  ]
  if (avisos.length > 0) lineas.push(`Voy a cambiar: ${avisos.join(', ')}.`)
  lineas.push(`Antes: ${antes.join(' / ')}`, `Después: ${despues.map(renderLinea).join(' / ')}`, '', CONFIRMAR_CAMBIO)
  return lineas.join('\n')
}

function describir(orden: OrdenApi): string {
  const entrega = orden.fechaEntrega ? `con entrega el ${fechaCorta(fechaLocal(new Date(orden.fechaEntrega)))}` : 'sin fecha de entrega'
  // El número va en la descripción: si dos pacientes se llaman igual, es lo
  // único que permite elegir sin quedar en bucle.
  return `la ${orden.id}, ${estadoNombre(orden).toLowerCase()} ${entrega}`
}

function enumerarNatural(descripciones: string[]): string {
  if (descripciones.length === 1) return `una ${descripciones[0]}`
  const ultima = descripciones[descripciones.length - 1]!
  const previas = descripciones.slice(0, -1).map((d, i) => (i === 0 ? `una ${d}` : `otra ${d}`))
  return `${previas.join(', ')} y otra ${ultima}`
}

/** Varias órdenes del mismo paciente: se pregunta por estado y fecha, sin numerar. */
export function preguntaCual(ordenes: OrdenApi[]): string {
  return `Encontré ${ordenes.length} órdenes de ${nombrePaciente(ordenes[0]!)}: ${enumerarNatural(ordenes.map(describir))}. ¿Cuál es?`
}

/** Varias órdenes de un mismo día: una por línea, con paciente y estado, sin numerar. */
export function listaDelDia(ordenes: OrdenApi[], dia: string): string {
  const lineas = ordenes.map((o) => `la ${o.id}, ${nombrePaciente(o)}, ${estadoNombre(o).toLowerCase()}, ${o.fechaEntrega ? `entrega el ${fechaCorta(fechaLocal(new Date(o.fechaEntrega)))}` : 'sin fecha de entrega'}`)
  return [
    `El ${fechaLarga(dia)} hiciste ${ordenes.length === 1 ? 'una orden' : 'varias órdenes'}:`,
    ...lineas,
    '',
    '¿Cuál te interesa? Dime el paciente, el número o el estado.',
  ].join('\n')
}

function masReciente(ordenes: OrdenApi[]): OrdenApi {
  return [...ordenes].sort((a, b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''))[0]!
}

/** De la lista que se ofreció, la que la persona nombró por paciente, número, estado o fecha. */
export function elegirCandidata(entrada: string, ordenes: OrdenApi[]): OrdenApi | null {
  const t = normalizarParaCoincidir(entrada)
  if (t === '') return null
  const elegidas = new Set<string>()
  for (const o of ordenes) if (t.includes(normalizarParaCoincidir(estadoNombre(o)))) elegidas.add(o.id)
  for (const i of coincidirNombre(entrada, ordenes.map(nombrePaciente))) elegidas.add(ordenes[i]!.id)
  for (const o of ordenes) {
    if (!o.fechaEntrega) continue
    const iso = fechaLocal(new Date(o.fechaEntrega))
    if (
      t.includes(iso) ||
      t.includes(normalizarParaCoincidir(fechaLarga(iso))) ||
      t.includes(normalizarParaCoincidir(fechaCorta(iso)))
    ) {
      elegidas.add(o.id)
    }
  }
  const numero = numeroDeOrden(entrada)
  if (numero !== '') {
    const porNumero = ordenes.find((o) => o.id === numero)
    if (porNumero) return porNumero
  }
  if (elegidas.size === 1) return ordenes.find((o) => elegidas.has(o.id)) ?? null
  if (elegidas.size > 1) return null
  if (/\b(reciente|ultima|nueva)\b/.test(t)) return masReciente(ordenes)
  if (/\b(primera|vieja|antigua|anterior)\b/.test(t)) return masReciente([...ordenes].reverse())
  return null
}

function filtrar(campos: Campos, ordenes: OrdenApi[]): OrdenApi[] {
  let lista = ordenes
  const candidatas = listaDe(campos.candidatas)
  if (candidatas.length > 0) lista = lista.filter((o) => candidatas.includes(o.id))
  if (campos.numero) lista = lista.filter((o) => o.id === campos.numero)
  if (campos.pacienteTexto) {
    const indices = coincidirNombre(campos.pacienteTexto, lista.map(nombrePaciente))
    lista = indices.map((i) => lista[i]!)
  }
  if (campos.dia) lista = lista.filter((o) => esDelDia(o.fechaCreacion, campos.dia!))
  return lista
}

/** Sin número ni nombre: se borran los dos para que la próxima respuesta elija uno solo. */
function sinIdentificar(campos: Campos): Campos {
  const resto = { ...campos }
  delete resto.numero
  delete resto.pacienteTexto
  delete resto.candidatas
  return resto
}

export class OrdenExistenteFlows {
  constructor(
    private readonly store: ConversationStore,
    private readonly api: ApiClient,
    private readonly ahora: () => Date = () => new Date(),
    private readonly ultima = new UltimaOrdenVista(),
  ) {}

  /** Un turno de conversación sobre una orden que ya existe. */
  async handle(telefono: string, texto: string): Promise<{ kind: 'text'; text: string; intencion?: string }> {
    const previo = this.store.get(telefono)
    const enFlujo = previo?.step === PASO_CAMBIO
    let campos: Campos = enFlujo ? { ...previo.fields } : {}
    const entrada = texto.trim()

    if (OPCION_CANCELAR_ORDEN.test(entrada)) {
      this.store.clear(telefono)
      return { kind: 'text', text: SALUDO, intencion: 'menu' }
    }
    if (enFlujo && CONFIRMAR_NO.test(entrada)) {
      this.store.clear(telefono)
      return { kind: 'text', text: 'Listo, no toqué la orden.', intencion: 'menu' }
    }

    campos = fusionar(campos, interpretar(entrada, this.ahora()))
    // Si acaba de ver una orden y no nombra otra, el cambio es sobre esa: un
    // humano no repite el número de lo que acaba de mirar.
    if (!enFlujo && !campos.numero && !campos.paciente && !campos.dia) {
      const recordada = this.ultima.recordada(telefono)
      if (recordada) campos = { ...campos, numero: recordada }
    }
    // El borrador se guarda en cada turno: lo que ya se dijo no se vuelve a preguntar.
    this.store.set(telefono, PASO_CAMBIO, campos)

    let ordenes: OrdenApi[]
    try {
      ordenes = await this.api.getOrdenes(telefono)
    } catch {
      this.store.clear(telefono)
      return { kind: 'text', text: NO_DISPONIBLE_ORDENES }
    }

    const discrepancia = this.discrepancia(campos, ordenes)
    if (discrepancia !== null) {
      this.store.set(telefono, PASO_CAMBIO, sinIdentificar(campos))
      return { kind: 'text', text: discrepancia }
    }

    // Sin nombre, número, día ni una elección pendiente no se adivina cuál es.
    const identifica = Boolean(campos.numero || campos.pacienteTexto || campos.dia || campos.candidatas)
    if (!identifica) return { kind: 'text', text: this.sinResultados(campos) }

    let lista = filtrar(campos, ordenes)
    if (lista.length === 0) return { kind: 'text', text: this.sinResultados(campos) }
    if (lista.length > 1) {
      const elegida = elegirCandidata(entrada, lista)
      if (!elegida) {
        this.store.set(telefono, PASO_CAMBIO, { ...campos, candidatas: lista.map((o) => o.id).join(',') })
        return { kind: 'text', text: campos.dia ? listaDelDia(lista, campos.dia) : preguntaCual(lista) }
      }
      lista = [elegida]
    }

    const orden = lista[0]!
    const base: Campos = { ...campos, ordenId: orden.id }
    delete base.candidatas
    const paciente = nombrePaciente(orden)
    const hayCambios =
      listaDe(campos.quitar).length > 0 ||
      listaDe(campos.agregar).length > 0 ||
      Boolean(campos.color) ||
      Boolean(campos.cantidad) ||
      Boolean(campos.entrega) ||
      Boolean(campos.urgente)

    if (!hayCambios) {
      this.store.set(telefono, PASO_CAMBIO, base)
      // Invitar a cambiar solo si de verdad se puede (S8: lo dice la API en
      // `editable`). Prometerlo cuando la ventana está cerrada sería mentirle.
      const cierre = esEditable(orden)
        ? AYUDA_CAMBIAR
        : 'Si hay algo que corregir, el laboratorio lo cambia desde su lado: escríbeles y lo ajustan.'
      return { kind: 'text', text: `${formatoOrden(orden)}\n\n${cierre}`, intencion: 'estado' }
    }
    if (!esEditable(orden)) {
      this.store.clear(telefono)
      return {
        kind: 'text',
        text: `La orden ${orden.id} de ${paciente} está en ${estadoNombre(orden)}, así que ya no se puede cambiar. Si hay algo que corregir, escríbele al laboratorio.`,
        // La auditoría de la API tiene un catálogo cerrado de intenciones: esta es una negativa.
        intencion: 'rechazada',
      }
    }

    const resultado = aplicarCambios(orden, {
      quitar: listaDe(campos.quitar),
      agregar: listaDe(campos.agregar),
      ...(campos.color ? { color: campos.color } : {}),
      ...(campos.cantidad ? { cantidad: campos.cantidad } : {}),
      ...(campos.entrega ? { entrega: campos.entrega } : {}),
      ...(campos.urgente ? { urgente: true } : {}),
    })
    if (!resultado.ok) {
      this.store.set(telefono, PASO_CAMBIO, base)
      return { kind: 'text', text: resultado.esPregunta === true ? resultado.texto : sinAvance(resultado.texto) }
    }
    if (!CONFIRMAR_SI.test(entrada)) {
      this.store.set(telefono, PASO_CAMBIO, base)
      return { kind: 'text', text: resumenCambio(orden, resultado.despues, resultado.avisos) }
    }

    // S1: se escribe solo aquí, después del sí literal.
    if (!/^\d{1,18}$/.test(orden.id)) {
      this.store.clear(telefono)
      return { kind: 'text', text: 'No pude identificar esa orden. Escríbele al laboratorio, por favor.' }
    }
    try {
      await this.api.actualizarOrden(telefono, orden.id, {
        detalles: resultado.despues,
        ...(resultado.entrega ? { fechaEntrega: resultado.entrega } : {}),
        ...(resultado.urgente ? { urgente: true } : {}),
      })
      this.store.clear(telefono)
      return {
        kind: 'text',
        text: [
          `Listo. La orden ${orden.id} de ${paciente} quedó así:`,
          ...resultado.despues.map(renderLinea),
          ...(resultado.entrega ? [`Entrega: ${fechaLarga(resultado.entrega)}${resultado.urgente || orden.urgente ? ' (urgente)' : ''}`] : []),
          ...(!resultado.entrega && resultado.urgente ? ['Marcada urgente.'] : []),
        ].join('\n'),
        // El catálogo de auditoría ya tiene 'orden_creada' para las escrituras de orden.
        intencion: 'orden_creada',
      }
    } catch (error) {
      this.store.set(telefono, PASO_CAMBIO, base)
      const motivo =
        error instanceof ApiError && (error.status === 403 || error.status === 409)
          ? 'la orden ya no admite cambios'
          : error instanceof ApiError && error.status === 404
            ? 'esa orden no está en tu clínica'
            : 'no fue posible guardarlo'
      return {
        kind: 'text',
        text: `No pude guardar el cambio (${motivo}). Tus datos siguen acá: responde sí para reintentar o no para descartar.`,
      }
    }
  }

  /** La pregunta en curso, para repetirla tras un audio o un "ayuda". */
  repetirPaso(_telefono: string): string {
    return `Seguimos con el cambio de la orden. ${CONFIRMAR_CAMBIO}`
  }

  /** Número y nombre juntos que no coinciden (S6): se dice antes de tocar nada. */
  private discrepancia(campos: Campos, ordenes: OrdenApi[]): string | null {
    if (!campos.numero || !campos.pacienteTexto) return null
    const porNumero = ordenes.find((o) => o.id === campos.numero)
    if (!porNumero) return null
    const nombre = nombrePresentable(campos.pacienteTexto)
    if (coincidirNombre(campos.pacienteTexto, [nombrePaciente(porNumero)]).length > 0) return null
    return `Ojo: la orden ${porNumero.id} es de ${nombrePaciente(porNumero)}, no de ${nombre}. No la toco hasta que me digas cuál: ¿la ${porNumero.id} o la de ${nombre}?`
  }

  private sinResultados(campos: Campos): string {
    if (campos.numero) return sinAvance(`No encontré la orden ${campos.numero} en tus órdenes.`)
    if (campos.dia && campos.pacienteTexto) {
      return sinAvance(`No hay órdenes de ${nombrePresentable(campos.pacienteTexto)} del ${fechaLarga(campos.dia, false)}.`)
    }
    if (campos.pacienteTexto) return sinAvance(`No encontré órdenes de ${nombrePresentable(campos.pacienteTexto)} en tu clínica.`)
    if (campos.dia) return sinAvance(`No hay órdenes de tu clínica del ${fechaLarga(campos.dia, false)}.`)
    return sinAvance(SIN_DOCUMENTO)
  }
}
