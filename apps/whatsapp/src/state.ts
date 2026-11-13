export type ConversationState = {
  step: string
  fields: Record<string, string>
  expiresAt: number
}

export class ConversationStore {
  private readonly states = new Map<string, ConversationState>()

  constructor(
    private readonly ttlMs = 15 * 60 * 1000,
    private readonly maxEntries = 2000,
  ) {}

  get size(): number {
    return this.states.size
  }

  set(senderId: string, step: string, fields: Record<string, string>, now = Date.now()): void {
    // Evict expired entries first, then the oldest if the cap is still reached.
    for (const [id, state] of this.states) if (state.expiresAt <= now) this.states.delete(id)
    while (this.states.size >= this.maxEntries) {
      const oldest = this.states.keys().next().value
      if (oldest === undefined) break
      this.states.delete(oldest)
    }
    this.states.set(senderId, { step, fields: { ...fields }, expiresAt: now + this.ttlMs })
  }

  get(senderId: string, now = Date.now()): ConversationState | undefined {
    const state = this.states.get(senderId)
    if (!state) return undefined
    if (state.expiresAt <= now) {
      this.states.delete(senderId)
      return undefined
    }
    return { ...state, fields: { ...state.fields } }
  }

  clear(senderId: string): void {
    this.states.delete(senderId)
  }
}

/**
 * La última orden que el bot le mostró a una persona. Sin esto, cambiar algo
 * justo después de verlo obliga a repetir cuál orden era, que es justo lo que
 * un humano no hace.
 */
export class UltimaOrdenVista {
  private readonly vistas = new Map<string, { numero: string; expiresAt: number }>()

  constructor(private readonly ttlMs = 15 * 60 * 1000) {}

  recordar(senderId: string, numero: string, now = Date.now()): void {
    this.vistas.set(senderId, { numero, expiresAt: now + this.ttlMs })
  }

  recordada(senderId: string, now = Date.now()): string | undefined {
    const vista = this.vistas.get(senderId)
    if (!vista) return undefined
    if (vista.expiresAt <= now) {
      this.vistas.delete(senderId)
      return undefined
    }
    return vista.numero
  }
}
