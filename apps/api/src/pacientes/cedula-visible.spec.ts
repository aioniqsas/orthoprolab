import { enmascararCedula } from './cedula-visible.js';

describe('enmascararCedula', () => {
  it('shows only the last four digits', () => {
    expect(enmascararCedula('1001812664')).toBe('****2664');
  });

  it('hides a short cedula entirely', () => {
    expect(enmascararCedula('123')).toBe('****');
  });

  it('keeps null for patients without a cedula', () => {
    expect(enmascararCedula(null)).toBeNull();
    expect(enmascararCedula('')).toBeNull();
  });
});
