import type { ApiClient } from './api.js'

/**
 * Vínculo por OTP (T8, S1): `VINCULAR <código>` desde el WhatsApp del contacto.
 * Se atiende antes del filtro de identidad: un número desconocido es justamente
 * el que puede vincularse. El resultado del canje es binario; el bot responde
 * lo mismo ante código errado, vencido o de otra clínica.
 */

/** Acepta "VINCULAR 123456" en cualquier mayúscula y con espacios sobrantes. */
export function parseVincular(texto: string): string | null {
  const m = texto.trim().match(/^vincular\s+(\d{6})$/i)
  return m?.[1] ?? null
}

export const VINCULAR_OK =
  '¡Listo! Ya quedó vinculado este número, y desde acá te atiendo. ' +
  'Cuéntame qué necesitas: puedo contarte cómo va un pedido, mandarte el papel del trabajo o una cuenta de cobro, ' +
  'tomar un pedido nuevo, o pedir que el laboratorio te llame.'

/** Un solo texto para todo fallo: no revela si el código existió (T8). */
export const VINCULAR_FALLO = 'No pude vincular ese código, verifica que sea el vigente.'

/** Número ya verificado: moverlo exige que el laboratorio lo desvincule. */
export const VINCULAR_YA =
  'Este número ya está vinculado a una clínica. Para moverlo a otra, el laboratorio debe desvincularlo primero.'

/** Canje contra la API; true solo si la API confirmó el vínculo. */
export async function canjearVinculacion(
  api: ApiClient,
  telefono: string,
  codigo: string,
): Promise<boolean> {
  try {
    await api.vincular(telefono, codigo)
    return true
  } catch {
    return false
  }
}
