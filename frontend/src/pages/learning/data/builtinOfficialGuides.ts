import type { OfflineLearningMaterial } from '@/entities/campesino/model/types';

export interface QuickGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  tip?: string;
}

export interface QuickFieldGuide {
  id: string;
  title: string;
  category: string;
  entity: 'ICA' | 'AGROSAVIA' | 'FEDEGÁN - FNG' | 'SENA' | 'CIPAV' | 'FAO / MinAgricultura';
  readingTimeMinutes: number;
  level: string;
  summary: string;
  requirements: string[];
  steps: QuickGuideStep[];
  warning?: string;
  officialReference?: {
    name: string;
    url: string;
  };
}

export interface OfficialRepository {
  id: string;
  name: string;
  entity: string;
  url: string;
  badge: string;
  description: string;
  bestFor: string;
  freeAccessNote: string;
}

/**
 * Repositorios oficiales estatales y gremiales de Colombia con acceso 100% libre y gratuito.
 */
export const OFFICIAL_REPOSITORIES: OfficialRepository[] = [
  {
    id: 'bac-agrosavia',
    name: 'Biblioteca Agropecuaria de Colombia (BAC)',
    entity: 'AGROSAVIA',
    url: 'https://repository.agrosavia.co',
    badge: 'Investigación Abierta',
    description:
      'Repositorio institucional digital con más de 10.000 títulos, cartillas técnicas de campo, manuales zootécnicos y publicaciones de libre descarga para ganadería y agricultura colombiana.',
    bestFor: 'Buenas Prácticas Ganaderas, sanidad preventiva en doble propósito, alimentación con forrajes locales.',
    freeAccessNote: 'Acceso público y gratuito bajo licencia Creative Commons / Open Access institucional.',
  },
  {
    id: 'portal-ica',
    name: 'Normatividad Sanitaria y Guías BPG',
    entity: 'ICA (Instituto Colombiano Agropecuario)',
    url: 'https://www.ica.gov.co',
    badge: 'Autoridad Sanitaria',
    description:
      'Plataforma oficial que alberga resoluciones vigentes (Res. 068167 / Res. 115708 ASI), calendarios de vacunación contra Aftosa y Brucelosis, guías para el plan sanitario del hato y listas de chequeo oficial.',
    bestFor: 'Requisitos sanitarios obligatorios, trazabilidad, botiquín ganadero y tiempos de retiro.',
    freeAccessNote: 'Normas técnicas y formatos de libre acceso ciudadano.',
  },
  {
    id: 'fedegan-fng',
    name: 'Manual Práctico Ganadero y Publicaciones Técnicas',
    entity: 'FEDEGÁN - Fondo Nacional del Ganado',
    url: 'https://www.fedegan.org.co',
    badge: 'Gremio Ganadero',
    description:
      'Compilación de cartillas y módulos técnicos del gremio ganadero colombiano a través de CONtexto Ganadero y el Manual Práctico Ganadero (MPG).',
    bestFor: 'Aforo de praderas, conservación de forrajes (ensilaje y henificación), bloques nutricionales para sequía.',
    freeAccessNote: 'Cartillas, guías y videos pedagógicos de consulta abierta.',
  },
  {
    id: 'sena-agro',
    name: 'Repositorio Institucional SENA (Sector Pecuario)',
    entity: 'SENA',
    url: 'https://repositorio.sena.edu.co',
    badge: 'Formación Campesina',
    description:
      'Biblioteca digital de cartillas didácticas de capacitación campesina orientadas a la formación práctica de mayordomos, ordeñadores y administradores de fincas.',
    bestFor: 'Rutinas de ordeño higiénico, inseminación artificial básica, registros productivos de campo.',
    freeAccessNote: 'Material didáctico público financiado por el Estado colombiano.',
  },
  {
    id: 'cipav-sostenible',
    name: 'Guías de Ganadería Sostenible y Silvopastoril',
    entity: 'CIPAV',
    url: 'https://www.cipav.org.co',
    badge: 'Sostenibilidad y Clima',
    description:
      'Publicaciones científicas y prácticas enfocadas en Sistemas Silvopastoriles Intensivos (SSPi), siembra de bancos forrajeros proteicos y protección de cuencas en predios ganaderos.',
    bestFor: 'Siembra de Botón de oro, Matarratón y Leucaena, cosecha de agua de lluvia y bienestar en pastoreo.',
    freeAccessNote: 'Libros, manuales y cartillas disponibles en PDF sin costo.',
  },
];

/**
 * Guías operativas de campo pre-empaquetadas.
 * 100% offline, listas para consultar en el corral o potrero sin depender de internet ni de la base de datos.
 */
export const BUILTIN_QUICK_GUIDES: QuickFieldGuide[] = [
  {
    id: 'aforo-potreros',
    title: 'Aforo de Potrero con Marco de 1 m² y Capacidad de Carga',
    category: 'Pastos y Aforo',
    entity: 'FEDEGÁN - FNG',
    readingTimeMinutes: 4,
    level: 'Práctico de Campo',
    summary:
      'Método rápido del metro cuadrado para determinar cuántos kilogramos de pasto produce el potrero y calcular con exactitud cuántos animales y días de pastoreo soporta sin degradar la pradera.',
    requirements: [
      'Marco cuadrado de 1 m x 1 m (madera o tubo PVC)',
      'Machete o tijera de podar afilada',
      'Bolsa plástica grande resistente',
      'Balanza de reloj o dinamómetro portátil (en gramos o kilos)',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Muestreo en 5 puntos representativos',
        description:
          'Recorre el potrero en diagonal ("en zanja o zig-zag") y lanza el marco al azar en 5 sitios: 2 zonas de pasto alto, 2 zonas de pasto medio y 1 zona de pasto ralo o bajo. Así evitarás sobreestimar o subestimar la comida disponible.',
        tip: 'Nunca tires el marco buscando solo el mejor pasto; el muestreo debe reflejar la realidad del lote.',
      },
      {
        stepNumber: 2,
        title: 'Corte a la altura de remanente recomendada',
        description:
          'Corta todo el forraje verde que quede dentro del marco. Deja siempre entre 7 y 10 cm de remanente sobre el suelo (en pastos amacollados o rastreros) para proteger los puntos de rebrote del pasto.',
      },
      {
        stepNumber: 3,
        title: 'Pesaje y promedio por metro cuadrado',
        description:
          'Pesa el pasto cortado de cada punto en la balanza (restando el peso de la bolsa). Suma los 5 pesos y divide entre 5. Ese resultado es tu Producción Bruta por metro cuadrado (kg/m²).',
        tip: 'Un potrero promedio en buen estado suele rendir entre 1.5 y 3.5 kg de forraje verde por m².',
      },
      {
        stepNumber: 4,
        title: 'Descuento por pisoteo y bosta (Forraje Aprovechable)',
        description:
          'Multiplica el promedio por 0.70 o 0.75 para descontar entre un 25% y 30% por concepto de pisoteo, estiércol, orina y rechazo natural del ganado.',
      },
      {
        stepNumber: 5,
        title: 'Cálculo de días de ocupación del lote',
        description:
          'Multiplica el forraje aprovechable por los metros cuadrados del potrero (1 hectárea = 10.000 m²). Divide esa comida total entre el consumo diario del lote (calcula aprox. 45 a 50 kg de forraje verde al día por vaca adulta de 450 kg). El resultado son los días exactos que el ganado debe permanecer en el potrero.',
      },
    ],
    warning:
      'Nunca dejes que el ganado "raspe" el suelo por debajo de los 5 cm. Un sobrepastoreo severo agota las reservas de la raíz y triplica el tiempo de descanso del potrero (de 30 días a más de 70 días).',
    officialReference: {
      name: 'FEDEGÁN - Cartilla Técnica de Aforo de Praderas',
      url: 'https://www.fedegan.org.co',
    },
  },
  {
    id: 'rutina-ordeno-bpo',
    title: 'Rutina de Ordeño Limpio y Control de Mastitis (BPO)',
    category: 'Ordeño y Calidad',
    entity: 'SENA',
    readingTimeMinutes: 5,
    level: 'Operarios y Ordeñadores',
    summary:
      'Protocolo higiénico paso a paso para evitar la mastitis en las vacas, reducir el recuento de células somáticas y garantizar leche limpia y de alta calidad para la cantina o la quesería.',
    requirements: [
      'Tazón de fondo negro para prueba de despunte',
      'Solución preselladora desinfectante para pezones',
      'Toallas de papel secante individuales desechables',
      'Sellador de pezones con yodo al 1% o base cosmética de barrera',
      'Balde y cantina de aluminio o acero inoxidable limpios y secos',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Arreo tranquilo y bienestar animal',
        description:
          'Llevar las vacas al corral con calma, sin gritos, varazos ni perros. El estrés libera adrenalina, la cual bloquea la oxitocina e impide que la vaca baje la leche por completo.',
      },
      {
        stepNumber: 2,
        title: 'Despunte obligatorio en tazón de fondo negro',
        description:
          'Extrae los primeros 2 a 3 chorros de cada pezón sobre el fondo negro. Examina visualmente: si hay grumos, hilos de sangre, pus o líquido aguado, marca el cuarto como afectado por mastitis clínica. Nunca arrojes el despunte al piso del corral, pues propaga la bacteria.',
        tip: 'El primer chorro concentra la mayor carga bacteriana acumulada en el canal del pezón.',
      },
      {
        stepNumber: 3,
        title: 'Lavado y secado con toalla individual',
        description:
          'Lava los pezones únicamente si están embarrados con tierra o bosta. Seca cada pezón con una toalla de papel desechable exclusiva. Jamás uses un trapo de tela compartido entre vacas, ya que es el principal vector de contagio de mastitis contagiosa.',
      },
      {
        stepNumber: 4,
        title: 'Ordeño suave, continuo y a fondo',
        description:
          'Ordeña con suavidad utilizando toda la mano ("puño cerrado") sin pellizcar ni halar hacia abajo. El ordeño debe completarse en un lapso de 5 a 7 minutos mientras el estímulo de la oxitocina esté activo.',
      },
      {
        stepNumber: 5,
        title: 'Sellado post-ordeño de pezones',
        description:
          'Apenas termines, sumerge al menos dos tercios de cada pezón en el sellador de yodo al 1%. Esto crea una película antiséptica protectora mientras el esfínter del pezón permanece abierto.',
      },
      {
        stepNumber: 6,
        title: 'Comida fresca para mantener la vaca de pie',
        description:
          'Ofrece forraje fresco, pasto de corte o heno en el corral inmediatamente después de ordeñar para que la vaca se quede parada comiendo al menos 30 a 40 minutos mientras se cierra herméticamente el canal del pezón.',
      },
    ],
    warning:
      'Las vacas que estén bajo tratamiento con antibióticos deben ordeñarse SIEMPRE al final de la faena. Su leche debe descartarse durante todos los días del Tiempo de Retiro (T.R.) para no contaminar la cantina colectiva.',
    officialReference: {
      name: 'ICA - Manual de Buenas Prácticas Ganaderas en Leche (Res. 068167)',
      url: 'https://www.ica.gov.co',
    },
  },
  {
    id: 'atencion-ternero-neonato',
    title: 'Atención del Ternero al Nacer: Cura de Ombligo y Calostrado',
    category: 'Cría y Reproducción',
    entity: 'AGROSAVIA',
    readingTimeMinutes: 4,
    level: 'Mayordomos y Vaqueros',
    summary:
      'Las primeras 4 horas definen la vida o muerte del ternero. Aprende a realizar la desinfección profunda del cordón umbilical y asegurar el consumo oportuno de defensas maternas en el calostro.',
    requirements: [
      'Frasco de boca ancha con tintura de yodo al 7%',
      'Toallas o sacos de fique secos y limpios',
      'Biberón ternero o cubeta higiénica limpia',
      'Báscula o cinta pesadora bovina',
      'Chapa o arete de identificación numerada',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Despejar vías respiratorias y secado',
        description:
          'Apenas nazca el ternero, limpia con la mano o un paño limpio las flemas y mucosidades de la boca y fosas nasales. Si no respira rápido, estimula el pecho frotando con un trapo seco o introduce suavemente una brizna de paja limpia en la nariz para provocar un estornudo.',
      },
      {
        stepNumber: 2,
        title: 'Inmersión del ombligo en yodo al 7%',
        description:
          'Sumerge todo el cordón umbilical en el frasco con tintura de yodo al 7% durante 45 a 60 segundos, asegurando que el yodo moje la base misma de la barriga del ternero. Repite la cura en la mañana y en la tarde durante los primeros 3 días hasta que el cordón seque como una pita.',
        tip: 'Nunca uses alcohol puro o yodo diluido al 1%; se necesita yodo al 7% para quemar y sellar los vasos sanguíneos.',
      },
      {
        stepNumber: 3,
        title: 'Suministro del primer calostro (Regla de las 4 Horas)',
        description:
          'El ternero nace sin defensas inmunitarias en su sangre. Debe mamar o recibir en biberón calostro de su madre en las primeras 4 horas de vida. El volumen debe ser igual al 10% de su peso vivo (un ternero de 35 kg necesita tomar 3.5 litros de calostro en sus primeras 6 a 8 horas).',
      },
      {
        stepNumber: 4,
        title: 'Pesaje y registro zootécnico en la aplicación',
        description:
          'Pesa al ternero al nacer, anota en Villa Luz su peso, fecha y hora de nacimiento, número de la madre, sexo y colócale la chapa o caravana correspondiente.',
      },
    ],
    warning:
      'Pasadas las 6 a 8 horas de nacido, la pared intestinal del ternero se cierra y ya no absorbe las inmunoglobulinas del calostro. Si no toma calostro a tiempo, quedará desprotegido contra neumonías y diarreas que causan alta mortalidad.',
    officialReference: {
      name: 'AGROSAVIA - Sanidad y Manejo del Ternero Neonato',
      url: 'https://repository.agrosavia.co',
    },
  },
  {
    id: 'deteccion-celo-bovino',
    title: 'Detección de Celo y Regla Mañana-Tarde para Servicio',
    category: 'Cría y Reproducción',
    entity: 'FEDEGÁN - FNG',
    readingTimeMinutes: 4,
    level: 'Mayordomos y Vaqueros',
    summary:
      'Identificación certera de los signos primarios y secundarios de celo en novillas y vacas para programar la inseminación artificial o el salto del toro reproductor en el momento óptimo de fertilidad.',
    requirements: [
      'Cuaderno o registro móvil de celos Villa Luz',
      'Tiza o pintura de marcación de anca (opcional)',
      'Reloj para registrar hora exacta de inicio',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Horarios clave de observación',
        description:
          'Observa el lote de hembras dos veces al día en momentos tranquilos: de 5:30 am a 6:30 am y de 5:30 pm a 6:30 pm. Más del 70% de los celos inician al anochecer o de madrugada.',
      },
      {
        stepNumber: 2,
        title: 'Signo cardinal: Reflejo de inmovilidad',
        description:
          'La vaca verdaderamente en celo es aquella que se queda completamente inmóvil cuando otra vaca la monta por detrás. Si la vaca monta a otras pero huye cuando la montan, está en "pre-celo" pero aún no es el momento de servirla.',
      },
      {
        stepNumber: 3,
        title: 'Signos secundarios de confirmación',
        description:
          'Presencia de moco cristalino, elástico y transparente ("tipo clara de huevo") que cuelga de la vulva, labios vulvares inflamados y enrojecidos, mugidos constantes, pelo raspado o sucio sobre el anca y caída transitoria de la producción de leche.',
      },
      {
        stepNumber: 4,
        title: 'Aplicar la Regla Mañana-Tarde',
        description:
          'Si la vaca se queda quieta en celo durante la mañana: debe inseminarse o servirse por la tarde (12 horas después). Si la vaca entra en celo fijo durante la tarde o noche: debe inseminarse o recibir el toro a primera hora de la mañana siguiente.',
      },
    ],
    warning:
      'Inseminar antes de 8 horas o después de 20 horas de iniciado el celo provoca pérdidas de preñez porque el óvulo o los espermatozoides mueren antes de encontrarse en el oviducto.',
    officialReference: {
      name: 'SENA - Manual de Reproducción y Mejoramiento Bovino',
      url: 'https://repositorio.sena.edu.co',
    },
  },
  {
    id: 'ensilaje-artesanal-bolsa',
    title: 'Ensilaje Artesanal en Bolsa Plástica para Verano',
    category: 'Nutrición y Forrajes',
    entity: 'FEDEGÁN - FNG',
    readingTimeMinutes: 5,
    level: 'Práctico de Campo',
    summary:
      'Guía paso a paso para picar, compactar y ensilar maíz, sorgo o pasto de corte (Cuba 22, Maralfalfa) en bolsas plásticas tubulares calibre 5 o 6 para tener comida garantizada durante sequías.',
    requirements: [
      'Picapasto bien afilada (tamaño de corte 1.5 a 2.5 cm)',
      'Bolsas plásticas tubulares negras o transparentes calibre 5 o 6 (capacidad 40 a 50 kg)',
      'Pita plástica gruesa o zuncho para amarre',
      'Melaza de caña diluida en agua al 10% (1 parte de melaza por 2 de agua)',
      'Pisón de madera o botas limpias para apisonar',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Momento óptimo de cosecha del forraje',
        description:
          'Si es maíz o sorgo, córtalo cuando el grano esté en estado lechoso-pastoso (aprox. 30% a 35% de materia seca). Si es pasto de corte (Cuba 22, Clon 51, Maralfalfa), corta a los 60-70 días de rebrote y déjalo otear bajo sombra unas 3 horas para evaporar el exceso de agua.',
      },
      {
        stepNumber: 2,
        title: 'Picado uniforme de 2 centímetros',
        description:
          'Pica el forraje en trozos finos de 1.5 a 2.5 cm. Un picado homogéneo facilita que el material se apelmace sin dejar cámaras de aire y rompe la fibra para que las bacterias lácticas fermenten rápidamente.',
      },
      {
        stepNumber: 3,
        title: 'Llenado y pisoteo capa por capa',
        description:
          'Coloca la bolsa vertical y agrega capas de 20 cm de forraje picado. Con las botas o el pisón de madera, apisona enérgicamente contra el fondo y los bordes para expulsar todo el aire posible. Repite hasta llenar las tres cuartas partes de la bolsa.',
      },
      {
        stepNumber: 4,
        title: 'Aspersión ligera de melaza diluida',
        description:
          'En cada capa, rocía una pequeña cantidad de la mezcla de melaza y agua para aportar azúcares solubles que alimenten las bacterias benéficas de fermentación anaeróbica.',
      },
      {
        stepNumber: 5,
        title: 'Extracción de aire y amarre hermético',
        description:
          'Comprime el cuello de la bolsa hacia abajo para sacar el último aliento de aire, retuerce con fuerza la boca y sella con doble vuelta de pita o cinta de zuncho.',
      },
      {
        stepNumber: 6,
        title: 'Bodegaje seguro y tiempo de fermentación',
        description:
          'Almacena las bolsas sobre estibas de madera bajo techo o cubiertas con lona en un sitio seco, libre de ratas, perros o gallinas que piquen el plástico. Deja fermentar mínimo 25 a 30 días antes de alimentar al lote.',
      },
    ],
    warning:
      'Si una bolsa se rompe, el oxígeno entrará y se formarán hongos tóxicos y bacterias butíricas (olor a podrido o vinagre agrio). Sella de inmediato cualquier fisura con cinta impermeable. Si el silo está negro o baboso, no lo des a las vacas.',
    officialReference: {
      name: 'FEDEGÁN - Cartilla de Conservación de Forrajes',
      url: 'https://www.fedegan.org.co',
    },
  },
  {
    id: 'bpg-sanidad-botiquin-ica',
    title: 'Plan Sanitario Básico Oficial ICA y Botiquín de Finca',
    category: 'Sanidad y Bioseguridad',
    entity: 'ICA',
    readingTimeMinutes: 4,
    level: 'Técnico y Mayordomos',
    summary:
      'Requisitos fundamentales de bioseguridad ganadera: ciclos nacionales obligatorios de vacunación (Aftosa y Brucelosis), organización del botiquín y registro de tiempos de retiro.',
    requirements: [
      'Gabinete de botiquín bajo llave, fresco y seco',
      'Nevera o termo para conservar vacunas entre 2°C y 8°C',
      'Jeringas dosificadoras automáticas y agujas limpias (16G y 18G)',
      'Cuaderno de registro oficial de tratamientos médicos',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cumplir los 2 ciclos oficiales de vacunación',
        description:
          'Permitir y coordinar con el vacunador oficial de Fedegán/FNG la inmunización total de la finca contra Fiebre Aftosa y la vacunación de hembras entre 3 y 8 meses contra Brucelosis Bovina (cepa 19 o RB51). Conservar siempre el RUV (Registro Único de Vacunación).',
      },
      {
        stepNumber: 2,
        title: 'Vacunación preventiva de mancha (Carbón)',
        description:
          'Aplicar bacterina triple o polivalente (Carbón sintomático, Edema maligno y Septicemia) a todos los terneros a partir de los 3 meses de edad con su correspondiente revacunación anual.',
      },
      {
        stepNumber: 3,
        title: 'Control rotacional de garrapatas y moscas',
        description:
          'Evita usar siempre el mismo químico para bañar. Rota la molécula (organofosforados, piretroides, amitraz o ivermectinas) cada 3 a 4 aplicaciones para evitar que las garrapatas se vuelvan resistentes.',
      },
      {
        stepNumber: 4,
        title: 'Registro de medicamentos y Tiempo de Retiro (T.R.)',
        description:
          'Cada vez que apliques un medicamento, anota en Villa Luz: fecha, número de la vaca, nombre comercial, dosis aplicada y los días de retiro en leche y carne especificados en la etiqueta.',
      },
    ],
    warning:
      'Prohibido terminantemente usar medicamentos vencidos, sin registro ICA o sobrantes de frascos con tapas deterioradas. Entregar leche o mandar al matadero animales con residuos de antibiótico acarrea sanciones del ICA y rechazo de la planta compradora.',
    officialReference: {
      name: 'ICA - Resolución 068167 de 2020 (Certificación BPG Bovinos)',
      url: 'https://www.ica.gov.co',
    },
  },
  {
    id: 'banco-forrajero-cipav',
    title: 'Establecimiento de Bancos Forrajeros: Botón de Oro y Matarratón',
    category: 'Sistemas Sostenibles',
    entity: 'CIPAV',
    readingTimeMinutes: 5,
    level: 'General y Técnico',
    summary:
      'Cómo sembrar y manejar bancos de proteína de alta producción con Botón de Oro (Tithonia diversifolia) y Matarratón (Gliricidia sepium) para suministrar forraje con 18% a 24% de proteína cruda a bajo costo.',
    requirements: [
      'Estacas leñosas maduras de Botón de Oro (30 a 40 cm de longitud)',
      'Estacones o varetas de Matarratón maduro',
      'Azadón, pala y abono orgánico compostado',
      'Aislamiento con cerca eléctrica para impedir entrada de ganado',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Ubicación y aislamiento total del lote',
        description:
          'Ubica el banco forrajero cerca del establo o sala de ordeño para facilitar el acarreo. Aísla con cerca eléctrica para que el ganado no coma los brotes tiernos durante el enraizamiento.',
      },
      {
        stepNumber: 2,
        title: 'Siembra en ángulo de 45 grados',
        description:
          'Entierra las estacas de Botón de Oro con 45° de inclinación, dejando dos yemas bajo tierra y una yema expuesta al sol. La distancia entre plantas y surcos debe ser de 0.8 m a 1 m.',
      },
      {
        stepNumber: 3,
        title: 'Corte de uniformidad a los 4 meses',
        description:
          'A los 110-120 días de siembra, haz un corte parejo a 40 o 50 cm de altura del suelo. Esto detiene el crecimiento leñoso e induce la ramificación múltiple de tallos tiernos y hojas.',
      },
      {
        stepNumber: 4,
        title: 'Corte y suministro en canoa (Corte y Acarreo)',
        description:
          'Cosecha cada 45 a 60 días en época de lluvia. Pica el forraje verde y mézclalo con gramíneas o caña en la canoa de los comederos. Proporciona hasta un 25% de la ración diaria.',
      },
    ],
    warning:
      'No dejes entrar las vacas a pastorear directamente sobre el banco forrajero. Los animales arrancan los tocones y destruyen las raíces. El manejo correcto es corte y acarreo manual.',
    officialReference: {
      name: 'CIPAV - Sistemas Silvopastoriles y Arbustos Forrajeros',
      url: 'https://www.cipav.org.co',
    },
  },
  {
    id: 'agua-bebederos-finca',
    title: 'Cosecha de Agua y Desinfección Periódica de Bebederos',
    category: 'Agua y Clima',
    entity: 'CIPAV',
    readingTimeMinutes: 4,
    level: 'General',
    summary:
      'Una vaca lechera consume hasta 90 litros de agua limpia al día. Aprende a instalar captación de agua de lluvia en los establos y mantener bebederos limpios y desinfectados sin lama ni parásitos.',
    requirements: [
      'Canaletas de PVC en aleros de techos con malla mosquitera en la bajante',
      'Tanque plástico o reservorio cubierto',
      'Cepillo de cerdas duras para fregar paredes',
      'Hipoclorito de sodio común (cloro casero al 5%)',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Cálculo de la demanda hídrica del lote',
        description:
          'Calcula el agua requerida: una vaca adulta en producción de leche necesita entre 70 y 100 litros de agua fresca diarios; el ganado de ceba o cría entre 45 y 65 litros. Si no hay suficiente agua, la producción de leche cae un 30% de inmediato.',
      },
      {
        stepNumber: 2,
        title: 'Captación de lluvia con trampa de hojas',
        description:
          'Conecta las canaletas de los galpones y establos a tanques de almacenamiento. Coloca una malla en el tubo de entrada para filtrar ramitas, polvo y hojas antes de que entren al depósito.',
      },
      {
        stepNumber: 3,
        title: 'Vaciado y cepillado semanal de bebederos',
        description:
          'Vacía el bebedero cada 8 a 15 días y friega con el cepillo para eliminar la lama verde y sedimentos de tierra donde proliferan caracoles (hospedadores de Fasciola hepática) y larvas de zancudos.',
      },
      {
        stepNumber: 4,
        title: 'Desinfección con cloro casero',
        description:
          'Desinfecta con una solución de 2 cucharadas de cloro por cada 100 litros de agua. Deja actuar 15 minutos, enjuaga brevemente y vuelve a llenar con agua fresca.',
      },
      {
        stepNumber: 5,
        title: 'Sombra sobre los bebederos en el potrero',
        description:
          'Siembra un árbol nativo de copa ancha o instala un sombrío rústico cerca al bebedero. El ganado rechaza el agua caliente por encima de 28°C y aguanta sed, lo que disminuye el consumo de pasto.',
      },
    ],
    warning:
      'Nunca dejes que el ganado beba directamente en las nacientes de agua o charcas con lodo y bosta. Esto contamina la cuenca de la vereda y contagia enfermedades hídricas y podales en los animales.',
    officialReference: {
      name: 'CIPAV - Manejo Integral del Agua en Ganadería Colombiana',
      url: 'https://www.cipav.org.co',
    },
  },
];

/**
 * Catálogo descargable oficial de respaldo pre-instalado.
 * Garantiza que la pestaña de biblioteca oficial nunca esté vacía aunque no haya conexión a la BD.
 */
export const BUILTIN_OFFICIAL_CATALOG: OfflineLearningMaterial[] = [
  {
    id: 101,
    title: 'Guía ICA de Buenas Prácticas Ganaderas (BPG) en Bovinos',
    category: 'Sanidad y Bioseguridad',
    content_type: 'PDF' as any,
    summary:
      'Manual y requisitos oficiales del ICA para predios productores de leche y carne bovina. Incluye sanidad animal, bioseguridad, control del botiquín y tiempos de retiro (Resolución 068167).',
    local_uri: 'https://www.ica.gov.co',
    reading_level: 'Técnico y Mayordomos',
    language: 'es',
    is_active: true,
  },
  {
    id: 102,
    title: 'Manual de Ganadería Bovina de Doble Propósito: Excelencia Sanitaria (AGROSAVIA)',
    category: 'Sanidad y Bioseguridad',
    content_type: 'PDF' as any,
    summary:
      'Publicación técnica oficial de AGROSAVIA orientada a la medicina preventiva en hatos de doble propósito, control integral de parásitos y manejo sanitario del lote.',
    local_uri: 'https://repository.agrosavia.co',
    reading_level: 'Productores y Mayordomos',
    language: 'es',
    is_active: true,
  },
  {
    id: 103,
    title: 'Cartilla de Aforo de Praderas y Manejo de Pasturas (FEDEGÁN - FNG)',
    category: 'Pastos y Aforo',
    content_type: 'PDF' as any,
    summary:
      'Metodología práctica del marco de 1 metro cuadrado para estimar la oferta de forraje verde, cálculo de capacidad de carga animal y rotación técnica de potreros.',
    local_uri: 'https://www.fedegan.org.co',
    reading_level: 'Práctico de Campo',
    language: 'es',
    is_active: true,
  },
  {
    id: 104,
    title: 'Buenas Prácticas en el Ordeño y Rutina Higiénica de la Leche (SENA - ICA)',
    category: 'Ordeño y Calidad',
    content_type: 'PDF' as any,
    summary:
      'Paso a paso de la rutina de ordeño limpio: despunte en tazón de fondo negro, prueba de mastitis CMT, lavado y secado con toalla individual y sellado de pezones.',
    local_uri: 'https://repositorio.sena.edu.co',
    reading_level: 'Operarios y Ordeñadores',
    language: 'es',
    is_active: true,
  },
  {
    id: 105,
    title: 'Manual de Ensilaje Artesanal y Conservación de Forrajes (FEDEGÁN)',
    category: 'Nutrición y Forrajes',
    content_type: 'PDF' as any,
    summary:
      'Técnicas de picado, compactación anaeróbica y sellado en bolsa plástica o trinchera para conservar pastos de corte, maíz y sorgo forrajero ante sequías.',
    local_uri: 'https://www.fedegan.org.co',
    reading_level: 'Práctico de Campo',
    language: 'es',
    is_active: true,
  },
  {
    id: 106,
    title: 'Establecimiento y Manejo de Sistemas Silvopastoriles Intensivos (CIPAV)',
    category: 'Sistemas Sostenibles',
    content_type: 'PDF' as any,
    summary:
      'Guía de campo para la siembra de bancos forrajeros con Botón de Oro (Tithonia diversifolia) y Matarratón (Gliricidia sepium), cercas vivas y sombrío en potreros.',
    local_uri: 'https://www.cipav.org.co',
    reading_level: 'General y Técnico',
    language: 'es',
    is_active: true,
  },
  {
    id: 107,
    title: 'Guía de Atención del Ternero Neonato y Manejo del Calostro (AGROSAVIA - ICA)',
    category: 'Cría y Reproducción',
    content_type: 'PDF' as any,
    summary:
      'Protocolo de desinfección de ombligo con tintura de yodo al 7%, calostrado antes de las primeras 4 horas de vida y prevención de diarreas neonatales.',
    local_uri: 'https://repository.agrosavia.co',
    reading_level: 'Mayordomos y Vaqueros',
    language: 'es',
    is_active: true,
  },
  {
    id: 108,
    title: 'Protección y Cosecha de Agua en Fincas Ganaderas (CIPAV - FAO)',
    category: 'Agua y Clima',
    content_type: 'PDF' as any,
    summary:
      'Manejo y protección de nacimientos de agua, cosecha de lluvia, desinfección de bebederos y acueductos ganaderos para garantizar agua limpia al ganado.',
    local_uri: 'https://www.cipav.org.co',
    reading_level: 'General',
    language: 'es',
    is_active: true,
  },
];
