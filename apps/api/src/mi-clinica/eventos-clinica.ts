/**
 * True when an order event belongs to the given clinic. Events without a clinic
 * (an order whose doctor could not be resolved) never reach a clinic stream.
 */
export function esDeClinica(
  cambio: { clinicaId?: string | null },
  clinicaId: string,
): boolean {
  return cambio.clinicaId != null && cambio.clinicaId === clinicaId;
}
