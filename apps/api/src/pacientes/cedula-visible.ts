/**
 * What an HTTP response shows of a patient's cedula: the last four digits,
 * never the full number. The full cedula stays server-side and is printed only
 * on the lab's PDFs (control de trabajos), which read the entity directly.
 */
export function enmascararCedula(cedula: string | null | undefined): string | null {
  if (!cedula) return null;
  const digitos = cedula.trim();
  if (digitos.length <= 4) return '****';
  return '****' + digitos.slice(-4);
}
