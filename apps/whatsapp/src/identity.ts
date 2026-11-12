import { ApiClient, NO_DISPONIBLE, NO_HABILITADO, textoPorEstado, ApiError } from './api.js'

/**
 * Resuelve al remitente contra la API (S1, S3): el JID se normaliza a teléfono,
 * la sesión del endpoint interno autentica el contacto y devuelve la clínica
 * designada. Nunca registra el teléfono ni el cuerpo del mensaje.
 */

export type Identity = { clinicId: string; doctorId?: string }

/** Texto cuando el número no pudo identificarse. */
export const IDENTIDAD_NO_RECONOCIDA =
  'No pude identificar tu número. Escribe al laboratorio para vincularte al bot.'

/**
 * JID de Baileys → teléfono: quita el dominio y el ":NN" de dispositivo.
 * La API re-normaliza con su propia regla (+57, 10 dígitos).
 */
export function jidToPhone(jid: string): string {
  const base = (jid.split('@')[0] ?? jid).replace(/:\d+$/, '')
  return base
}

export type ResultadoIdentidad = { ok: true; telefono: string; identidad: Identity } | { ok: false; reply: string }

/** El pushName de WhatsApp no es identidad: solo responde el allowlist de la API. */
export async function resolveIdentity(jid: string, client: ApiClient): Promise<ResultadoIdentidad> {
  let telefono: string
  try {
    telefono = jidToPhone(jid)
  } catch {
    return { ok: false, reply: IDENTIDAD_NO_RECONOCIDA }
  }
  if (!/^\d{6,15}$/.test(telefono)) {
    return { ok: false, reply: IDENTIDAD_NO_RECONOCIDA }
  }
  try {
    const sesion = await client.sesion(telefono)
    if (!sesion.clinicaId) return { ok: false, reply: NO_HABILITADO }
    return {
      ok: true,
      telefono,
      identidad: { clinicId: sesion.clinicaId, doctorId: sesion.doctorId ?? undefined },
    }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, reply: textoPorEstado(error.status) }
    return { ok: false, reply: NO_DISPONIBLE }
  }
}
