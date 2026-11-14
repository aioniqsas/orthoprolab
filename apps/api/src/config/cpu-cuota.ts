import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';

/**
 * Parses cgroup v2 `cpu.max` ("max 100000" or "50000 100000") into the number
 * of CPUs the container may use, or null when there is no quota.
 */
export function parseCpuMax(texto: string): number | null {
  const [cuota, periodo] = texto.trim().split(/\s+/);
  if (!cuota || cuota === 'max' || !periodo) return null;
  const q = Number(cuota);
  const p = Number(periodo);
  if (!Number.isFinite(q) || !Number.isFinite(p) || p <= 0) return null;
  return q / p;
}

/**
 * Describes the CPU this process really gets. `os.availableParallelism()` in a
 * container reports the host's cores, not the plan's share (Render Free is
 * 0.1 CPU), so the cgroup quota is read as well. Used for the startup log and
 * to choose UV_THREADPOOL_SIZE (optimizacion P4).
 */
export function describirCpu(leerCpuMax: () => string = () => readFileSync('/sys/fs/cgroup/cpu.max', 'utf8')): string {
  const nucleos = availableParallelism();
  let cuota: number | null = null;
  try {
    cuota = parseCpuMax(leerCpuMax());
  } catch {
    cuota = null;
  }
  const cuotaTxt = cuota === null ? 'sin cuota de cgroup' : `cuota cgroup ${cuota.toFixed(2)} CPU`;
  return `CPU: ${nucleos} núcleos visibles, ${cuotaTxt}, UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE ?? 'por defecto (4)'}`;
}
