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
