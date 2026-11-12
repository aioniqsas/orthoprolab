import { createHmac, randomUUID } from 'node:crypto'

/**
 * Cliente HTTP del bot hacia la API (T5). No hay dependencias: `fetch` es
 * global. La sesión se obtiene de POST /internal/whatsapp/sesion con las cuatro
 * cabeceras que exige el endpoint (S10) y se cachea hasta poco antes de
 * expirar; las rutas de lectura viven bajo /mi-clinica/*.
 */

export const SESSION_PATH = '/internal/whatsapp/sesion'

export const NO_HABILITADO =
  'Este número no está habilitado para usar el bot. Escríbele al laboratorio para que te vincule.'
export const LIMITE =
  'Estás enviando muchas solicitudes. Espera un momento y vuelve a intentarlo.'
export const NO_DISPONIBLE =
  'El servicio no está disponible en este momento. Vuelve a intentarlo en un rato.'

const CONFIG_FALTANTE =
  'El bot de WhatsApp no está configurado todavía. Mientras tanto, contacta al laboratorio por el portal o por teléfono.'

/** Texto corto y no revelador para cada estado de la API (S1). */
export function textoPorEstado(status: number): string {
  if (status === 401 || status === 403 || status === 409) return NO_HABILITADO
  if (status === 429) return LIMITE
  if (status === 503) return NO_DISPONIBLE
  return NO_DISPONIBLE
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface CabecerasFirma {
  'X-Whatsapp-Service-Token': string
  'X-Whatsapp-Timestamp': string
  'X-Whatsapp-Nonce': string
  'X-Whatsapp-Signature': string
}

/** HMAC-SHA256 de `telefono|timestamp|nonce` con WHATSAPP_HMAC_SECRET (S10.2). */
export function cabecerasFirma(
  telefono: string,
  serviceToken: string,
  hmacSecret: string,
  ahoraSegundos: number,
  nonce: string = randomUUID(),
): CabecerasFirma {
  const timestamp = String(Math.floor(ahoraSegundos))
  const signature = createHmac('sha256', hmacSecret)
    .update(`${telefono}|${timestamp}|${nonce}`)
    .digest('hex')
  return {
    'X-Whatsapp-Service-Token': serviceToken,
    'X-Whatsapp-Timestamp': timestamp,
    'X-Whatsapp-Nonce': nonce,
    'X-Whatsapp-Signature': signature,
  }
}

export interface SesionBot {
  token: string
  clinicaId: string
  doctorId: string | null
}

export interface OrdenApi {
  id: string
  estado?: { nombre?: string } | null
  fechaEntrega: string | null
  asignacion?: {
    doctor?: { nombres?: string; apellidos?: string } | null
    paciente?: { nombre?: string } | null
  } | null
  detalles: Array<{
    servicio: string
    cantidad: number
    dientes: number[]
    colorDiente?: string | null
  }>
}

export interface CuentaCobroApi {
  numero: string
  fechaEmision?: string | null
  total?: string | number | null
  pdfUrl?: string | null
}

export const PDF_MIME = 'application/pdf'

/** Tope de tamaño del PDF descargado (unos pocos MB). */
export const PDF_CAP_BYTES = 5 * 1024 * 1024

/**
 * Allowlist de hosts de los que el bot puede descargar un PDF (Cloudinary es
 * el almacenamiento actual). Viene de WHATSAPP_PDF_HOSTS (separada por
 * comas); el valor documentado por defecto es res.cloudinary.com.
 */
export function hostsPdfPermitidos(): string[] {
  const crudos = (process.env.WHATSAPP_PDF_HOSTS ?? 'res.cloudinary.com').split(',')
  return crudos.map((h) => h.trim().toLowerCase()).filter((h) => h !== '')
}

/**
 * Decisión pura sobre una URL de PDF (T5, ronda adversarial): solo https,
 * solo el host en la allowlist, y nunca un host privado/loopback/link-local
 * ni un dominio interno. Solo se registran errores, nunca la URL completa.
 */
export function urlPdfPermitida(url: string, hosts: string[] = hostsPdfPermitidos()): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  if (!hosts.includes(host)) return false
  if (
    host === 'localhost' ||
    host.endsWith('.internal') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '::1' ||
    host === '[::1]'
  ) {
    return false
  }
  return true
}

/**
 * Forma canónica de un número colombiano para usarlo como clave de caché
 * (ronda adversarial de T5): misma regla que normalizeTelefono de la API —
 * "+57" + 10 dígitos nacionales. Acepta el JID crudo de Baileys, el prefijo
 * internacional "00", un "57" opcional y separadores. Lanza si no puede
 * canonicalizarse: mejor rechazar que cachear basura.
 */
export function telefonoCanonical(value: string): string {
  let base = value
  const arroba = base.indexOf('@')
  if (arroba !== -1) {
    const sufijo = base.slice(arroba)
    if (!['@s.whatsapp.net', '@c.us', '@g.us', '@broadcast'].includes(sufijo)) {
      throw new ApiError(400, 'teléfono inválido')
    }
    base = base.slice(0, arroba)
  }
  base = base.replace(/:\d+$/, '')
  let digits = base.replace(/[\s.()\-]/g, '').replace(/^\+/, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (!/^\d+$/.test(digits) || digits.length < 10) {
    throw new ApiError(400, 'teléfono inválido')
  }
  if (digits.length > 10) {
    const country = digits.slice(0, -10)
    if (country !== '57') throw new ApiError(400, 'teléfono inválido')
    digits = digits.slice(-10)
  }
  return `+57${digits}`
}

/** Error cuando la URL del PDF no pasó la verificación de SSRF. */
export class UrlRechazadaError extends Error {
  constructor(message = 'La URL del PDF no está permitida.') {
    super(message)
    this.name = 'UrlRechazadaError'
  }
}

/** Margen antes de la expiración en que se pide una sesión nueva. */
export const TOKEN_MARGEN_MS = 30_000

export class ApiClient {
  private readonly tokens = new Map<string, { sesion: SesionBot; expiresAt: number }>()

  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3003',
    private readonly serviceToken = process.env.WHATSAPP_SERVICE_TOKEN,
    private readonly hmacSecret = process.env.WHATSAPP_HMAC_SECRET,
    private readonly ahora = () => Date.now(),
  ) {}

  /** Mensaje si falta alguna variable obligatoria; undefined si todo está. */
  mensajeConfigFaltante(): string | undefined {
    return !this.serviceToken || !this.hmacSecret ? CONFIG_FALTANTE : undefined
  }

  async sesion(telefonoRaw: string): Promise<SesionBot> {
    const telefono = telefonoCanonical(telefonoRaw)
    const cache = this.tokens.get(telefono)
    if (cache && cache.expiresAt > this.ahora()) return cache.sesion
    if (!this.serviceToken || !this.hmacSecret) {
      throw new ApiError(503, CONFIG_FALTANTE)
    }
    const cabeceras = cabecerasFirma(
      telefono,
      this.serviceToken,
      this.hmacSecret,
      this.ahora() / 1000,
    )
    const res = await this.fetchFn(`${this.baseUrl}${SESSION_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...cabeceras },
      body: JSON.stringify({ telefono }),
    })
    if (!res.ok) throw new ApiError(res.status, 'sesion rechazada')
    const cuerpo = (await res.json()) as {
      accessToken: string
      expiresIn: number
      clinicaId: string
      doctorId: string | null
    }
    const sesion: SesionBot = {
      token: cuerpo.accessToken,
      clinicaId: cuerpo.clinicaId,
      doctorId: cuerpo.doctorId,
    }
    this.tokens.set(telefono, {
      sesion,
      expiresAt: this.ahora() + Math.max(cuerpo.expiresIn * 1000 - TOKEN_MARGEN_MS, 0),
    })
    return sesion
  }

  /** GET autenticado bajo /mi-clinica; reintenta una vez si el token venció. */
  private async getJson(telefono: string, path: string, reintento = true): Promise<unknown> {
    const sesion = await this.sesion(telefono)
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      headers: { authorization: `Bearer ${sesion.token}` },
    })
    if (res.status === 401 && reintento) {
      this.tokens.delete(telefonoCanonical(telefono))
      return this.getJson(telefono, path, false)
    }
    if (!res.ok) throw new ApiError(res.status, `${path} falló`)
    return res.json()
  }

  /** PDF autenticado bajo /mi-clinica (control de trabajos). */
  async pdfControlTrabajos(telefono: string, ordenId: string): Promise<Buffer> {
    const sesion = await this.sesion(telefono)
    const res = await this.fetchFn(
      `${this.baseUrl}/mi-clinica/ordenes/${encodeURIComponent(ordenId)}/control-trabajos`,
      { headers: { authorization: `Bearer ${sesion.token}` } },
    )
    if (!res.ok) throw new ApiError(res.status, 'control-trabajos falló')
    return Buffer.from(await res.arrayBuffer())
  }

  async getOrden(telefono: string, ordenId: string): Promise<OrdenApi> {
    return (await this.getJson(
      telefono,
      `/mi-clinica/ordenes/${encodeURIComponent(ordenId)}`,
    )) as OrdenApi
  }

  async getCuentaCobro(telefono: string, cuentaId: string): Promise<CuentaCobroApi> {
    return (await this.getJson(
      telefono,
      `/mi-clinica/cuentas-cobro/${encodeURIComponent(cuentaId)}`,
    )) as CuentaCobroApi
  }

  /**
   * Descarga el PDF ya alojado (pdfUrl de la cuenta de cobro). Sin auth,
   * pero con verificación anti-SSRF (T5, ronda adversarial): la URL debe
   * pasar urlPdfPermitida, la respuesta debe ser application/pdf y el cuerpo
   * se trunca/rechaza al tope PDF_CAP_BYTES. Nunca se devuelve bytes parciales.
   */
  async descargarPdf(url: string): Promise<Buffer> {
    if (!urlPdfPermitida(url)) {
      const host = (() => {
        try {
          return new URL(url).hostname
        } catch {
          return 'invalida'
        }
      })()
      console.warn(`[whatsapp] PDF descartado: host no permitido (${host})`)
      throw new UrlRechazadaError()
    }
    const res = await this.fetchFn(url)
    if (!res.ok) throw new ApiError(res.status, 'pdf no disponible')
    const tipo = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    if (tipo !== PDF_MIME) throw new UrlRechazadaError('El archivo no es un PDF.')
    const declarado = Number(res.headers.get('content-length') ?? Number.MAX_SAFE_INTEGER)
    if (declarado > PDF_CAP_BYTES) throw new UrlRechazadaError('El PDF excede el tamaño permitido.')
    // Lectura con tope real: aborta si el cuerpo supera el límite.
    if (!res.body) throw new UrlRechazadaError('Respuesta sin cuerpo.')
    const lector = res.body.getReader()
    const trozos: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      total += value.byteLength
      if (total > PDF_CAP_BYTES) {
        await lector.cancel()
        throw new UrlRechazadaError('El PDF excede el tamaño permitido.')
      }
      trozos.push(value)
    }
    return Buffer.concat(trozos.map((t) => Buffer.from(t)))
  }

  /** POST autenticado bajo /mi-clinica; reintenta una vez si el token venció. */
  private async postJson(
    telefono: string,
    path: string,
    body: unknown,
    reintento = true,
  ): Promise<unknown> {
    const sesion = await this.sesion(telefono)
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify(body),
    })
    if (res.status === 401 && reintento) {
      this.tokens.delete(telefonoCanonical(telefono))
      return this.postJson(telefono, path, body, false)
    }
    if (!res.ok) throw new ApiError(res.status, `${path} falló`)
    return res.json()
  }

  async getDoctores(telefono: string): Promise<DoctorApi[]> {
    return (await this.getJson(telefono, '/mi-clinica/doctores')) as DoctorApi[]
  }

  /** Pacientes del doctor: GET /mi-clinica/pacientes?doctorId=:id (la API no
   *  expone /mi-clinica/doctores/:id/pacientes). */
  async getPacientes(telefono: string, doctorId: string): Promise<PacienteApi[]> {
    const crudos = (await this.getJson(
      telefono,
      `/mi-clinica/pacientes?doctorId=${encodeURIComponent(doctorId)}`,
    )) as Array<{ paciente?: PacienteApi } | PacienteApi>
    return crudos.map((fila) => ('paciente' in fila && fila.paciente ? fila.paciente : (fila as PacienteApi)))
  }

  async crearPaciente(telefono: string, cedula: string, nombre: string): Promise<PacienteApi> {
    return (await this.postJson(telefono, '/mi-clinica/pacientes', { cedula, nombre })) as PacienteApi
  }

  async getServicios(telefono: string): Promise<ServicioApi[]> {
    return (await this.getJson(telefono, '/mi-clinica/servicios')) as ServicioApi[]
  }

  async crearOrden(telefono: string, payload: NuevaOrdenPayload): Promise<OrdenApi> {
    return (await this.postJson(telefono, '/mi-clinica/ordenes', payload)) as OrdenApi
  }
}

export interface DoctorApi {
  id: string
  nombres: string
  apellidos: string
  activo?: boolean
}

export interface PacienteApi {
  id: string
  nombre: string
  cedula?: string | null
}

export interface ServicioApi {
  id: string
  nombre: string
}

/** Cuerpo de POST /mi-clinica/ordenes (CreateOrdenDto de la API). */
export interface NuevaOrdenPayload {
  doctorId: string
  pacienteId?: number
  detalles: Array<{
    servicio: string
    cantidad: number
    dientes: number[]
    colorDiente: string
    observaciones?: string
  }>
}

export function crearCliente(): ApiClient {
  return new ApiClient()
}

// Métodos del flujo de escritura (T6): lectura de doctores/pacientes/servicios
// y la escritura final, siempre bajo /mi-clinica con la sesión del contacto.
