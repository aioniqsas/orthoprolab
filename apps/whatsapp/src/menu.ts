/**
 * Saludo único de entrada (IA7/S13): capacidades en una frase natural, sin
 * números ni incisos. Es también a donde vuelven las palabras de escape.
 */
export const SALUDO =
  'Hola, ¿en qué te ayudo? Puedo contarte cómo va un pedido, mandarte el papel del trabajo o una cuenta de cobro, tomar un pedido nuevo, o pedir que el laboratorio te llame.'

/** Una sola pregunta de aclaración (IA7): nombra lo mismo que el saludo, sin adivinar. */
export const PREGUNTA_ACLARAR =
  'No te entendí bien. Puedo contarte cómo va un pedido, mandarte el papel del trabajo o una cuenta de cobro, tomar un pedido nuevo, o pedir que el laboratorio te llame. ¿Qué necesitas?'

/**
 * Menú en lenguaje llano (S11/T12). La opción 3 conserva la frase "Cuenta de
 * cobro" a propósito: es el término que las clínicas usan para las facturas.
 * "Que me llamen" es la opción 5: el 0 quedó reservado para volver al menú.
 * Con modelo (IA7/S13) este menú solo sale como respaldo; la entrada es SALUDO.
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
