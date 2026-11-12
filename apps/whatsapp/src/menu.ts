export function buildMenu(): string {
  return [
    'Hola. Escribe un número:',
    '',
    '1. Estado de pedido',
    '2. Control de trabajos',
    '3. Cuenta de cobro',
    '4. Crear orden',
    '0. Que el laboratorio te llame (próximamente)',
    '',
    'También puedes escribir 0 si necesitas ayuda.',
  ].join('\n')
}

export function replyToInput(input: string): string {
  if (input.trim() === '0')
    return 'La llamada de devolución todavía no está disponible. Por ahora contacta al laboratorio directamente por el portal o por teléfono.'
  return buildMenu()
}
