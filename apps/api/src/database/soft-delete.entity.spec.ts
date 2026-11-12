import { getMetadataArgsStorage } from 'typeorm';
import { CuentaCobroOrden } from '../cuentas-cobro/cuenta-cobro-orden.entity.js';
import { Paciente } from '../pacientes/paciente.entity.js';
import { PacienteDoctor } from '../pacientes/paciente-doctor.entity.js';
import { DetalleOrden } from '../pedidos/detalle-orden.entity.js';
import { Clinica } from '../usuarios/clinica.entity.js';

// Metadata is global, so every lookup filters by the owning entity class.
const column = (entity: unknown, propertyName: string) =>
  getMetadataArgsStorage().columns.find(
    (c) => c.target === entity && c.propertyName === propertyName,
  );

// SD1 (S3): soft delete only on the four tables with no lifecycle of their own.
const softDeleteTargets: Array<[string, unknown]> = [
  ['detalle_orden', DetalleOrden],
  ['paciente_doctor', PacienteDoctor],
  ['cuenta_cobro_orden', CuentaCobroOrden],
  ['paciente', Paciente],
];

describe('soft delete columns (SD1)', () => {
  it.each(softDeleteTargets)(
    'maps %s.eliminado_en as a nullable delete-date column',
    (_table, entity) => {
      const col = column(entity, 'eliminadoEn');
      expect(col).toBeDefined();
      expect(col?.options.name).toBe('eliminado_en');
      expect(col?.options.type).toBe('timestamptz');
      expect(col?.options.nullable).toBe(true);
      expect(col?.mode).toBe('deleteDate');
    },
  );

  it('declares clinica.activo like doctor: boolean, default true, not nullable', () => {
    const activo = column(Clinica, 'activo');
    expect(activo).toBeDefined();
    expect(activo?.options.type).toBe('boolean');
    expect(activo?.options.default).toBe(true);
    // TypeORM only records nullable when it is true; undefined means NOT NULL.
    expect(activo?.options.nullable).not.toBe(true);
  });

  it('keeps cedula_hash unique only across rows not yet deleted', () => {
    const index = getMetadataArgsStorage().indices.find(
      (i) => i.name === 'uq_paciente_cedula_hash',
    );
    expect(index?.unique).toBe(true);
    expect(index?.where).toBe(
      'cedula_hash IS NOT NULL AND eliminado_en IS NULL',
    );
  });
});
