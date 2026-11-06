import { PdfControlTrabajosService } from './pdf-control-trabajos.service.js';
import type { Orden } from './orden.entity.js';

/** Orden mínima con una línea de trabajo y una devolución con motivo. */
function ordenFalsa(): Orden {
  return {
    id: '9',
    fechaCreacion: new Date('2026-11-06T17:46:00.000Z'),
    asignacion: {
      doctor: { nombres: 'Ana', apellidos: 'Gómez' },
      paciente: { nombre: 'María Núñez', cedula: '***' },
    },
    detalles: [
      { servicio: 'Corona de zirconia', cantidad: 2, dientes: [11, 21], colorDiente: 'A2' },
    ],
    historial: [
      {
        estadoAnterior: { codigo: 'en_entrega' },
        estadoNuevo: { codigo: 'devuelta_correccion' },
        fechaCambio: '2026-11-10T15:00:00.000Z',
        observaciones: 'Ajustar oclusión en el 11.',
      },
    ],
  } as unknown as Orden;
}

describe('PdfControlTrabajosService.generate', () => {
  const service = new PdfControlTrabajosService();

  it('produce un PDF válido con clases de trabajo y pruebas', async () => {
    const pdf = await service.generate(ordenFalsa());

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    // Fin de archivo: el documento se cerró con doc.end().
    expect(pdf.subarray(-6).toString()).toContain('%%EOF');
  });

  it('genera el PDF aunque la orden no tenga líneas ni devoluciones', async () => {
    const vacia = {
      id: '1',
      fechaCreacion: new Date('2026-11-06T17:46:00.000Z'),
      detalles: [],
      historial: [],
    } as unknown as Orden;

    const pdf = await service.generate(vacia);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
