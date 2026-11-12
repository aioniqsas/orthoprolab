/**
 * Menú en lenguaje llano (S11/T12). La opción 3 conserva la frase "Cuenta de
 * cobro" a propósito: es el término que las clínicas usan para las facturas.
 * "Que me llamen" es la opción 5: el 0 quedó reservado para volver al menú.
 */
export function buildMenu(): string {
  return [
    'Hola. Escribe un número:',
    '',
    '1. ¿Cómo va mi trabajo?',
    '2. Papel del trabajo',
    '3. Cuenta de cobro',
    '4. Hacer un pedido',
    '5. Que me llamen',
  ].join('\n')
}
