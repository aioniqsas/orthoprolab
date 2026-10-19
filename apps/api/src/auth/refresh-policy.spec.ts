import { decideRefresh, type RefreshRow } from './refresh-policy.js';

const DAY = 86_400_000;
const now = new Date('2026-01-31T12:00:00Z');
const opts = { graceSeconds: 10, maxLifetimeDays: 30 };
const row = (over: Partial<RefreshRow> = {}): RefreshRow => ({
  expiraEn: new Date(now.getTime() + DAY),
  revocadaEn: null,
  reemplazadaPorId: null,
  ...over,
});
const familyStart = new Date(now.getTime() - DAY);

describe('decideRefresh', () => {
  it('unknown token', () => {
    expect(decideRefresh(null, null, now, opts)).toBe('unknown');
  });

  it('rotates a live token', () => {
    expect(decideRefresh(row(), familyStart, now, opts)).toBe('rotate');
  });

  it('expired token', () => {
    const r = row({ expiraEn: new Date(now.getTime() - 1) });
    expect(decideRefresh(r, familyStart, now, opts)).toBe('expired');
  });

  it('reuse of a rotated token outside the grace window revokes the family', () => {
    const r = row({
      revocadaEn: new Date(now.getTime() - 11_000),
      reemplazadaPorId: '2',
    });
    expect(decideRefresh(r, familyStart, now, opts)).toBe('reuse');
  });

  it('reuse of a rotated token inside the grace window does not revoke', () => {
    const r = row({
      revocadaEn: new Date(now.getTime() - 9_000),
      reemplazadaPorId: '2',
    });
    expect(decideRefresh(r, familyStart, now, opts)).toBe('grace');
  });

  it('grace of 0 seconds never tolerates reuse', () => {
    const r = row({
      revocadaEn: new Date(now.getTime()),
      reemplazadaPorId: '2',
    });
    expect(
      decideRefresh(r, familyStart, now, { ...opts, graceSeconds: 0 }),
    ).toBe('reuse');
  });

  it('a token revoked without replacement (logout) is reuse even inside grace', () => {
    const r = row({ revocadaEn: new Date(now.getTime() - 1_000) });
    expect(decideRefresh(r, familyStart, now, opts)).toBe('reuse');
  });

  it('absolute cap counted from the first session of the family', () => {
    const old = new Date(now.getTime() - 30 * DAY);
    expect(decideRefresh(row(), old, now, opts)).toBe('capped');
    const nearly = new Date(now.getTime() - 30 * DAY + 1);
    expect(decideRefresh(row(), nearly, now, opts)).toBe('rotate');
  });
});
