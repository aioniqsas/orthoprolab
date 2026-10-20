/**
 * Data access for the admin portal.
 *
 * SAMPLE DATA: the backend has no endpoints for orders or clinics yet, so
 * these functions return the fictional records from `sample.ts`.
 *
 * To connect the real API, keep the signatures and replace each body with a
 * call to the shared client, e.g.:
 *
 *   const { data } = await api.request<Orden[]>("/ordenes");
 *
 * (server components must forward the `auth_token` cookie, see
 * `fetchSessionOnServer` in `@repo/api-client`), then set `SAMPLE_DATA` to
 * false so the "Datos de ejemplo" notice disappears.
 */
import { SAMPLE_CLINICAS, SAMPLE_ORDENES } from "./sample";
import type { Clinica, Orden } from "./types";

/** When true, screens show the "Datos de ejemplo" notice. */
export const SAMPLE_DATA = true;

export async function listOrdenes(): Promise<Orden[]> {
  return [...SAMPLE_ORDENES].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
}

export async function getOrden(id: number): Promise<Orden | null> {
  return SAMPLE_ORDENES.find((o) => o.id === id) ?? null;
}

export async function listClinicas(): Promise<Clinica[]> {
  return SAMPLE_CLINICAS;
}

export async function getClinica(id: number): Promise<Clinica | null> {
  return SAMPLE_CLINICAS.find((c) => c.id === id) ?? null;
}
