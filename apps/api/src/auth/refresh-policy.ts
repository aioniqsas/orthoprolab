export interface RefreshRow {
  expiraEn: Date;
  revocadaEn: Date | null;
  reemplazadaPorId: string | null;
}

export type RefreshDecision =
  'unknown' | 'expired' | 'reuse' | 'grace' | 'capped' | 'rotate';

export interface RefreshPolicyOptions {
  graceSeconds: number;
  maxLifetimeDays: number;
}

const DAY_MS = 86_400_000;

/**
 * Pure decision for POST /auth/refresh, given the locked session row and the
 * creation time of the family's first session.
 * - reuse: a revoked token was presented again -> the family must be revoked.
 * - grace: the token was rotated moments ago (parallel tabs): reject without
 *   revoking.
 * - capped: the family exceeded its absolute lifetime.
 */
export function decideRefresh(
  row: RefreshRow | null,
  familyStart: Date | null,
  now: Date,
  options: RefreshPolicyOptions,
): RefreshDecision {
  if (row === null) return 'unknown';
  if (row.revocadaEn !== null) {
    const rotated = row.reemplazadaPorId !== null;
    const withinGrace =
      now.getTime() - row.revocadaEn.getTime() < options.graceSeconds * 1000;
    return rotated && withinGrace ? 'grace' : 'reuse';
  }
  if (row.expiraEn.getTime() <= now.getTime()) return 'expired';
  if (
    familyStart !== null &&
    now.getTime() - familyStart.getTime() >= options.maxLifetimeDays * DAY_MS
  ) {
    return 'capped';
  }
  return 'rotate';
}
