import { instanceToPlain } from 'class-transformer';
import { Paciente } from './paciente.entity.js';

// The HTTP response shows the last four digits; the entity keeps the full
// cedula, which the control de trabajos PDF prints.
describe('Paciente serialization', () => {
  const paciente = Object.assign(new Paciente(), { id: '7', nombre: 'Santiago', cedula: '1001812664' });

  it('serializes the cedula as its last four digits', () => {
    expect(instanceToPlain(paciente)).toMatchObject({ id: '7', nombre: 'Santiago', cedula: '****2664' });
  });

  it('keeps the full cedula on the entity for the PDFs', () => {
    expect(paciente.cedula).toBe('1001812664');
  });
});
