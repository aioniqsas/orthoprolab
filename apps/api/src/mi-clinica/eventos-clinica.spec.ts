import { esDeClinica } from './eventos-clinica.js';

describe('esDeClinica', () => {
  it('lets through only the events of the same clinic', () => {
    expect(esDeClinica({ clinicaId: '2' }, '2')).toBe(true);
    expect(esDeClinica({ clinicaId: '3' }, '2')).toBe(false);
  });

  it('never lets an event without a clinic reach a clinic stream', () => {
    expect(esDeClinica({}, '2')).toBe(false);
    expect(esDeClinica({ clinicaId: null }, '2')).toBe(false);
  });
});
