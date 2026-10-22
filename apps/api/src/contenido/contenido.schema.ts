export type ContenidoTipo = 'texto' | 'parrafo' | 'imagen';

export interface ContenidoCampo {
  /** `<pagina>.<seccion>.<campo>`, e.g. "home.hero.titulo". */
  clave: string;
  /** Spanish label shown in the admin form. */
  etiqueta: string;
  tipo: ContenidoTipo;
  /** Optional short Spanish help text for the admin form. */
  ayuda?: string;
}

export interface ContenidoGrupo {
  /** Spanish group name, e.g. "Landing: hero". */
  grupo: string;
  campos: ContenidoCampo[];
}

/** Length limits enforced per tipo when saving (empty string always means "delete"). */
export const MAX_TEXTO = 160;
export const MAX_PARRAFO = 1200;

/**
 * Every image the admin may pick: the files that exist today in
 * `apps/web/public/images`. Hero/payment images are chosen, never uploaded.
 */
export const IMAGENES_DISPONIBLES: string[] = [
  '/images/alineadores-transparentes-sobre-modelos-dentales.webp',
  '/images/detalle-protesis-dental-dientes-anteriores.webp',
  '/images/expansor-ortodoncia-tornillo-central.webp',
  '/images/hero.jpg',
  '/images/placa-acrilico-removible-sobre-modelo.webp',
  '/images/placa-ortodoncia-removible-con-resortes.webp',
  '/images/placas-expansion-ortodoncia-removible.webp',
  '/images/placas-removibles-ortodoncia-con-tornillo.webp',
  '/images/protesis-dental-completa-laboratorio-medellin.webp',
  '/images/protesis-dental-sobre-modelos-articulados.webp',
  '/images/protesis-parcial-removible-esqueleto-metalico.webp',
  '/images/protesis-parcial-removible-superior-modelo.webp',
  '/images/protesis-parcial-removible-vista-oclusal.webp',
  '/images/protesis-parcial-superior-sobre-modelo-yeso.webp',
  '/images/protesis-total-superior-acabado.webp',
  '/images/protesis-total-superior-acrilico.webp',
  '/images/protesis-total-superior-ortopro-lab-medellin.webp',
  '/images/protesis-total-superior-vista-lateral.webp',
  '/images/qr-cuenta.webp',
  '/images/tecnico-laboratorio-dental-ajustando-protesis.webp',
  '/images/tecnicos-laboratorio-dental-trabajando-medellin.webp',
];

/**
 * The editable fixed copy of the public site, grouped by page and section in
 * the order it appears on the page. Only text and image paths live here: SEO
 * metadata, icon names, hrefs and everything served by the catalog API are out.
 *
 * Lists (steps, points, values) have a fixed number of items: one key per
 * editable field, indexed from 1. Titles split in two by a highlighted word use
 * `titulo` + `titulo_destacado` so the web keeps rendering the highlight.
 */
export const CONTENIDO_GRUPOS: ContenidoGrupo[] = [
  {
    grupo: 'Landing: hero',
    campos: [
      {
        clave: 'home.hero.imagen',
        etiqueta: 'Imagen de fondo',
        tipo: 'imagen',
      },
      {
        clave: 'home.hero.imagen_alt',
        etiqueta: 'Texto alternativo de la imagen',
        tipo: 'texto',
        ayuda: 'Describe la imagen para lectores de pantalla.',
      },
      {
        clave: 'home.hero.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'home.hero.titulo_destacado',
        etiqueta: 'Título: parte destacada',
        tipo: 'texto',
        ayuda: 'Palabras finales del título resaltadas en color.',
      },
      {
        clave: 'home.hero.subtitulo',
        etiqueta: 'Subtítulo',
        tipo: 'parrafo',
      },
      {
        clave: 'home.hero.boton_servicios',
        etiqueta: 'Botón "ver servicios"',
        tipo: 'texto',
      },
      {
        clave: 'home.hero.boton_catalogo',
        etiqueta: 'Botón "ver catálogo"',
        tipo: 'texto',
      },
    ],
  },
  {
    grupo: 'Landing: líneas de trabajo',
    campos: [
      {
        clave: 'home.servicios.titulo',
        etiqueta: 'Título de la sección',
        tipo: 'texto',
      },
      {
        clave: 'home.servicios.boton',
        etiqueta: 'Texto de las tarjetas de servicio',
        tipo: 'texto',
      },
    ],
  },
  {
    grupo: 'Landing: cómo trabajamos',
    campos: [
      {
        clave: 'home.proceso.titulo',
        etiqueta: 'Título de la sección',
        tipo: 'texto',
      },
      {
        clave: 'home.proceso.paso1.titulo',
        etiqueta: 'Paso 1: título',
        tipo: 'texto',
      },
      {
        clave: 'home.proceso.paso1.texto',
        etiqueta: 'Paso 1: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'home.proceso.paso2.titulo',
        etiqueta: 'Paso 2: título',
        tipo: 'texto',
      },
      {
        clave: 'home.proceso.paso2.texto',
        etiqueta: 'Paso 2: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'home.proceso.paso3.titulo',
        etiqueta: 'Paso 3: título',
        tipo: 'texto',
      },
      {
        clave: 'home.proceso.paso3.texto',
        etiqueta: 'Paso 3: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'home.proceso.paso4.titulo',
        etiqueta: 'Paso 4: título',
        tipo: 'texto',
      },
      {
        clave: 'home.proceso.paso4.texto',
        etiqueta: 'Paso 4: descripción',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Landing: antes del primer caso',
    campos: [
      {
        clave: 'home.antes.titulo',
        etiqueta: 'Título de la sección',
        tipo: 'texto',
      },
      {
        clave: 'home.antes.imagen',
        etiqueta: 'Imagen de la sección',
        tipo: 'imagen',
      },
      {
        clave: 'home.antes.imagen_alt',
        etiqueta: 'Texto alternativo de la imagen',
        tipo: 'texto',
      },
      {
        clave: 'home.antes.item1.titulo',
        etiqueta: 'Punto 1: título',
        tipo: 'texto',
      },
      {
        clave: 'home.antes.item1.texto',
        etiqueta: 'Punto 1: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'home.antes.item2.titulo',
        etiqueta: 'Punto 2: título',
        tipo: 'texto',
      },
      {
        clave: 'home.antes.item2.texto',
        etiqueta: 'Punto 2: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'home.antes.item3.titulo',
        etiqueta: 'Punto 3: título',
        tipo: 'texto',
      },
      {
        clave: 'home.antes.item3.texto',
        etiqueta: 'Punto 3: descripción',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Landing: cierre',
    campos: [
      {
        clave: 'home.cierre.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'home.cierre.texto',
        etiqueta: 'Descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'home.cierre.boton',
        etiqueta: 'Texto del botón',
        tipo: 'texto',
      },
      {
        clave: 'home.cierre.imagen',
        etiqueta: 'Imagen de fondo',
        tipo: 'imagen',
        ayuda: 'Imagen decorativa: no lleva texto alternativo.',
      },
    ],
  },
  {
    grupo: 'Nosotros: hero',
    campos: [
      {
        clave: 'nosotros.hero.imagen',
        etiqueta: 'Imagen de fondo',
        tipo: 'imagen',
      },
      {
        clave: 'nosotros.hero.imagen_alt',
        etiqueta: 'Texto alternativo de la imagen',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.hero.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.hero.titulo_destacado',
        etiqueta: 'Título: parte destacada',
        tipo: 'texto',
        ayuda: 'Palabras finales del título resaltadas en color.',
      },
      {
        clave: 'nosotros.hero.subtitulo',
        etiqueta: 'Subtítulo',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Nosotros: misión',
    campos: [
      {
        clave: 'nosotros.mision.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.mision.titulo_destacado',
        etiqueta: 'Título: parte destacada',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.mision.intro',
        etiqueta: 'Introducción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.mision.imagen',
        etiqueta: 'Imagen de la sección',
        tipo: 'imagen',
      },
      {
        clave: 'nosotros.mision.imagen_alt',
        etiqueta: 'Texto alternativo de la imagen',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.mision.punto1.titulo',
        etiqueta: 'Punto 1: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.mision.punto1.texto',
        etiqueta: 'Punto 1: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.mision.punto2.titulo',
        etiqueta: 'Punto 2: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.mision.punto2.texto',
        etiqueta: 'Punto 2: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.mision.punto3.titulo',
        etiqueta: 'Punto 3: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.mision.punto3.texto',
        etiqueta: 'Punto 3: descripción',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Nosotros: visión',
    campos: [
      {
        clave: 'nosotros.vision.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.vision.titulo_destacado',
        etiqueta: 'Título: parte destacada',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.vision.intro',
        etiqueta: 'Introducción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.vision.imagen',
        etiqueta: 'Imagen de la sección',
        tipo: 'imagen',
      },
      {
        clave: 'nosotros.vision.imagen_alt',
        etiqueta: 'Texto alternativo de la imagen',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.vision.punto1.titulo',
        etiqueta: 'Punto 1: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.vision.punto1.texto',
        etiqueta: 'Punto 1: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.vision.punto2.titulo',
        etiqueta: 'Punto 2: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.vision.punto2.texto',
        etiqueta: 'Punto 2: descripción',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Nosotros: valores',
    campos: [
      {
        clave: 'nosotros.valores.titulo',
        etiqueta: 'Título de la sección',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.valores.punto1.titulo',
        etiqueta: 'Valor 1: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.valores.punto1.texto',
        etiqueta: 'Valor 1: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.valores.punto2.titulo',
        etiqueta: 'Valor 2: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.valores.punto2.texto',
        etiqueta: 'Valor 2: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.valores.punto3.titulo',
        etiqueta: 'Valor 3: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.valores.punto3.texto',
        etiqueta: 'Valor 3: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.valores.punto4.titulo',
        etiqueta: 'Valor 4: título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.valores.punto4.texto',
        etiqueta: 'Valor 4: descripción',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Nosotros: cierre',
    campos: [
      {
        clave: 'nosotros.cierre.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.cierre.texto',
        etiqueta: 'Descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'nosotros.cierre.boton',
        etiqueta: 'Texto del botón',
        tipo: 'texto',
      },
      {
        clave: 'nosotros.cierre.imagen',
        etiqueta: 'Imagen de fondo',
        tipo: 'imagen',
        ayuda: 'Imagen decorativa: no lleva texto alternativo.',
      },
    ],
  },
  {
    grupo: 'Pagos: hero',
    campos: [
      {
        clave: 'pagos.hero.titulo',
        etiqueta: 'Título',
        tipo: 'texto',
      },
      {
        clave: 'pagos.hero.titulo_destacado',
        etiqueta: 'Título: parte destacada',
        tipo: 'texto',
        ayuda: 'Palabras finales del título resaltadas en color.',
      },
      {
        clave: 'pagos.hero.intro',
        etiqueta: 'Introducción',
        tipo: 'parrafo',
      },
      {
        clave: 'pagos.hero.aviso_titulo',
        etiqueta: 'Aviso de seguridad: título',
        tipo: 'texto',
      },
      {
        clave: 'pagos.hero.aviso_texto',
        etiqueta: 'Aviso de seguridad: texto',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Pagos: datos de la cuenta',
    campos: [
      {
        clave: 'pagos.cuenta.banco',
        etiqueta: 'Banco',
        tipo: 'texto',
      },
      {
        clave: 'pagos.cuenta.tipo',
        etiqueta: 'Tipo de cuenta',
        tipo: 'texto',
      },
      {
        clave: 'pagos.cuenta.numero',
        etiqueta: 'Número de cuenta',
        tipo: 'texto',
        ayuda: 'Se muestra en grande y con botón de copiar.',
      },
      {
        clave: 'pagos.cuenta.titular',
        etiqueta: 'Titular',
        tipo: 'texto',
      },
      {
        clave: 'pagos.cuenta.label_numero',
        etiqueta: 'Etiqueta del número de cuenta',
        tipo: 'texto',
      },
      {
        clave: 'pagos.cuenta.label_titular',
        etiqueta: 'Etiqueta del titular',
        tipo: 'texto',
      },
      {
        clave: 'pagos.qr.imagen',
        etiqueta: 'Imagen del código QR',
        tipo: 'imagen',
        ayuda: 'Elige la imagen del QR de la cuenta oficial.',
      },
      {
        clave: 'pagos.qr.texto',
        etiqueta: 'Texto bajo el QR',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Pagos: pasos',
    campos: [
      {
        clave: 'pagos.pasos.titulo',
        etiqueta: 'Título de la sección',
        tipo: 'texto',
      },
      {
        clave: 'pagos.pasos.paso1.titulo',
        etiqueta: 'Paso 1: título',
        tipo: 'texto',
      },
      {
        clave: 'pagos.pasos.paso1.texto',
        etiqueta: 'Paso 1: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'pagos.pasos.paso2.titulo',
        etiqueta: 'Paso 2: título',
        tipo: 'texto',
      },
      {
        clave: 'pagos.pasos.paso2.texto',
        etiqueta: 'Paso 2: descripción',
        tipo: 'parrafo',
      },
      {
        clave: 'pagos.pasos.paso3.titulo',
        etiqueta: 'Paso 3: título',
        tipo: 'texto',
      },
      {
        clave: 'pagos.pasos.paso3.texto',
        etiqueta: 'Paso 3: descripción',
        tipo: 'parrafo',
      },
    ],
  },
  {
    grupo: 'Catálogo',
    campos: [
      {
        clave: 'catalogo.titulo',
        etiqueta: 'Título de la página',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.titulo_destacado',
        etiqueta: 'Título: parte destacada',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.intro',
        etiqueta: 'Introducción',
        tipo: 'parrafo',
      },
      {
        clave: 'catalogo.boton',
        etiqueta: 'Texto de las tarjetas de servicio',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.boton_precios',
        etiqueta: 'Botón "ver precios"',
        tipo: 'texto',
        ayuda: 'Botón que descarga el catálogo en PDF.',
      },
      {
        clave: 'catalogo.detalle.volver',
        etiqueta: 'Enlace para volver al catálogo',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.detalle.productos_titulo',
        etiqueta: 'Título de la lista de productos',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.detalle.label_que_es',
        etiqueta: 'Etiqueta de la fila "qué es"',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.detalle.label_cuando',
        etiqueta: 'Etiqueta de la fila "cuándo se indica"',
        tipo: 'texto',
      },
      {
        clave: 'catalogo.detalle.relacionados_titulo',
        etiqueta: 'Título de las líneas relacionadas',
        tipo: 'texto',
      },
    ],
  },
];

/** Flat view of CONTENIDO_GRUPOS, used to validate a saved batch. */
export const CONTENIDO_CAMPOS: ContenidoCampo[] = CONTENIDO_GRUPOS.flatMap(
  (grupo) => grupo.campos,
);
