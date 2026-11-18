/**
 * WhatsApp identifica cada vez más cuentas con un LID (`<id>@lid`) en vez de con
 * el teléfono (`<numero>@s.whatsapp.net`). Todo lo que compara contra la lista
 * de números autorizados necesita el teléfono, así que aquí se traduce.
 */
export type TraductorLid = (jid: string) => Promise<string | null | undefined>

/** Un JID que es un teléfono de persona, no un LID, grupo ni difusión. */
export function esTelefono(jid: string | null | undefined): jid is string {
  return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')
}

export function esLid(jid: string): boolean {
  return jid.endsWith('@lid')
}

/**
 * Teléfono del remitente, en JID. `alterno` es el número que WhatsApp manda
 * junto al LID cuando lo conoce; si no viene, se consulta el mapeo guardado.
 * Devuelve null cuando el remitente no se puede identificar: nunca se inventa
 * un número, porque la autorización depende de él.
 */
export async function telefonoDelRemitente(
  jid: string,
  alterno: string | null | undefined,
  traducir: TraductorLid,
): Promise<string | null> {
  if (esTelefono(jid)) return jid
  if (esTelefono(alterno)) return alterno
  if (!esLid(jid)) return null
  try {
    const pn = await traducir(jid)
    return esTelefono(pn) ? pn : null
  } catch {
    return null
  }
}
