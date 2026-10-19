// Catalog data. Prices are intentionally NOT part of this model: they are
// distributed only through the downloadable PDF (see CATALOG_PDF_HREF).
export const CATALOG_PDF_HREF = "/catalogo-orthopro-lab.pdf";

export type CatalogItem = {
  code: string;
  name: string;
  indication: string;
  material: string;
  requirement: string;
  turnaround: string;
};

export type ServiceType = {
  slug: string;
  name: string;
  icon: "wrench" | "smile" | "layers" | "shield" | "gem";
  description: string;
  materialTag: string;
  turnaround: string;
  items: CatalogItem[];
};

export const SERVICES: ServiceType[] = [
  {
    slug: "ortodoncia-fija",
    name: "Ortodoncia Fija",
    icon: "wrench",
    description:
      "Aparatología fija y anclajes esqueléticos con soldadura láser micro-pulsada Nd:YAG, sin corrosión y con máxima biocompatibilidad.",
    materialTag: "ISO 22674 • Aleación médica",
    turnaround: "3 a 5 días hábiles",
    items: [
      { code: "OF-HYR-01", name: "Disyuntor Hyrax tipo Leone", indication: "Colapso transversal maxilar superior y mordida cruzada posterior esquelética.", material: "Husillo de acero inoxidable 316L y brazos de 1.5 mm con soldadura láser libre de plata.", requirement: "STL de arcada superior completa, antagonista y registro de mordida abierta de 2 mm.", turnaround: "4 días hábiles" },
      { code: "OF-HSS-02", name: "Disyuntor Haas", indication: "Disyunción palatina con anclaje adicional en bóveda para pacientes en crecimiento tardío.", material: "Resina acrílica autopolimerizable hipoalergénica con almohadillas palatinas anatómicas pulidas.", requirement: "STL superior con definición nítida de la bóveda palatina y molares.", turnaround: "5 días hábiles" },
      { code: "OF-NAN-03", name: "Botón de Nance / Arco lingual", indication: "Anclaje de molar máximo, mantenedor de espacio posterior y prevención de mesialización.", material: "Alambre elgiloy azul .036 / .040 templado y botón acrílico ultra-pulido.", requirement: "STL maxilar o mandibular con bandas ajustadas o impresión de arrastre.", turnaround: "3 días hábiles" },
    ],
  },
  {
    slug: "ortodoncia-removible",
    name: "Ortodoncia Removible",
    icon: "smile",
    description:
      "Aparatología funcional y placas activas polimerizadas en olla presurizada para reducir el monómero residual y evitar burbujas.",
    materialTag: "Acrílico biocompatible tipo 1",
    turnaround: "3 a 5 días hábiles",
    items: [
      { code: "OR-HWL-01", name: "Placa Hawley", indication: "Estabilización post-ortodoncia fija y cierre de micro-diastemas residuales.", material: "Resina acrílica traslúcida libre de cadmio, arco continuo .028 y retenedores Adams .028.", requirement: "STL completo con surco gingival y ecuador de coronas molares intactos.", turnaround: "3 días hábiles" },
      { code: "OR-SCW-02", name: "Expansor Schwarz con tornillo sectorial", indication: "Apiñamiento leve a moderado y vestibularización en dentición mixta.", material: "Tornillo de microexpansión Leone 0.2 mm por cuarto de vuelta y acrílico ortodóncico hidrófobo.", requirement: "STL intraoral con escaneo profundo del vestíbulo lingual y alveolar.", turnaround: "4 días hábiles" },
      { code: "OR-TWB-03", name: "Twin Block de Clark / Bionator de Balters", indication: "Corrección de Clase II esquelética por retrognatismo mandibular durante el pico de crecimiento.", material: "Bloques oclusales angulados a 70 grados, acrílico de alto impacto y ganchos Delta.", requirement: "STL bimaxilar y registro de mordida constructiva en cera con avance mandibular de 4 a 6 mm.", turnaround: "5 días hábiles" },
    ],
  },
  {
    slug: "alineadores-invisibles",
    name: "Alineadores Invisibles",
    icon: "layers",
    description:
      "Alineadores multicapa con setup CAD 3D y simulación interactiva previa a la aprobación médica.",
    materialTag: "Biopolímero Zendura FX® / Duran",
    turnaround: "Setup 3D en 48 h",
    items: [
      { code: "AL-PRO-CAD", name: "Plan de alineadores OrthoPro ClearFlex™", indication: "Maloclusiones leves a severas, apiñamiento, cierre de diastemas, rotaciones molares e intrusión guiada.", material: "Lámina tricapa elastomérica con núcleo elástico y conchas termoactivas de alta durabilidad.", requirement: "STL bimaxilar en oclusión, fotos intra/extraorales y RX panorámica o DICOM.", turnaround: "48 horas tras recepción del STL" },
      { code: "AL-ATT-02", name: "Guía de cementado de ataches y Aligner Lite", indication: "Recidivas anteriores, correcciones estéticas rápidas y alineación pre-protésica.", material: "Férula de transferencia flexible de silicona médica ultra-delgada para colocar el composite.", requirement: "STL bimaxilar en oclusión.", turnaround: "3 días hábiles" },
    ],
  },
  {
    slug: "retenedores-y-ferulas",
    name: "Retenedores y Férulas",
    icon: "shield",
    description:
      "Férulas de descarga y retenedores fresados por CAD/CAM o termoformados a presión variable.",
    materialTag: "PMMA libre de bisfenol A",
    turnaround: "24 h a 4 días hábiles",
    items: [
      { code: "RF-MIC-01", name: "Férula de descarga Michigan rígida (ATM / bruxismo)", indication: "Bruxismo severo, dolor miofascial y trastornos internos de ATM.", material: "Disco de resina PMMA biocompatible transparente fresado por CAD/CAM, o acrílico termopolimerizable.", requirement: "STL bimaxilar completo con registro en relación céntrica (Jig de Lucia o Leaf Gauge).", turnaround: "4 días hábiles" },
      { code: "RF-ESX-02", name: "Retenedores transparentes Essix Plus™ (0.75 / 1.0 mm)", indication: "Retención final post-ortodoncia con máxima discreción visual y protección oclusal leve.", material: "Copoliéster Erkodur con recorte festoneado o gingival.", requirement: "STL digital de fin de tratamiento o del retiro de brackets, sin deformaciones.", turnaround: "24 a 48 horas" },
      { code: "RF-FIX-03", name: "Retenedores fijos trenzados CAD con guía de transferencia", indication: "Retención lingual 3 a 3 o 4 a 4 en casos de alta tendencia a la recidiva.", material: "Titanio grado V maquinado o alambre trenzado coaxial de acero 316.", requirement: "STL inferior o superior de alta resolución con cíngulos limpios.", turnaround: "48 horas" },
    ],
  },
  {
    slug: "protesis-cad-cam",
    name: "Prótesis y CAD/CAM",
    icon: "gem",
    description:
      "Estructuras cerámicas y prótesis implantosoportada con fresado simultáneo de 5 ejes y sinterizado lento.",
    materialTag: "Zirconia 5Y-PSZ • IPS e.max",
    turnaround: "4 a 5 días hábiles",
    items: [
      { code: "CAD-ZIR-01", name: "Circonio monolítico multicapa 3D Pro", indication: "Coronas unitarias posteriores, puentes de tramo largo y rehabilitación sobre implantes.", material: "Circonio en gradiente con alta translucidez incisal y resistencia cervical superior a 1200 MPa.", requirement: "STL de muñón o scan body de implante con perfil de emergencia escaneado.", turnaround: "4 días hábiles" },
      { code: "CAD-EMX-02", name: "Disilicato de litio prensado / fresado (e.max)", indication: "Carillas de mínima preparación (0.3 mm), inlays/onlays y coronas anteriores.", material: "Pastillas IPS e.max Press / CAD con estratificación cerámica de esmaltes opalescentes.", requirement: "STL con márgenes nítidos supragingivales o yuxtagingivales y color de sustrato.", turnaround: "5 días hábiles" },
      { code: "CAD-IMP-03", name: "Corona atornillada híbrida sobre Ti-Base", indication: "Rehabilitación atornillada unitaria directa a implante con chimenea angulable hasta 25 grados.", material: "Base de titanio grado V certificada y superestructura de zirconia traslúcida cementada en laboratorio.", requirement: "STL con scan body oficial de la marca del implante, antagonista y oclusión.", turnaround: "5 días hábiles" },
    ],
  },
];

export function getService(slug: string): ServiceType | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
