/**
 * Servidor HTTP mínimo para plataformas que exigen un puerto (Railway): el
 * dominio público y la verificación de salud necesitan algo que responda. El
 * bot no atiende tráfico por aquí; solo informa si WhatsApp está conectado.
 * No expone números, mensajes ni credenciales.
 */

export type EstadoBot = 'conectado' | 'conectando'

/** Puerto válido de `PORT`, o undefined: sin PORT el servidor no se levanta (desarrollo local). */
export function puertoSalud(env: Record<string, string | undefined> = process.env): number | undefined {
  const crudo = env.PORT?.trim()
  if (!crudo || !/^\d+$/.test(crudo)) return undefined
  const puerto = Number(crudo)
  return puerto >= 1 && puerto <= 65535 ? puerto : undefined
}

/** Responde 200 siempre: esperar el QR no debe hacer que la plataforma reinicie el bot. */
export function respuestaSalud(estado: EstadoBot): Response {
  return Response.json({ estado }, { headers: { 'Cache-Control': 'no-store' } })
}

export function iniciarServidorSalud(puerto: number, estado: () => EstadoBot) {
  return Bun.serve({
    port: puerto,
    hostname: '0.0.0.0',
    fetch: () => respuestaSalud(estado()),
  })
}
