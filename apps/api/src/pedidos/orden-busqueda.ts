import type { ObjectLiteral, SelectQueryBuilder, WhereExpressionBuilder } from 'typeorm';
import { Brackets } from 'typeorm';
import { patronBusqueda, sinAcentosSql } from '../common/busqueda.js';

/**
 * Adds the order text search to a query, in the database. An order matches on
 * its number (`9` or `#9`), its doctor (both name orders), its patient (through
 * the ids the blind index found) and, when `conEstado`, its state name.
 */
export function aplicarBusquedaOrdenes<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  q: string | undefined,
  pacienteIds: string[] | null,
  opciones: { conEstado: boolean },
): void {
  const texto = (q ?? '').trim();
  if (!texto) return;
  const numero = /^#?\d+$/.test(texto) ? texto.replace('#', '') : null;
  const patron = patronBusqueda(texto);
  const coincidePaciente = pacienteIds !== null && pacienteIds.length > 0;
  qb.andWhere(
    new Brackets((w: WhereExpressionBuilder) => {
      if (numero) w.orWhere('o.id = :numero', { numero });
      if (patron) {
        w.orWhere(
          `o.doctorId IN (SELECT d.id FROM doctor d WHERE
             ${sinAcentosSql("d.nombres || ' ' || d.apellidos")} LIKE :patron ESCAPE '\\'
             OR ${sinAcentosSql("d.apellidos || ' ' || d.nombres")} LIKE :patron ESCAPE '\\')`,
          { patron },
        );
      }
      if (coincidePaciente) {
        w.orWhere('o.pacienteId IN (:...pacienteIds)', { pacienteIds });
      }
      if (opciones.conEstado && patron) {
        w.orWhere(`${sinAcentosSql('estado.nombre')} LIKE :patron ESCAPE '\\'`, { patron });
      }
    }),
  );
}
