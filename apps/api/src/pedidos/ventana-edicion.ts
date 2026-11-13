/**
 * Ventana de gracia para corregir una orden (S8). Este es el único lugar donde
 * vive la regla: `PedidosService.update` la aplica y la API la publica en la
 * orden (`editable`, `editableHasta`) para que el bot y los portales la lean en
 * vez de repetirla.
 */

/**
 * Estados que siempre admiten corrección. `devuelta_correccion` está acá porque
 * existe justo para eso: el laboratorio devolvió la orden para que la clínica la
 * corrija.
 */
export const ESTADOS_EDITABLES = [
  'creada',
  'recibida',
  'devuelta_correccion',
] as const;

/**
 * Tiempo de gracia desde que el trabajo entró a producción, no desde que se
 * creó la orden: el material se compromete cuando el trabajo empieza.
 */
export const VENTANA_EN_PROCESO_MS = 5 * 60 * 60 * 1000;

export interface VeredictoEdicion {
  editable: boolean;
  /** Cierre de la ventana cuando depende del reloj; `null` cuando no. */
  editableHasta: Date | null;
  /** Por qué no se puede, en palabras de la persona; `null` si se puede. */
  motivo: string | null;
}

/**
 * El veredicto de la ventana de edición (S8). `entradaEnProceso` es la última
 * `historial_estado_orden.fecha_cambio` cuyo estado nuevo es `en_proceso`.
 */
export function veredictoEdicion(entrada: {
  estadoCodigo: string | null | undefined;
  entradaEnProceso: Date | null;
  fechaCreacion: Date;
  ahora: Date;
}): VeredictoEdicion {
  const codigo = entrada.estadoCodigo ?? '';

  if ((ESTADOS_EDITABLES as readonly string[]).includes(codigo)) {
    return { editable: true, editableHasta: null, motivo: null };
  }

  if (codigo === 'en_proceso') {
    // Sin fila de historial no hay de dónde contar. Toda orden en proceso pasó
    // por `en_proceso`, así que la falta es un dato incompleto del historial:
    // se cae a la creación, que abre la ventana (nunca la cierra antes).
    const desde = entrada.entradaEnProceso ?? entrada.fechaCreacion;
    const hasta = new Date(desde.getTime() + VENTANA_EN_PROCESO_MS);
    // "máximo 5 horas": justo en el límite todavía se admite.
    const abierta = entrada.ahora.getTime() <= hasta.getTime();
    return {
      editable: abierta,
      editableHasta: hasta,
      motivo: abierta
        ? null
        : 'el trabajo ya entró a producción hace más de 5 horas',
    };
  }

  if (codigo === 'cancelada') {
    return { editable: false, editableHasta: null, motivo: 'la orden está cancelada' };
  }
  if (codigo === 'en_entrega' || codigo === 'terminada') {
    return {
      editable: false,
      editableHasta: null,
      motivo: 'el trabajo ya está terminado',
    };
  }
  return { editable: false, editableHasta: null, motivo: 'la orden ya no admite cambios' };
}
