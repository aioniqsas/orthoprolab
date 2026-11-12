export function buildMenu(): string {
  return [
    'Hola. Escribe un número:',
    '',
    '1. Estado de pedido',
    '2. Control de trabajos',
    '3. Cuenta de cobro',
    '4. Crear orden',
    '0. Que el laboratorio te llame',
    '',
    'También puedes escribir 0 si necesitas ayuda.',
  ].join('\n')
}
