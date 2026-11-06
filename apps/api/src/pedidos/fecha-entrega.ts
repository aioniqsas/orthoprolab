import { BadRequestException } from '@nestjs/common';

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Día calendario (YYYY-MM-DD) en la zona del negocio. */
export function diaBogota(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(fecha);
}

export function hoyBogota(): string {
  return diaBogota(new Date());
}

/**
 * Fecha de entrega de una orden: un día calendario en Bogotá, guardado a las
 * 12:00 UTC para que cualquier zona horaria ±12h caiga en el día buscado.
 * `desde` es el día mínimo aceptado (hoy al crear, la fecha de creación al editar).
 */
export function parseFechaEntrega(
  value: string | null | undefined,
  desde: string = hoyBogota(),
): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (ISO_DIA.test(value)) {
    if (value < desde) {
      throw new BadRequestException(
        'La fecha de entrega no puede ser anterior a la fecha de creación de la orden.',
      );
    }
    return new Date(`${value}T12:00:00Z`);
  }

  // Llamadas antiguas pueden mandar un ISO completo: se sigue aceptando.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
