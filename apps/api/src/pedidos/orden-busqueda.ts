import { coincideBusqueda } from '../common/busqueda.js';
import type { Orden } from './orden.entity.js';

/**
 * Text search over an order row: its number, the doctor's name in both orders,
 * the patient's name (decrypted server-side) and, when given, the state name.
 * Same fields the tables searched in the browser.
 */
export function coincideOrden(o: Orden, q: string | undefined, extra: Array<string | null | undefined> = []): boolean {
  const doctor = o.asignacion?.doctor;
  const nombreDoctor = doctor ? `${doctor.nombres ?? ''} ${doctor.apellidos ?? ''}` : null;
  const apellidosDoctor = doctor ? `${doctor.apellidos ?? ''}, ${doctor.nombres ?? ''}` : null;
  return coincideBusqueda(q, [
    `#${o.id}`,
    nombreDoctor,
    apellidosDoctor,
    o.asignacion?.paciente?.nombre,
    ...extra,
  ]);
}
