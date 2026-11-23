import { texto, type Contenido } from "./content";

/** One question of the `<details>` list, also the source of the FAQPage JSON-LD. */
export type FAQ = { pregunta: string; respuesta: string };

/** Home: 3 operational questions, then the general ones (same order as the design). */
export const HOME_FAQ: FAQ[] = [
  {
    pregunta: "¿Cómo les llegan las impresiones?",
    respuesta: "Recibimos las impresiones del caso para trabajar sobre ellas.",
  },
  {
    pregunta: "¿Dónde veo los precios?",
    respuesta: "Descarga el catálogo en PDF para ver el precio de cada línea.",
  },
  {
    pregunta: "¿Cómo pago?",
    respuesta: "Pagas en la cuenta bancaria oficial y luego confirmas el pago.",
  },
  {
    pregunta: "¿Qué prótesis se recomiendan más a los pacientes?",
    respuesta:
      "La prótesis más adecuada depende de la salud oral del paciente, los dientes que faltan, la mordida, el soporte óseo y el presupuesto. El odontólogo y el equipo del laboratorio dental suelen evaluar si conviene una opción removible, fija o sobre implantes.",
  },
  {
    pregunta: "¿Cuántas clínicas dentales hay en Colombia?",
    respuesta:
      "No hay una cifra única que se mantenga actualizada por mucho tiempo, porque las clínicas abren, cierran y se registran de formas distintas. Para un conteo exacto conviene consultar los registros oficiales de empresas y de salud de Colombia.",
  },
  {
    pregunta: "¿Cuánto cuesta una consulta con el odontólogo en Colombia?",
    respuesta:
      "El costo varía mucho según la ciudad, el tipo de consulta y el tratamiento necesario. Una valoración sencilla suele costar menos que procedimientos como restauraciones, endodoncias, prótesis o trabajos con implantes.",
  },
  {
    pregunta: "¿Qué servicios ofrece un laboratorio dental?",
    respuesta:
      "Un laboratorio dental fabrica y repara, a partir de la prescripción del odontólogo, piezas como coronas, puentes, prótesis, férulas y aparatos de ortodoncia. También ayuda a personalizar el material, la forma, el color y el ajuste para que el trabajo final se parezca lo más posible a la boca del paciente.",
  },
  {
    pregunta: "¿Cómo elegir un laboratorio dental en Medellín?",
    respuesta:
      "Busca un laboratorio dental con experiencia, comunicación clara con los odontólogos, control de calidad constante y buenos tiempos de entrega. También conviene preguntar por los materiales que usan, los tipos de trabajo que hacen y cómo manejan los ajustes o las repeticiones.",
  },
];

/** Article: the 5 general questions (same text as the last five of the home). */
export const ARTICLE_FAQ: FAQ[] = [
  {
    pregunta: "¿Qué prótesis se recomiendan más a los pacientes?",
    respuesta:
      "La prótesis más adecuada depende de la salud oral del paciente, los dientes que faltan, la mordida, el soporte óseo y el presupuesto. El odontólogo y el equipo del laboratorio dental suelen evaluar si conviene una opción removible, fija o sobre implantes.",
  },
  {
    pregunta: "¿Cuántas clínicas dentales hay en Colombia?",
    respuesta:
      "No hay una cifra única que se mantenga actualizada por mucho tiempo, porque las clínicas abren, cierran y se registran de formas distintas. Para un conteo exacto conviene consultar los registros oficiales de empresas y de salud de Colombia.",
  },
  {
    pregunta: "¿Cuánto cuesta una consulta con el odontólogo en Colombia?",
    respuesta:
      "El costo varía mucho según la ciudad, el tipo de consulta y el tratamiento necesario. Una valoración sencilla suele costar menos que procedimientos como restauraciones, endodoncias, prótesis o trabajos con implantes.",
  },
  {
    pregunta: "¿Qué servicios ofrece un laboratorio dental?",
    respuesta:
      "Un laboratorio dental fabrica y repara, a partir de la prescripción del odontólogo, piezas como coronas, puentes, prótesis, férulas y aparatos de ortodoncia. También ayuda a personalizar el material, la forma, el color y el ajuste para que el trabajo final se parezca lo más posible a la boca del paciente.",
  },
  {
    pregunta: "¿Cómo elegir un laboratorio dental en Medellín?",
    respuesta:
      "Busca un laboratorio dental con experiencia, comunicación clara con los odontólogos, control de calidad constante y buenos tiempos de entrega. También conviene preguntar por los materiales que usan, los tipos de trabajo que hacen y cómo manejan los ajustes o las repeticiones.",
  },
];

/**
 * Same list with each answer replaced by its editable content key
 * `<clave>.<n>.respuesta` when an administrator saved one.
 */
export function faqConContenido(
  items: FAQ[],
  contenido: Contenido,
  clave: string,
): FAQ[] {
  return items.map((item, i) => ({
    pregunta: item.pregunta,
    respuesta: texto(contenido, `${clave}.${i + 1}.respuesta`, item.respuesta),
  }));
}
