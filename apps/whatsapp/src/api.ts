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

  async sesion(telefono: string): Promise<SesionBot> {
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
      this.tokens.delete(telefono)
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

  /** Descarga el PDF ya alojado (pdfUrl de la cuenta de cobro). Sin auth. */
  async descargarPdf(url: string): Promise<Buffer> {
    const res = await this.fetchFn(url)
    if (!res.ok) throw new ApiError(res.status, 'pdf no disponible')
    return Buffer.from(await res.arrayBuffer())
  }
}

export function crearCliente(): ApiClient {
  return new ApiClient()
}
