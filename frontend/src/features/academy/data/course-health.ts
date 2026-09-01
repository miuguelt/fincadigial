import { Course } from '../model/types';

export const courseHealth: Course = {
  id: 'health',
  slug: 'health',
  title: 'Sanidad Animal',
  description: 'Programa completo de sanidad preventiva y curativa. Aprende a identificar, prevenir y tratar las principales enfermedades del ganado bovino en el trópico colombiano.',
  icon: 'Heart',
  color: 'red',
  totalLessons: 12,
  totalDuration: '4h',
  level: 'Intermedio',
  lessons: [
    {
      id: 'health-1',
      title: 'Anatomía y Fisiología Básica del Bovino',
      duration: '20 min',
      content: `## Sistemas Corporales del Bovino

Para diagnosticar y tratar correctamente, es fundamental entender cómo funciona el organismo del bovino.

### Sistema digestivo (rumen)
El bovino es un rumiante con 4 compartimentos:
1. **Rumen (panza)**: Fermentación microbiana, 150-200L de capacidad
2. **Retículo (bonete)**: "Estómago de hardware", atrapa objetos extraños
3. **Omaso (librillo)**: Absorción de agua y nutrientes
4. **Abomaso (cuajar)**: "Estómago verdadero", digestión enzimática

### Sistema respiratorio
- Frecuencia normal: 10-30 respiraciones/minuto
- La respiración acelerada puede indicar: calor, dolor, enfermedad respiratoria
- Los bovinos son sensibles a neumonías por estrés

### Sistema circulatorio
- Frecuencia cardíaca normal: 60-70 latidos/minuto (adulto)
- Temperatura normal: 38.0-39.5°C
- La fiebre (>39.5°C) es signo de infección o inflamación

### Signos vitales normales en bovinos adultos
| Parámetro | Rango normal | Señal de alerta |
|-----------|-------------|-----------------|
| Temperatura | 38.0-39.5°C | >39.5°C (fiebre) |
| Frecuencia cardíaca | 60-70 lpm | >80 lpm (taquicardia) |
| Frecuencia respiratoria | 10-30 rpm | >35 rpm (dificultad) |
| Movimientos ruminales | 1-2 por minuto | Ausencia (atonía) |`,
      objectives: [
        'Identificar los 4 compartimentos del sistema digestivo del rumiante',
        'Conocer los signos vitales normales del bovino adulto',
        'Reconocer señales de alerta en los signos vitales',
      ],
      keyPoints: [
        'Temperatura > 39.5°C siempre es fiebre y requiere atención',
        'La ausencia de movimientos ruminales es una emergencia',
        'El rumen tiene capacidad de 150-200 litros',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h1q1',
            question: '¿Cuál es la temperatura normal de un bovino adulto?',
            options: ['36.0-37.5°C', '38.0-39.5°C', '39.5-41.0°C', '37.0-38.0°C'],
            correctAnswer: 1,
            explanation: 'La temperatura normal de un bovino adulto está entre 38.0 y 39.5°C. Por encima de 39.5°C se considera fiebre.',
          },
          {
            id: 'h1q2',
            question: '¿Cuántos compartimentos tiene el estómago de un rumiante?',
            options: ['2', '3', '4', '5'],
            correctAnswer: 2,
            explanation: 'El bovino tiene 4 compartimentos: rumen, retículo, omaso y abomaso.',
          },
          {
            id: 'h1q3',
            question: '¿Cuál es la frecuencia cardíaca normal de un bovino adulto?',
            options: ['40-50 lpm', '60-70 lpm', '80-90 lpm', '100-110 lpm'],
            correctAnswer: 1,
            explanation: 'La frecuencia cardíaca normal de un bovino adulto es de 60-70 latidos por minuto.',
          },
        ],
      },
    },
    {
      id: 'health-2',
      title: 'Enfermedades Infecciosas Comunes',
      duration: '20 min',
      content: `## Principales Enfermedades Infecciosas

Colombia, por su ubicación tropical, presenta condiciones que favorecen diversas enfermedades infecciosas. El instructor debe conocerlas para prevenirlas y detectarlas tempranamente.

### Fiebre Aftosa
- **Agente**: Virus (Aphthovirus)
- **Transmisión**: Contacto directo, aerosoles, fómites
- **Signos**: Vesículas en boca, pezuñas y ubres; salivación excesiva; cojera; fiebre alta
- **Prevención**: Vacunación obligatoria (ciclos establecidos por ICA)
- **Notificación**: OBLIGATORIA e INMEDIATA al ICA
- **Impacto**: Cierre de exportaciones, sacrificio sanitario, pérdidas millonarias

### Brucelosis
- **Agente**: Brucella abortus (bacteria)
- **Transmisión**: Contacto con fluidos de aborto, placenta, leche cruda
- **Signos**: Aborto en último tercio de gestación; retención de placenta; orquitis en toros
- **Diagnóstico**: Prueba de rosa de bengala, ELISA competitivo
- **Prevención**: Vacunación de terneras (cepa RB51 o C19); eliminación de positivos
- **Zoonosis**: Se transmite a humanos (Fiebre de Malta o Fiebre Ondulante)

### Tuberculosis Bovina
- **Agente**: Mycobacterium bovis
- **Transmisión**: Inhalación, ingestión de leche contaminada
- **Signos**: Adelgazamiento progresivo, tos crónica, ganglios aumentados
- **Diagnóstico**: Prueba de tuberculina (PPD) en pliegue ano-caudal
- **Prevención**: Prueba y eliminación de reactores

### Leptospirosis
- **Agente**: Leptospira spp.
- **Transmisión**: Agua contaminada con orina de animales infectados
- **Signos**: Fiebre, anemia, hemoglobinuria (orina color café oscuro), abortos
- **Diagnóstico**: Serología (MAT)
- **Prevención**: Vacunación, drenaje de zonas húmedas, control de roedores

### Carbón Bacteridiano (Ántrax)
- **Agente**: Bacillus anthracis
- **Signos**: Muerte súbita, sangre oscura que no coagula por orificios naturales
- **Precaución EXTREMA**: NO realizar necropsia (las esporas contaminan el suelo por décadas)
- **Notificación**: OBLIGATORIA e INMEDIATA`,
      objectives: [
        'Identificar las 5 principales enfermedades infecciosas en Colombia',
        'Reconocer signos clínicos de cada enfermedad',
        'Conocer los protocolos de notificación obligatoria',
      ],
      keyPoints: [
        'Fiebre aftosa y ántrax son de notificación obligatoria INMEDIATA',
        'NO hacer necropsia si se sospecha ántrax',
        'La brucelosis es una zoonosis (se transmite a humanos)',
        'La tuberculosis se diagnostica con prueba de tuberculina',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h2q1',
            question: '¿Cuál de estas enfermedades es de notificación obligatoria INMEDIATA al ICA?',
            options: ['Mastitis', 'Fiebre aftosa', 'Timpanismo', 'Diarrea neonatal'],
            correctAnswer: 1,
            explanation: 'La fiebre aftosa es de notificación obligatoria inmediata al ICA por ser una enfermedad de control oficial.',
          },
          {
            id: 'h2q2',
            question: '¿Por qué NO se debe hacer necropsia si se sospecha ántrax?',
            options: ['Porque es ilegal', 'Porque las esporas contaminan el suelo por décadas', 'Porque no sirve para el diagnóstico', 'Por el mal olor'],
            correctAnswer: 1,
            explanation: 'Al abrir el cadáver, las bacterias forman esporas que contaminan el suelo y pueden permanecer viables por décadas.',
          },
          {
            id: 'h2q3',
            question: 'La brucelosis se transmite a humanos. ¿Qué enfermedad causa?',
            options: ['Malaria', 'Fiebre de Malta (Fiebre Ondulante)', 'Dengue', 'Tuberculosis'],
            correctAnswer: 1,
            explanation: 'La brucelosis en humanos se conoce como Fiebre de Malta o Fiebre Ondulante, caracterizada por fiebre intermitente y dolor articular.',
          },
        ],
      },
    },
    {
      id: 'health-3',
      title: 'Parásitos Internos y Externos',
      duration: '20 min',
      content: `## Control de Parásitos en Bovinos

Los parásitos son una de las principales causas de pérdidas económicas "silenciosas" en la ganadería: reducen la ganancia de peso y la producción sin signos clínicos evidentes.

### Parásitos internos (Endoparásitos)

#### Gastrointestinales (lombrices)
- **Haemonchus contortus**: "Lombriz del cuajar", causa anemia severa
- **Ostertagia ostertagi**: Gastritis parasitaria, diarrea y pérdida de peso (tipo I y II)
- **Cooperia spp.**: Principal causa de diarrea en terneros
- **Oesophagostomum radiatum**: Nódulos intestinales, "estómago de mortero"

**Signos de parasitosis gastrointestinal:**
- Pérdida de peso progresiva
- Diarrea intermitente
- Anemia (mucosas pálidas)
- Edema submandibular ("papera" o "botella")
- Pelaje áspero y sin brillo

#### Fasciola hepática
- **Agente**: Fasciola hepatica (duela del hígado)
- **Ciclo**: Necesita caracol acuático como huésped intermediario
- **Zonas de riesgo**: Áreas húmedas, con canales de riego, por encima de 1500 msnm
- **Signos**: Pérdida de peso, anemia, edema submandibular
- **Prevención**: Control de caracoles con drenaje; tratamiento estratégico

#### Coccidiosis
- Afecta principalmente terneros jóvenes (1-6 meses)
- Diarrea con sangre (disentería)
- Prevención con manejo higiénico de corrales

### Parásitos externos (Ectoparásitos)

#### Garrapatas (Rhipicephalus microplus)
- Transmiten anaplasmosis y babesiosis
- Cada garrapata ingiere 1-3 ml de sangre en su ciclo
- Infestación alta = anemia severa
- **Control**: Baños acaricidas, rotación de productos, control biológico

#### Moscas
- **Mosca de los cuernos** (Haematobia irritans): Estrés, pérdida de peso
- **Mosca de los establos** (Stomoxys calcitrans): Transmisión de enfermedades
- **Nuche o tórsalo** (Dermatobia hominis): Larvas bajo la piel

#### Ácaros de la sarna
- Sarna sarcóptica: Prurito intenso, pérdida de pelo
- Sarna psoróptica: Costras en base de cola y orejas
- Altamente contagiosa entre animales`,
      objectives: [
        'Diferenciar entre endoparásitos y ectoparásitos',
        'Identificar signos clínicos de parasitosis',
        'Establecer un programa de control parasitario',
      ],
      keyPoints: [
        'Las parasitosis causan pérdidas silenciosas sin signos dramáticos',
        'La anemia (mucosas pálidas) es el principal signo de parasitosis',
        'La rotación de antiparasitarios previene resistencia',
        'Cada garrapata adulta consume 1-3 ml de sangre',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h3q1',
            question: '¿Cuál es el principal signo de parasitosis gastrointestinal en bovinos?',
            options: ['Fiebre alta', 'Anemia (mucosas pálidas)', 'Tos persistente', 'Coágulos en la leche'],
            correctAnswer: 1,
            explanation: 'La anemia, visible como mucosas pálidas (ojo, encías, vulva), es el principal signo de parasitosis gastrointestinal.',
          },
          {
            id: 'h3q2',
            question: '¿Qué cantidad de sangre consume una garrapata adulta en su ciclo?',
            options: ['0.1-0.5 ml', '1-3 ml', '5-10 ml', '15-20 ml'],
            correctAnswer: 1,
            explanation: 'Cada garrapata adulta (Rhipicephalus microplus) consume entre 1 y 3 ml de sangre durante su ciclo de vida, lo que en infestaciones altas puede causar anemia severa.',
          },
          {
            id: 'h3q3',
            question: 'La fasciola hepática necesita un huésped intermediario. ¿Cuál es?',
            options: ['Garrapata', 'Caracol acuático', 'Mosca', 'Lombriz de tierra'],
            correctAnswer: 1,
            explanation: 'Fasciola hepatica necesita un caracol acuático como huésped intermediario para completar su ciclo de vida.',
          },
        ],
      },
    },
    {
      id: 'health-4',
      title: 'Plan Sanitario Preventivo',
      duration: '20 min',
      content: `## Diseño del Plan Sanitario Anual

Un plan sanitario bien estructurado es la herramienta más costo-efectiva para mantener la salud del ganado.

### Componentes del plan sanitario

#### 1. Calendario de vacunación
| Época | Vacuna | Población objetivo | Refuerzo |
|-------|--------|-------------------|----------|
| **Ene-Feb** | Aftosa (1er ciclo) | Todo el ganado >3 meses | - |
| **May-Jun** | Aftosa (2do ciclo) | Todo el ganado >3 meses | - |
| **Abr-May** | Carbón bacteridiano | Todo el ganado >3 meses | Anual |
| **Abr-May** | Edema maligno y septicemia | Todo el ganado >3 meses | Anual |
| **Oct-Nov** | Rabia bovina | Todo el ganado >3 meses | Anual (zonas de riesgo) |
| **3-8 meses** | Brucelosis (terneras) | Hembras 3-8 meses | Única dosis |
| **Pre-servicio** | Leptospirosis | Hembras reproductoras | Anual |
| **Pre-servicio** | IBR-DVB (reproductivas) | Hembras y toros | Anual |

#### 2. Calendario de desparasitación
- **Adultos**: Cada 4-6 meses (mínimo 2 veces al año)
- **Terneros**: Cada 3 meses hasta el destete
- **Época estratégica**: Inicio de lluvias y final de lluvias

#### 3. Control de ectoparásitos
- **Garrapatas**: Baño cada 21 días en épocas de alta infestación
- **Moscas**: Chapetas insecticidas, baños, control biológico
- **Nuche**: Revisión y extracción manual en épocas de riesgo

#### 4. Suplementación estratégica
- **Pre-parto**: Sales aniónicas para prevenir hipocalcemia
- **Post-parto**: Energía y calcio para vaca recién parida
- **Época seca**: Suplementación proteica y energética

### Planilla de verificación mensual
Cada mes, el instructor debe verificar:
1. ¿Se cumplió el calendario de vacunación del mes?
2. ¿Se realizaron las desparasitaciones programadas?
3. ¿Se rotaron los potreros según el plan?
4. ¿Se revisaron los pediluvios y barreras sanitarias?
5. ¿Se reportaron animales enfermos o con signos anormales?`,
      objectives: [
        'Diseñar un plan sanitario anual para la finca',
        'Conocer el calendario de vacunación obligatorio en Colombia',
        'Implementar un sistema de verificación mensual',
      ],
      keyPoints: [
        'La vacunación contra aftosa es obligatoria y se realiza en 2 ciclos al año',
        'La desparasitación estratégica es más efectiva que la rutinaria',
        'El plan sanitario debe revisarse y ajustarse cada año',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h4q1',
            question: '¿Cuántos ciclos de vacunación contra fiebre aftosa se realizan al año en Colombia?',
            options: ['1 ciclo', '2 ciclos', '3 ciclos', '4 ciclos'],
            correctAnswer: 1,
            explanation: 'En Colombia se realizan 2 ciclos de vacunación contra fiebre aftosa al año, generalmente enero-febrero y mayo-junio.',
          },
          {
            id: 'h4q2',
            question: '¿A qué edad se vacunan las terneras contra brucelosis?',
            options: ['Al nacimiento', '3-8 meses', '12-15 meses', 'Al primer parto'],
            correctAnswer: 1,
            explanation: 'La vacunación contra brucelosis se realiza en hembras entre 3 y 8 meses de edad, en dosis única.',
          },
          {
            id: 'h4q3',
            question: '¿Cada cuánto se recomienda desparacitar bovinos adultos?',
            options: ['Cada mes', 'Cada 4-6 meses', 'Solo cuando están enfermos', 'Una vez al año'],
            correctAnswer: 1,
            explanation: 'Se recomienda desparacitar bovinos adultos cada 4-6 meses, con mínimo 2 veces al año, preferiblemente al inicio y final de lluvias.',
          },
        ],
      },
    },
    {
      id: 'health-5',
      title: 'Enfermedades Metabólicas y Carenciales',
      duration: '20 min',
      content: `## Trastornos Metabólicos

Las enfermedades metabólicas ocurren por desequilibrios en la nutrición o fisiología del animal. Son especialmente importantes en ganado de alta producción.

### Hipocalcemia (Fiebre de Leche)
- **Causa**: Calcio sanguíneo bajo (<8 mg/dL)
- **Momento**: 24-72 horas post-parto
- **Signos**: Debilidad muscular, incapacidad para levantarse, cabeza girada hacia el flanco
- **Tratamiento**: Borogluconato de calcio IV (lento) o SC
- **Prevención**: Sales aniónicas pre-parto; dieta baja en calcio pre-parto

### Hipomagnesemia (Tetania de los Pastos)
- **Causa**: Magnesio bajo en sangre
- **Momento**: Animales en pastoreo de pastos tiernos fertilizados con nitrógeno y potasio
- **Signos**: Hiperexcitabilidad, temblores, convulsiones, muerte súbita
- **Tratamiento**: Sulfato de magnesio IV
- **Prevención**: Suplementación con óxido de magnesio en sal mineralizada

### Cetosis (Acetonemia)
- **Causa**: Balance energético negativo post-parto
- **Momento**: 2-6 semanas post-parto en vacas de alta producción
- **Signos**: Pérdida de apetito, disminución de leche, olor a acetona en aliento, heces secas
- **Tratamiento**: Propilenglicol oral; dextrosa IV
- **Prevención**: Evitar obesidad al parto; suplementación energética post-parto

### Deficiencias minerales
- **Fósforo**: Pica (comer tierra, huesos), rigidez, fracturas
- **Cobre**: Pelaje descolorido (anteojos cobrizos), anemia, diarrea
- **Zinc**: Problemas de piel y pezuñas, mala cicatrización
- **Selenio**: Enfermedad del músculo blanco en terneros, retención de placenta
- **Yodo**: Bocio, nacimiento de terneros débiles o muertos`,
      objectives: [
        'Identificar las 3 principales enfermedades metabólicas',
        'Reconocer signos de deficiencias minerales',
        'Aplicar medidas preventivas en cada caso',
      ],
      keyPoints: [
        'La fiebre de leche ocurre 24-72h post-parto por calcio bajo',
        'La tetania de los pastos puede causar muerte súbita',
        'La cetosis se detecta por olor a acetona en el aliento',
        'La pica (comer tierra) sugiere deficiencia de fósforo',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h5q1',
            question: '¿Cuándo ocurre típicamente la fiebre de leche (hipocalcemia)?',
            options: ['Durante la gestación', '24-72 horas post-parto', 'Al momento del destete', '2 meses post-parto'],
            correctAnswer: 1,
            explanation: 'La fiebre de leche ocurre típicamente 24-72 horas después del parto, cuando la demanda de calcio para la producción de leche supera la capacidad de movilización.',
          },
          {
            id: 'h5q2',
            question: '¿Cuál es el signo característico de la cetosis?',
            options: ['Fiebre alta', 'Olor a acetona en el aliento', 'Diarrea sanguinolenta', 'Parálisis'],
            correctAnswer: 1,
            explanation: 'El olor a acetona (similar a removedor de esmalte) en el aliento del animal es un signo característico de cetosis.',
          },
          {
            id: 'h5q3',
            question: 'La "pica" (comer tierra, huesos o piedras) sugiere deficiencia de:',
            options: ['Calcio', 'Fósforo', 'Sodio', 'Hierro'],
            correctAnswer: 1,
            explanation: 'La pica o apetito depravado (comer tierra, huesos, piedras, madera) es un signo clásico de deficiencia de fósforo.',
          },
        ],
      },
    },
    {
      id: 'health-6',
      title: 'Enfermedades Reproductivas',
      duration: '20 min',
      content: `## Patologías del Sistema Reproductivo

Las enfermedades reproductivas afectan directamente la rentabilidad al reducir las tasas de preñez y aumentar el intervalo entre partos.

### Enfermedades infecciosas reproductivas

#### Campilobacteriosis (Vibriosis)
- **Agente**: Campylobacter fetus venerealis
- **Transmisión**: Venérea (toro portador asintomático)
- **Signos**: Infertilidad temporal, repetición de celos, abortos esporádicos
- **Diagnóstico**: Cultivo de esmegma prepucial o moco cérvico-vaginal
- **Control**: Vacunación, IA en lugar de monta natural

#### Tricomoniasis
- **Agente**: Tritrichomonas foetus
- **Transmisión**: Venérea (toro portador)
- **Signos**: Aborto temprano (1-4 meses), piómetra, repetición de celos
- **Diagnóstico**: Cultivo de esmegma prepucial
- **Control**: Eliminación de toros positivos; IA

#### Diarrea Viral Bovina (DVB)
- **Agente**: Virus DVB
- **Signos**: Abortos, momificación fetal, nacimiento de terneros con缺陷 congénitos, enfermedad de las mucosas
- **Transmisión**: Animales persistentemente infectados (PI)
- **Control**: Identificar y eliminar PI; vacunación

#### Rinotraqueítis Infecciosa Bovina (IBR)
- **Agente**: Herpesvirus bovino tipo 1
- **Signos**: Abortos (último tercio), vulvovaginitis pustular, balanopostitis en toros
- **Control**: Vacunación, bioseguridad

### Trastornos no infecciosos

#### Retención de placenta
- Placenta retenida >12 horas post-parto
- Causas: Deficiencia de selenio/vitamina E, parto distócico, aborto, gemelos
- Tratamiento: NO hacer tracción manual; antibióticos intrauterinos si hay infección
- Prevención: Suplementación con selenio y vitamina E pre-parto

#### Prolapso uterino
- **Emergencia**: El útero sale por la vulva después del parto
- Requiere atención veterinaria URGENTE
- Mientras llega ayuda: Mantener el útero húmedo y limpio, elevar la cadera de la vaca

#### Mastitis
- Inflamación de la glándula mamaria
- **Signos**: Ubre caliente, inflamada, dolorosa; leche con grumos o sangre
- **Causas**: Bacterias (Staph. aureus, Strep. agalactiae, E. coli)
- **Prevención**: Higiene en ordeño, sellado de pezones, terapia de secado`,
      objectives: [
        'Identificar las principales enfermedades reproductivas',
        'Diferenciar entre causas infecciosas y no infecciosas',
        'Conocer los protocolos de urgencia obstétrica',
      ],
      keyPoints: [
        'La campilobacteriosis y tricomoniasis son venéreas; el toro es portador asintomático',
        'El prolapso uterino es una emergencia que requiere atención inmediata',
        'Nunca hacer tracción manual de placenta retenida',
        'La mastitis se previene con higiene en el ordeño',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h6q1',
            question: '¿Cómo se transmiten la campilobacteriosis y la tricomoniasis?',
            options: ['Por el aire', 'Por vía venérea (monta natural)', 'Por ingestión de agua contaminada', 'Por garrapatas'],
            correctAnswer: 1,
            explanation: 'Ambas son enfermedades venéreas transmitidas por el toro durante la monta natural. El toro puede ser portador asintomático.',
          },
          {
            id: 'h6q2',
            question: '¿Qué NO se debe hacer en caso de retención de placenta?',
            options: ['Llamar al veterinario', 'Tracción manual para extraerla', 'Administrar antibióticos si hay infección', 'Monitorear temperatura'],
            correctAnswer: 1,
            explanation: 'Nunca se debe hacer tracción manual de la placenta retenida. Esto puede causar hemorragia, prolapso uterino o dejar fragmentos que causen infección.',
          },
          {
            id: 'h6q3',
            question: '¿Qué es un animal PI en el contexto de DVB?',
            options: ['Animal preñado inmunizado', 'Animal persistentemente infectado', 'Animal parcialmente inmunizado', 'Animal en período de incubación'],
            correctAnswer: 1,
            explanation: 'PI significa "Persistentemente Infectado". Estos animales nacen infectados y diseminan el virus durante toda su vida. Son la principal fuente de contagio en el ganado.',
          },
        ],
      },
    },
    {
      id: 'health-7',
      title: 'Enfermedades Podales',
      duration: '20 min',
      content: `## Cojeras y Patologías de la Pezuña

Las enfermedades podales son la tercera causa de pérdidas económicas en ganadería (después de fallas reproductivas y mastitis).

### Anatomía de la pezuña
- Dos dedos funcionales (III y IV) por pata
- Cada dedo con 3 falanges
- Almohadilla digital (tejido adiposo que absorbe impacto)
- Corion (tejido vivo que produce el casco)
- Casco o estuche córneo (protección externa)

### Enfermedades podales comunes

#### Dermatitis digital (Enfermedad de Mortellaro)
- **Causa**: Treponema spp. (bacteria)
- **Signos**: Lesión circular, roja, dolorosa en piel de talón o espacio interdigital; cojera aguda
- **Tratamiento**: Limpieza + antibiótico tópico (tetraciclina, lincomicina); vendaje
- **Prevención**: Pediluvios con sulfato de cobre o formalina; higiene de corrales

#### Pododermatitis séptica (Gabarro o Pietín)
- **Causa**: Fusobacterium necrophorum + bacterias secundarias
- **Signos**: Inflamación del espacio interdigital, mal olor, necrosis, cojera severa
- **Tratamiento**: Limpieza quirúrgica + antibiótico sistémico
- **Prevención**: Evitar humedad excesiva y barro; pediluvios regulares

#### Laminitis (Infosura)
- **Causa**: Acidosis ruminal (exceso de carbohidratos fermentables)
- **Signos**: Calor en pezuñas, pulso digital aumentado, posición antiálgica, cojera en 4 patas
- **Tratamiento**: Corregir la dieta; antiinflamatorios; desvasado correctivo
- **Prevención**: Transición gradual de dietas; evitar cambios bruscos de alimentación

#### Úlcera de suela
- Penetración de la suela por cuerpo extraño o sobrecrecimiento
- Cojera aguda; animal apoya solo la punta
- Tratamiento: Desvasado, retirar cuerpo extraño, bloqueo ortopédico en pezuña sana

### Programa de prevención podal
1. **Pediluvios**: Sola de paso obligatorio al menos 2 veces por semana
2. **Desvasado funcional**: Cada 6 meses en adultos
3. **Superficies**: Evitar pisos muy abrasivos o excesivamente húmedos
4. **Nutrición**: Evitar acidosis con dietas balanceadas en fibra efectiva`,
      objectives: [
        'Identificar las principales enfermedades podales del bovino',
        'Conocer los tratamientos básicos de cada patología',
        'Implementar un programa de prevención podal',
      ],
      keyPoints: [
        'Las cojeras son la 3ª causa de pérdidas económicas',
        'La laminitis se previene evitando acidosis ruminal',
        'Los pediluvios son la medida preventiva más costo-efectiva',
        'El desvasado funcional debe hacerse cada 6 meses',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h7q1',
            question: '¿Cuál es la causa principal de la laminitis en bovinos?',
            options: ['Exceso de ejercicio', 'Falta de agua', 'Acidosis ruminal por exceso de carbohidratos', 'Deficiencia de calcio'],
            correctAnswer: 2,
            explanation: 'La laminitis es causada por acidosis ruminal, que ocurre cuando hay exceso de carbohidratos fermentables en la dieta, produciendo toxinas que afectan la circulación de las pezuñas.',
          },
          {
            id: 'h7q2',
            question: '¿Con qué frecuencia se recomienda el desvasado funcional en bovinos adultos?',
            options: ['Cada mes', 'Cada 6 meses', 'Cada año', 'Solo cuando hay cojera'],
            correctAnswer: 1,
            explanation: 'El desvasado funcional preventivo debe realizarse cada 6 meses en bovinos adultos para mantener la forma correcta de la pezuña.',
          },
          {
            id: 'h7q3',
            question: '¿Qué productos se usan comúnmente en pediluvios para prevenir enfermedades podales?',
            options: ['Agua con sal', 'Sulfato de cobre o formalina', 'Alcohol yodado', 'Cloro puro'],
            correctAnswer: 1,
            explanation: 'El sulfato de cobre (al 5-10%) y la formalina (al 3-5%) son los productos más usados en pediluvios para prevención de enfermedades podales.',
          },
        ],
      },
    },
    {
      id: 'health-8',
      title: 'Uso Responsable de Medicamentos',
      duration: '20 min',
      content: `## Farmacología Aplicada al Bovino

El uso inadecuado de medicamentos causa resistencia antimicrobiana, residuos en carne/leche y pérdidas económicas.

### Vías de administración

#### Oral
- En agua o alimento (colectivo)
- En bolo o pasta (individual)
- **Precaución**: Los rumiantes diluyen y metabolizan parcialmente los fármacos en el rumen

#### Parenteral (inyectable)
- **Subcutánea (SC)**: Bajo la piel (cuello, detrás de la paleta)
- **Intramuscular (IM)**: Músculo del cuello (nunca en la pierna o lomo)
- **Intravenosa (IV)**: Vena yugular; SOLO personal veterinario capacitado

#### Tópica
- Spray, pomada, pour-on (sobre la piel)
- Pediluvios

### Cálculo de dosis
- Siempre basado en el peso del animal (mg/kg)
- **Estimar el peso con báscula o cinta de peso, NUNCA "al ojo"**
- Ejemplo: Oxitetraciclina a 10 mg/kg
  - Animal de 450 kg = 4,500 mg = 4.5 g de principio activo
  - Si el producto tiene 200 mg/ml → 4,500/200 = 22.5 ml

### Tiempos de retiro (Período de carencia)
Es el tiempo que debe transcurrir entre la última dosis y el sacrificio o consumo de leche.

| Medicamento | Retiro en carne | Retiro en leche |
|------------|----------------|-----------------|
| Oxitetraciclina | 28 días | 7-10 días |
| Penicilina procaínica | 10 días | 3-5 días |
| Ivermectina | 35-49 días | No usar en lactancia |
| Florfenicol | 28-30 días | No usar en vacas en producción |

### Almacenamiento de medicamentos
- Botiquín cerrado, fresco (no >25°C) y oscuro
- Vacunas: Cadena de frío 2-8°C (NUNCA congelar)
- Registro de inventario con fechas de vencimiento
- Eliminar medicamentos vencidos por gestor autorizado`,
      objectives: [
        'Conocer las diferentes vías de administración de medicamentos',
        'Calcular correctamente las dosis según el peso',
        'Respetar los tiempos de retiro para evitar residuos',
      ],
      keyPoints: [
        'SIEMPRE calcular la dosis por peso, nunca al ojo',
        'Las inyecciones IM solo en el cuello, nunca en pierna o lomo',
        'Los tiempos de retiro son obligatorios por ley',
        'Las vacunas requieren cadena de frío (2-8°C)',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h8q1',
            question: '¿Dónde se deben aplicar las inyecciones intramusculares en bovinos?',
            options: ['En la pierna', 'En el lomo', 'En el cuello', 'En la nalga'],
            correctAnswer: 2,
            explanation: 'Las inyecciones IM deben aplicarse exclusivamente en los músculos del cuello, nunca en pierna o lomo, para evitar dañar cortes valiosos de carne.',
          },
          {
            id: 'h8q2',
            question: '¿A qué temperatura deben conservarse las vacunas?',
            options: ['Temperatura ambiente (20-25°C)', 'Congeladas (-20°C)', 'Refrigeradas (2-8°C)', 'A más de 30°C'],
            correctAnswer: 2,
            explanation: 'Las vacunas deben mantenerse en cadena de frío entre 2 y 8°C. Nunca deben congelarse ni exponerse a temperaturas altas.',
          },
          {
            id: 'h8q3',
            question: 'Si un producto tiene concentración de 200 mg/ml y necesitas 3,000 mg, ¿cuántos ml debes administrar?',
            options: ['10 ml', '15 ml', '20 ml', '30 ml'],
            correctAnswer: 1,
            explanation: '3,000 mg ÷ 200 mg/ml = 15 ml. El cálculo correcto de dosis es esencial para la efectividad y seguridad del tratamiento.',
          },
        ],
      },
    },
    {
      id: 'health-9',
      title: 'Toma de Muestras para Diagnóstico',
      duration: '20 min',
      content: `## Procedimientos de Recolección de Muestras

La calidad de una muestra determina la calidad del diagnóstico. Una muestra mal tomada puede llevar a diagnósticos erróneos.

### Tipos de muestras y técnicas

#### Sangre
- **Tubo tapa roja**: Sin anticoagulante → suero (serología, bioquímica)
- **Tubo tapa lila/morada**: Con EDTA → sangre total (hemograma, hemoparásitos)
- **Tubo tapa verde**: Con heparina → plasma
- **Sitio de punción**: Vena yugular o coccígea
- **Volumen**: 5-10 ml (adulto), 3-5 ml (ternero)
- **Conservación**: Refrigerar (no congelar sangre completa)

#### Heces (coprológico)
- Recolectar directamente del recto (guante de palpación)
- Cantidad: 10-20 gramos (aproximadamente una cucharada)
- Enviar en frasco limpio o bolsa plástica
- Refrigerar si no se envía inmediatamente (<24h)
- **NO recolectar del suelo**

#### Orina
- Estimular micción masajeando la zona perineal
- Recolectar en frasco estéril, chorro medio
- Para urocultivo: muestra estéril por sonda o punción

#### Leche (mastitis)
- Descartar primeros chorros
- Limpiar y desinfectar pezón con alcohol
- Recolectar en frasco estéril SIN tocar el borde
- Refrigerar inmediatamente
- Identificar cuarto afectado

#### Piel y pelos (dermatopatías)
- Raspar el borde de la lesión con bisturí (hasta leve sangrado)
- Recolectar el material en frasco o bolsa
- Para ácaros: raspar profundo; para hongos: arrancar pelos de la periferia

### Rotulado de muestras
TODA muestra debe llevar:
1. Identificación del animal (número o nombre)
2. Tipo de muestra
3. Fecha y hora de recolección
4. Conservante usado (si aplica)
5. Prueba solicitada`,
      objectives: [
        'Conocer las técnicas de recolección para cada tipo de muestra',
        'Identificar el tubo correcto según el análisis solicitado',
        'Aplicar el rotulado adecuado de muestras',
      ],
      keyPoints: [
        'Nunca recolectar heces del suelo para coprológico',
        'Cada tipo de tubo tiene un anticoagulante específico',
        'Las muestras de leche para cultivo requieren esterilidad',
        'Una muestra mal rotulada es una muestra perdida',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h9q1',
            question: '¿Qué tubo se usa para obtener suero (sin anticoagulante)?',
            options: ['Tapa roja', 'Tapa lila', 'Tapa verde', 'Tapa azul'],
            correctAnswer: 0,
            explanation: 'El tubo de tapa roja no contiene anticoagulante, permitiendo que la sangre coagule y se obtenga suero para análisis de serología o bioquímica.',
          },
          {
            id: 'h9q2',
            question: '¿Por qué no se deben recolectar heces del suelo para coprológico?',
            options: ['Porque es más difícil', 'Porque pueden contaminarse con parásitos de vida libre del suelo', 'Porque el animal se asusta', 'Porque pesa menos'],
            correctAnswer: 1,
            explanation: 'Las heces del suelo pueden contaminarse con nematodos de vida libre u otros organismos del ambiente, llevando a diagnósticos erróneos.',
          },
        ],
      },
    },
    {
      id: 'health-10',
      title: 'Manejo de Emergencias Sanitarias',
      duration: '20 min',
      content: `## Protocolos de Emergencia

Saber actuar en una emergencia puede salvar la vida de un animal y prevenir la propagación de enfermedades.

### Signos de enfermedad grave (emergencia)
1. Animal caído que no se levanta
2. Distensión abdominal severa (timpanismo)
3. Dificultad respiratoria (boca abierta, lengua afuera)
4. Sangrado profuso (hemorragia)
5. Prolapso (útero, recto, vagina)
6. Parto distócico (no progresa después de 1-2 horas)

### Protocolo de emergencia paso a paso
1. **Evaluar**: ¿El animal está en riesgo de vida? ¿Puedo ayudar o necesito veterinario?
2. **Notificar**: Informar al veterinario responsable de inmediato
3. **Aislar**: Si se sospecha enfermedad contagiosa, separar del ganado
4. **Primeros auxilios**: Solo procedimientos que domines
5. **Documentar**: Hora de inicio, signos observados, acciones tomadas

### Kit de emergencia sanitaria
- Termómetro veterinario
- Guantes de palpación
- Jeringas y agujas de diferentes tamaños
- Antiséptico (yodo, clorhexidina)
- Vendas y algodón
- Tijeras, bisturí estéril
- Solución salina o Ringer lactato
- Torniquete
- Números de teléfono de emergencia visibles

### Timpanismo (Meteorismo)
- **Gas atrapado en el rumen** → distensión abdominal lado izquierdo
- Causa: Exceso de leguminosas tiernas, cambio brusco de dieta
- Tratamiento de emergencia: Trocar y cánula (solo si estás capacitado)
- Alternativa: Hacer caminar al animal cuesta arriba; sonda orogástrica
- **Si el animal no puede respirar, muere en minutos**

### Parto distócico
- Regla 1-2-3: 1 hora de contracciones sin progreso = llamar al veterinario
- Mientras tanto: Evaluar presentación, posición y postura del ternero
- NO usar fuerza excesiva con cadenas o cuerdas
- Lubricación abundante siempre`,
      objectives: [
        'Reconocer signos de emergencia que requieren atención inmediata',
        'Aplicar el protocolo de emergencia paso a paso',
        'Conocer los componentes del kit de emergencia',
      ],
      keyPoints: [
        'El timpanismo puede matar en minutos si no se trata',
        'Regla 1-2-3 para partos: 1h sin progreso = llamar veterinario',
        'Tener números de emergencia visibles en la finca',
        'En emergencia: evaluar, notificar, aislar, actuar, documentar',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h10q1',
            question: '¿Qué es el timpanismo o meteorismo?',
            options: ['Fiebre alta', 'Gas atrapado en el rumen', 'Inflamación de la pezuña', 'Infección uterina'],
            correctAnswer: 1,
            explanation: 'El timpanismo es la acumulación de gas en el rumen que no puede ser eliminado, causando distensión abdominal que puede comprometer la respiración.',
          },
          {
            id: 'h10q2',
            question: 'Según la regla 1-2-3, ¿cuándo se debe llamar al veterinario en un parto?',
            options: ['Inmediatamente al inicio', 'Después de 1 hora sin progreso', 'Después de 4 horas', 'Solo si el ternero está muerto'],
            correctAnswer: 1,
            explanation: 'Si después de 1 hora de contracciones activas no hay progreso en el parto, se debe llamar al veterinario. Una intervención temprana salva al ternero y a la madre.',
          },
        ],
      },
    },
    {
      id: 'health-11',
      title: 'Normatividad Sanitaria ICA',
      duration: '20 min',
      content: `## Marco Legal de la Sanidad Pecuaria en Colombia

El ICA (Instituto Colombiano Agropecuario) es la autoridad sanitaria nacional. Cumplir sus normativas no es opcional.

### Registro sanitario de predio pecuario (RSPP)
- Toda finca con animales de producción debe estar registrada ante el ICA
- El RSPP es un número único que identifica la finca
- Es requisito para movilizar animales, vacunar y comercializar

### Guía Sanitaria de Movilización Interna (GSMI)
- Documento obligatorio para transportar animales entre predios
- Expedida por el ICA o entidad autorizada
- Debe acompañar a los animales durante todo el trayecto
- Sin GSMI → decomiso de animales y sanciones

### Ciclos de vacunación obligatoria
- **Fiebre aftosa**: 2 ciclos anuales (todo el ganado >3 meses)
- **Brucelosis**: Vacunación obligatoria de terneras 3-8 meses
- **Rabia**: En zonas declaradas de riesgo

### Notificación obligatoria de enfermedades
El instructor (y todo ciudadano) está obligado a notificar ante el ICA la sospecha de:
- Fiebre aftosa (inmediata)
- Estomatitis vesicular
- Rabia bovina
- Tuberculosis bovina
- Brucelosis
- Carbón bacteridiano
- Encefalopatía espongiforme bovina (EEB)

### Sanciones por incumplimiento
- Multas hasta 10,000 salarios mínimos legales
- Decomiso y sacrificio de animales
- Cierre del predio
- Responsabilidad penal en casos graves`,
      objectives: [
        'Conocer las principales normativas del ICA para ganadería',
        'Identificar las enfermedades de notificación obligatoria',
        'Comprender el sistema de Guías Sanitarias de Movilización',
      ],
      keyPoints: [
        'El RSPP es obligatorio para toda finca pecuaria en Colombia',
        'Movilizar animales sin GSMI conlleva decomiso y sanciones',
        'La notificación de enfermedades al ICA es obligación legal',
        'Las sanciones por incumplimiento pueden incluir penas penales',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h11q1',
            question: '¿Qué significa la sigla RSPP?',
            options: ['Registro Sanitario de Producción Pecuaria', 'Registro Sanitario de Predio Pecuario', 'Reglamento Sanitario para Productores Pecuarios', 'Registro Sistemático de Plaguicidas Pecuarios'],
            correctAnswer: 1,
            explanation: 'RSPP significa Registro Sanitario de Predio Pecuario, y es obligatorio para toda finca con animales de producción.',
          },
          {
            id: 'h11q2',
            question: '¿Cuántos ciclos de vacunación contra aftosa se realizan al año en Colombia?',
            options: ['1', '2', '3', '4'],
            correctAnswer: 1,
            explanation: 'Se realizan 2 ciclos anuales de vacunación contra fiebre aftosa en Colombia.',
          },
          {
            id: 'h11q3',
            question: '¿Qué entidad expide las Guías Sanitarias de Movilización Interna?',
            options: ['Fondo Ganadero', 'Fedegán', 'ICA', 'Ministerio de Transporte'],
            correctAnswer: 2,
            explanation: 'El ICA (Instituto Colombiano Agropecuario) es la entidad encargada de expedir las GSMI para el transporte de animales.',
          },
        ],
      },
    },
    {
      id: 'health-12',
      title: 'Inspección Sanitaria Diaria del Ganado',
      duration: '20 min',
      content: `## Rutina de Inspección y Detección Temprana

La inspección diaria sistemática es la herramienta más efectiva para detectar problemas de salud antes de que se agraven.

### Rutina de observación (5-10 minutos por lote)

#### Desde lejos (comportamiento)
1. ¿Hay animales aislados del grupo?
2. ¿Algún animal está echado cuando los demás están de pie?
3. ¿Hay animales que no se mueven con el resto?
4. ¿Se observan conductas anormales (caminar en círculos, presionar paredes)?

#### Desde cerca (apariencia)
1. **Cabeza**: ¿Ojos brillantes o hundidos? ¿Secreción nasal? ¿Orejas caídas o hacia atrás?
2. **Pelaje**: ¿Brillante o áspero? ¿Hay zonas sin pelo?
3. **Condición corporal**: ¿Costillas visibles? ¿Abdomen distendido?
4. **Heces**: ¿Consistencia normal (pastosa, forma de torta)? ¿Diarrea o estreñimiento?
5. **Orina**: ¿Color normal o muy oscura/ rojiza?
6. **Marcha**: ¿Cojea? ¿Camina con dificultad?

### Lista de verificación rápida (CHECKLIST)
| Signo | Bien | Observación |
|-------|------|-------------|
| Está con el grupo | ☐ Sí ☐ No | |
| Come y rumia | ☐ Sí ☐ No | |
| Se levanta con facilidad | ☐ Sí ☐ No | |
| Ojos brillantes y atentos | ☐ Sí ☐ No | |
| Sin secreciones | ☐ Sí ☐ No | |
| Heces normales | ☐ Sí ☐ No | |
| Marcha normal | ☐ Sí ☐ No | |
| Temperatura normal | ☐ Sí ☐ No | |
| Respiración normal | ☐ Sí ☐ No | |

### Sistema de semáforo sanitario
- **Verde**: Sin novedades → Continuar rutina
- **Amarillo**: Signos leves observados → Monitorear 2x al día, registrar en Villa Luz
- **Rojo**: Signos graves → Notificar veterinario, aislar, registrar como alerta

### Registro en plataforma Villa Luz
Al finalizar la inspección, el instructor debe:
1. Registrar animales con novedades en el módulo de controles
2. Crear alertas para animales en semáforo amarillo o rojo
3. Programar seguimientos (48-72 horas) para animales en observación
4. Verificar que los registros anteriores tengan cierre adecuado`,
      objectives: [
        'Establecer una rutina diaria de inspección del ganado',
        'Usar la lista de verificación para detección temprana',
        'Implementar el sistema de semáforo sanitario',
        'Registrar hallazgos en la plataforma Villa Luz',
      ],
      keyPoints: [
        '5-10 minutos de observación por lote pueden prevenir enfermedades graves',
        'El aislamiento del grupo es el signo más temprano de enfermedad',
        'Usar el semáforo: verde (bien), amarillo (observar), rojo (actuar)',
        'Todo hallazgo debe registrarse en Villa Luz inmediatamente',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'h12q1',
            question: '¿Cuál es el signo más temprano de enfermedad en un bovino?',
            options: ['Fiebre alta', 'Aislamiento del grupo', 'Diarrea', 'Pérdida de peso'],
            correctAnswer: 1,
            explanation: 'El aislamiento del grupo suele ser el signo más temprano de enfermedad. Un animal sano siempre está con el ganado.',
          },
          {
            id: 'h12q2',
            question: 'En el sistema de semáforo sanitario, ¿qué significa el color amarillo?',
            options: ['Sin novedades', 'Signos leves - monitorear 2x al día', 'Emergencia - veterinario inmediato', 'Animal sano'],
            correctAnswer: 1,
            explanation: 'Amarillo indica signos leves que requieren monitoreo cercano (2 veces al día) y registro en el sistema, pero no necesariamente atención veterinaria inmediata.',
          },
          {
            id: 'h12q3',
            question: '¿Cuánto tiempo se recomienda dedicar a la inspección de cada lote?',
            options: ['1-2 minutos', '5-10 minutos', '30 minutos', '1 hora'],
            correctAnswer: 1,
            explanation: 'Se recomiendan 5-10 minutos de observación por lote para una inspección efectiva pero eficiente.',
          },
        ],
      },
    },
  ],
};
