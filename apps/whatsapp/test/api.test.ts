import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  ApiClient,
  ApiError,
  cabecerasFirma,
  NO_HABILITADO,
  SESSION_PATH,
  textoPorEstado,
  urlPdfPermitida,
} from '../src/api.js'
import { jidToPhone, resolveIdentity } from '../src/identity.js'

interface Llamada {
  url: string
  init?: RequestInit
}

function falsoFetch(respuestas: Array<{ status: number; body?: unknown }>): {
  fetchFn: typeof fetch
  llamadas: Llamada[]
} {
  const llamadas: Llamada[] = []
  let i = 0
  const fetchFn = (async (url: RequestInfo | URL, init?: RequestInit) => {
    llamadas.push({ url: String(url), init })
    const r = respuestas[Math.min(i, respuestas.length - 1)]!
    i += 1
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  return { fetchFn, llamadas }
}

const BASE = 'http://api.test'
const SESION = { accessToken: 'jwt', expiresIn: 900, clinicaId: '7', doctorId: null }

function cliente(
  respuestas: Parameters<typeof falsoFetch>[0],
  ahora = () => 1_000_000,
): { client: ApiClient; llamadas: Llamada[] } {
  const { fetchFn, llamadas } = falsoFetch(respuestas)
  return {
    client: new ApiClient(fetchFn, BASE, 'token-servicio', 'secreto-hmac', ahora),
    llamadas,
  }
}

describe('ApiClient.getPacientes', () => {
  it('mapea las filas de paciente-doctor a pacientes y usa ?doctorId=', async () => {
    const { client, llamadas } = cliente([
      { status: 200, body: SESION },
      { status: 200, body: [{ id: '1', paciente: { id: '7', nombre: 'Luis', cedula: null } }] },
    ])
    const pacientes = await client.getPacientes('+573001234567', 'doc-1')
    expect(pacientes).toEqual([{ id: '7', nombre: 'Luis', cedula: null }])
    expect(llamadas[1]!.url).toBe(`${BASE}/mi-clinica/pacientes?doctorId=doc-1`)
  })
})

describe('urlPdfPermitida (SSRF: allowlist + hosts privados)', () => {
  it('acepta https del host Cloudinary permitido', () => {
    expect(urlPdfPermitida('https://res.cloudinary.com/demo/cuenta.pdf')).toBe(true)
  })

  it('rechaza http y hosts desconocidos', () => {
    expect(urlPdfPermitida('http://res.cloudinary.com/demo/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://evil.test/cuenta.pdf')).toBe(false)
  })

  it('rechaza hosts privados, de loopback, link-local e internos', () => {
    expect(urlPdfPermitida('https://localhost/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://127.0.0.1/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://10.0.0.5/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://172.16.3.4/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://172.31.9.9/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://192.168.1.1/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://169.254.169.254/latest/meta-data')).toBe(false)
    expect(urlPdfPermitida('https://[::1]/cuenta.pdf')).toBe(false)
    expect(urlPdfPermitida('https://api.internal/cuenta.pdf')).toBe(false)
  })
})

describe('cabeceras de firma', () => {
  it('firma HMAC-SHA256 de telefono|timestamp|nonce con el secreto HMAC', () => {
    const h = cabecerasFirma('+573001234567', 'tok', 'sec', 1_700_000_000, 'nonce-de-prueba-01')
    expect(h['X-Whatsapp-Service-Token']).toBe('tok')
    expect(h['X-Whatsapp-Timestamp']).toBe('1700000000')
    expect(h['X-Whatsapp-Nonce']).toBe('nonce-de-prueba-01')
    const esperada = createHmac('sha256', 'sec').update('+573001234567|1700000000|nonce-de-prueba-01').digest('hex')
    expect(h['X-Whatsapp-Signature']).toBe(esperada)
  })
})

describe('sesión del bot', () => {

  it('envía el teléfono y las cuatro cabeceras al endpoint interno', async () => {
    const { client, llamadas } = cliente([{ status: 200, body: SESION }])
    const sesion = await client.sesion('+573001234567')
    expect(sesion.token).toBe('jwt')
    expect(llamadas).toHaveLength(1)
    const init = llamadas[0]!.init as RequestInit
    expect(llamadas[0]!.url).toBe(`${BASE}${SESSION_PATH}`)
    expect((init.method as string)).toBe('POST')
    expect((init.body as string)).toContain('+573001234567')
    const headers = init.headers as Record<string, string>
    expect(headers['X-Whatsapp-Service-Token']).toBe('token-servicio')
    expect(headers['X-Whatsapp-Timestamp']).toMatch(/^\d+$/)
    expect(headers['X-Whatsapp-Nonce']).toMatch(/^[A-Za-z0-9_-]{16,40}$/)
    expect(headers['X-Whatsapp-Signature']).toMatch(/^[0-9a-f]{64}$/)
  })

  it('reutiliza la sesión hasta poco antes de expirar y refetch después', async () => {
    let ahora = 1_000_000
    const { client, llamadas } = cliente([{ status: 200, body: SESION }], () => ahora)
    await client.sesion('+573001234567')
    await client.sesion('+573001234567')
    expect(llamadas).toHaveLength(1)
    // expiresIn 900 s menos margen de 30 s: 860 s después sigue en caché.
    ahora += 860_000
    await client.sesion('+573001234567')
    expect(llamadas).toHaveLength(1)
    // Al entrar en la ventana de margen (870 s) se pide una sesión nueva.
    ahora += 11_000
    await client.sesion('+573001234567')
    expect(llamadas).toHaveLength(2)
  })

  it('cachea por teléfono: otro número pide su propia sesión', async () => {
    const { client, llamadas } = cliente([{ status: 200, body: SESION }])
    await client.sesion('+573001234567')
    await client.sesion('+573001234568')
    expect(llamadas).toHaveLength(2)
  })
})

describe('mapeo de estados a respuestas', () => {
  it('usa el mismo texto para no registrado y bloqueado (S1)', () => {
    expect(textoPorEstado(401)).toBe(NO_HABILITADO)
    expect(textoPorEstado(403)).toBe(NO_HABILITADO)
  })

  it('un 409 no dice "no habilitado": ese número sí está autorizado', () => {
    expect(textoPorEstado(409)).not.toBe(NO_HABILITADO)
    expect(textoPorEstado(409)).toContain('configurar')
  })

  it('distingue límite y servicio no disponible', () => {
    expect(textoPorEstado(429)).not.toBe(NO_HABILITADO)
    expect(textoPorEstado(503)).not.toBe(NO_HABILITADO)
  })
})

describe('normalización de JID', () => {
  it('quita dominio y id de dispositivo', () => {
    expect(jidToPhone('573001234567:12@s.whatsapp.net')).toBe('573001234567')
    expect(jidToPhone('573001234567@s.whatsapp.net')).toBe('573001234567')
  })

  it('rechaza JIDs que no son teléfono', async () => {
    const { client } = cliente([])
    const r = await resolveIdentity('abc123@lid', client)
    expect(r.ok).toBe(false)
  })
})

describe('resolveIdentity', () => {
  it('devuelve la identidad de la clínica cuando la API emite sesión', async () => {
    const { client } = cliente([{ status: 200, body: { ...SESION, doctorId: '3' } }])
    const r = await resolveIdentity('573001234567@s.whatsapp.net', client)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.identidad).toEqual({ clinicId: '7', doctorId: '3' })
  })

  it('rechaza con texto corto y no revelador cuando la API rechaza', async () => {
    for (const status of [401, 403]) {
      const { client } = cliente([{ status }])
      const r = await resolveIdentity('573001234567@s.whatsapp.net', client)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.reply).toBe(NO_HABILITADO)
    }
  })

  it('un 409 pide terminar la configuración, sin mentirle a la persona', async () => {
    const { client } = cliente([{ status: 409 }])
    const r = await resolveIdentity('573001234567@s.whatsapp.net', client)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reply).toContain('configurar')
  })

  it('503 de la API se traduce a un aviso sencillo de indisponibilidad', async () => {
    const { client } = cliente([{ status: 503 }])
    const r = await resolveIdentity('573001234567@s.whatsapp.net', client)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reply).toContain('no pude consultar')
  })

  it('fallo de red responde sin exponer detalles', async () => {
    const client = new ApiClient((async () => {
      throw new Error('down')
    }) as unknown as typeof fetch, BASE, 't', 's')
    const r = await resolveIdentity('573001234567@s.whatsapp.net', client)
    expect(r.ok).toBe(false)
  })
})

describe('clave de caché canónica', () => {
  it('dos representaciones del mismo número comparten una entrada de caché', async () => {
    const { client, llamadas } = cliente([{ status: 200, body: SESION }])
    await client.sesion('+573001234567')
    await client.sesion('3001234567')
    expect(llamadas).toHaveLength(1)
  })

  it('rechaza un número que no puede canonicalizarse', async () => {
    const { client } = cliente([{ status: 200, body: SESION }])
    await expect(client.sesion('abc')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('cliente sin configuración', () => {
  // Bun carga el .env local, así que sin aislar el entorno este test pasaría o
  // fallaría según la máquina del operador y no según el código.
  let guardado: { token?: string; hmac?: string } = {}
  beforeEach(() => {
    guardado = {
      token: process.env.WHATSAPP_SERVICE_TOKEN,
      hmac: process.env.WHATSAPP_HMAC_SECRET,
    }
    delete process.env.WHATSAPP_SERVICE_TOKEN
    delete process.env.WHATSAPP_HMAC_SECRET
  })
  afterEach(() => {
    for (const [clave, valor] of [
      ['WHATSAPP_SERVICE_TOKEN', guardado.token],
      ['WHATSAPP_HMAC_SECRET', guardado.hmac],
    ] as const) {
      if (valor === undefined) delete process.env[clave]
      else process.env[clave] = valor
    }
  })

  it('informa que el bot no está configurado sin crashear', () => {
    const sinConfig = new ApiClient(falsoFetch([]).fetchFn, BASE)
    expect(sinConfig.mensajeConfigFaltante()).toContain('no está configurado')
  })
})

describe('rutas de lectura', () => {
  it('getOrden llama /mi-clinica con el token', async () => {
    const orden = { id: '12', estado: { nombre: 'Producción' }, fechaEntrega: null, detalles: [] }
    const { client, llamadas } = cliente([{ status: 200, body: SESION }, { status: 200, body: orden }])
    const r = await client.getOrden('+573001234567', '12')
    expect(r.id).toBe('12')
    expect(llamadas[1]!.url).toContain("/mi-clinica/ordenes/12")
    expect((llamadas[1]!.init as RequestInit).headers).toEqual({ cookie: 'auth_token=jwt' })
  })

  it('un 401 a mitad de flujo refresca el token y reintenta una vez', async () => {
    const orden = { id: '12', detalles: [] }
    const { client, llamadas } = cliente([
      { status: 200, body: SESION },
      { status: 401 },
      { status: 200, body: SESION },
      { status: 200, body: orden },
    ])
    await client.sesion('+573001234567')
    const r = await client.getOrden('+573001234567', '12')
    expect(r.id).toBe('12')
    expect(llamadas).toHaveLength(4)
  })

  it('pdfControlTrabajos devuelve el PDF como Buffer', async () => {
    const { fetchFn, llamadas } = falsoFetch([
      { status: 200, body: SESION },
      { status: 200, body: { __binario: 'pdf' } },
    ])
    // Sobrescribimos json() vía un Response real de bytes: usamos arrayBuffer.
    const fetchBytes = (async (url: RequestInfo | URL, init?: RequestInit) => {
      llamadas.push({ url: String(url), init })
      const status = llamadas.length === 1 ? 200 : 200
      void status
      const bytes = llamadas.length === 1 ? JSON.stringify(SESION) : new Uint8Array([0x25, 0x50, 0x44, 0x46])
      return new Response(bytes, { status: 200 })
    }) as typeof fetch
    const client = new ApiClient(fetchBytes, BASE, 't', 's')
    const pdf = await client.pdfControlTrabajos('+573001234567', '12')
    expect(pdf.length).toBe(4)
    expect(llamadas[1]!.url).toContain('/mi-clinica/ordenes/12/control-trabajos')
    void fetchFn
  })

  it('descargarPdf propaga el estado de la URL del PDF', async () => {
    const client = new ApiClient((async () => new Response(null, { status: 404 })) as unknown as typeof fetch, BASE, 't', 's')
    // Host en la allowlist: el 404 del servidor debe propagarse igual.
    await expect(client.descargarPdf('https://res.cloudinary.com/x.pdf')).rejects.toMatchObject({ status: 404 })
    expect(new ApiError(404, 'x')).toBeInstanceOf(ApiError)
  })
})

describe('transporte del token', () => {
  it('manda el token en la cookie auth_token, nunca en Authorization', async () => {
    const { client, llamadas } = cliente([
      { status: 200, body: SESION },
      { status: 200, body: [] },
      { status: 200, body: [] },
    ])
    await client.getOrdenes('+573001234567')
    await client.getDoctores('+573001234567')
    const autenticadas = llamadas.slice(1).map((l) => l.init?.headers as Record<string, string>)
    expect(autenticadas.length).toBeGreaterThan(0)
    for (const cabeceras of autenticadas) {
      expect(cabeceras.cookie).toBe('auth_token=jwt')
      expect(cabeceras.authorization).toBeUndefined()
    }
  })
})
