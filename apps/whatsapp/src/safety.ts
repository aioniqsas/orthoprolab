import { existsSync } from 'node:fs'

export const RECONNECT_MAX_ATTEMPTS = 8
export const RECONNECT_MAX_DELAY_MS = 60_000

/** Exponential backoff (1 s, 2 s, 4 s, …) capped at 60 s. Pure in the attempt count. */
export function reconnectDelayMs(attempt: number): number {
  if (attempt < 1) return 1000
  return Math.min(1000 * 2 ** (attempt - 1), RECONNECT_MAX_DELAY_MS)
}

/**
 * Only direct 1:1 chats are answered: ignore groups, broadcasts, newsletters
 * and any other non-personal JID.
 */
export function shouldIgnoreSender(senderId: string | undefined, fromMe: boolean): boolean {
  if (fromMe) return true
  if (!senderId) return true
  if (senderId === 'status@broadcast') return true
  if (senderId.endsWith('@broadcast')) return true
  if (senderId.endsWith('@g.us')) return true
  if (senderId.endsWith('@newsletter')) return true
  return !senderId.endsWith('@s.whatsapp.net')
}

/**
 * Walks up from startDir to the repository root: the nearest directory with `.git`,
 * falling back to the nearest `package.json` if no git root is found.
 */
export function detectRepoRoot(startDir: string): string {
  let current = startDir
  let fallback: string | undefined
  for (;;) {
    if (existsSync(`${current}/.git`)) return current
    if (fallback === undefined && existsSync(`${current}/package.json`)) fallback = current
    const parent = current.replace(/\/[^/]+\/?$/, '') || '/'
    if (parent === current) return fallback ?? startDir
    current = parent
  }
}

/**
 * WHATSAPP_AUTH_DIR is honoured, but never inside the repository working tree:
 * credentials must not be committed by accident. Fail closed.
 */
export function assertAuthDirOutsideRepo(
  authDir: string,
  repoRoot: string,
): { ok: true } | { ok: false; reason: string } {
  const dir = authDir.replace(/\/+$/, '')
  const root = repoRoot.replace(/\/+$/, '')
  if (dir === root || dir.startsWith(`${root}/`)) {
    return { ok: false, reason: `WHATSAPP_AUTH_DIR debe vivir fuera del repositorio (${repoRoot}). Configura una ruta externa, por ejemplo ~/.orthopro-lab/whatsapp/auth_info.` }
  }
  return { ok: true }
}

/** Directory permissions for Baileys credentials: 0700 dir, 0600 files. */
export const AUTH_DIR_MODE = 0o700
export const AUTH_FILE_MODE = 0o600
