import { describirCpu, parseCpuMax } from './cpu-cuota.js';

describe('parseCpuMax', () => {
  it('reads a fractional quota (Render Free: 0.1 CPU)', () => {
    expect(parseCpuMax('10000 100000\n')).toBeCloseTo(0.1);
  });

  it('reads a whole-CPU quota', () => {
    expect(parseCpuMax('200000 100000')).toBe(2);
  });

  it('returns null without a quota', () => {
    expect(parseCpuMax('max 100000')).toBeNull();
    expect(parseCpuMax('')).toBeNull();
    expect(parseCpuMax('garbage')).toBeNull();
  });
});

describe('describirCpu', () => {
  it('reports the quota when cgroup exposes one', () => {
    expect(describirCpu(() => '50000 100000')).toMatch(/cuota cgroup 0\.50 CPU/);
  });

  it('reports no quota when cgroup is not readable', () => {
    expect(
      describirCpu(() => {
        throw new Error('no cgroup');
      }),
    ).toMatch(/sin cuota de cgroup/);
  });
});
