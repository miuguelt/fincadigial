import { Course } from '../model/types';

export const courseReproduction: Course = {
  id: 'reproduction',
  slug: 'reproduction',
  title: 'Reproducción Bovina',
  description: 'Domina las técnicas modernas de manejo reproductivo. Desde la detección de celo hasta la inseminación artificial y el manejo del parto.',
  icon: 'Activity',
  color: 'emerald',
  totalLessons: 6,
  totalDuration: '2.5h',
  level: 'Intermedio',
  lessons: [
    {
      id: 'rep-1',
      title: 'Anatomía Reproductiva del Bovino',
      duration: '25 min',
      content: `## Sistema Reproductor de la Hembra y el Macho

Conocer la anatomía reproductiva es fundamental para entender los procesos de reproducción, diagnosticar problemas y realizar procedimientos como la inseminación artificial.

### Aparato reproductor de la vaca

#### Ovarios
- Dos órganos del tamaño de una aceituna grande
- Producen óvulos y hormonas (estrógeno, progesterona)
- Estructuras palpables: folículos (estructuras con líquido), cuerpo lúteo (estructura sólida)

#### Oviductos (trompas de Falopio)
- Conectan ovarios con útero
- Lugar donde ocurre la fertilización
- Transporte del óvulo hacia el útero (3-4 días)

#### Útero
- Dos cuernos uterinos (en bovinos, la gestación ocurre principalmente en el cuerno derecho)
- **Cérvix**: Estructura con 3-4 anillos cartilaginosos, puerta de entrada al útero
- Durante el celo: cérvix se relaja y abre
- Durante la gestación: cérvix sellado con tapón mucoso (protege al feto)

#### Vagina y Vulva
- Vestíbulo vaginal: punto de deposición del semen en monta natural
- Vulva: genitales externos; durante el celo se observa inflamada y con moco

### Aparato reproductor del toro
- **Testículos**: Producción de espermatozoides y testosterona
- **Epidídimo**: Maduración y almacenamiento de espermatozoides
- **Glándulas accesorias**: Próstata, vesículas seminales, bulbouretrales (producen plasma seminal)
- **Pene**: Fibroelástico, con flexura sigmoidea

### Hormonas clave del ciclo reproductivo
| Hormona | Origen | Función principal |
|---------|--------|------------------|
| GnRH | Hipotálamo | Estimula liberación de LH y FSH |
| FSH | Hipófisis | Desarrollo folicular |
| LH | Hipófisis | Ovulación, formación del cuerpo lúteo |
| Estrógeno | Folículo ovárico | Signos de celo, prepara útero |
| Progesterona | Cuerpo lúteo | Mantiene la gestación |
| PGF2α | Útero | Destruye cuerpo lúteo, inicia nuevo ciclo |`,
      objectives: [
        'Identificar las estructuras del aparato reproductor femenino y masculino',
        'Comprender la función de la cérvix como barrera y puerta de entrada',
        'Conocer las principales hormonas del ciclo reproductivo',
      ],
      keyPoints: [
        'La cérvix tiene 3-4 anillos cartilaginosos y se abre durante el celo',
        'En la vaca, la gestación ocurre principalmente en el cuerno derecho',
        'La progesterona mantiene la gestación; la PGF2α la termina',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r1q1',
            question: '¿Cuántos anillos cartilaginosos tiene la cérvix de la vaca?',
            options: ['1-2', '3-4', '5-6', 'No tiene anillos'],
            correctAnswer: 1,
            explanation: 'La cérvix bovina tiene 3-4 anillos cartilaginosos que forman una barrera protectora. Durante el celo se relaja permitiendo el paso del semen o del instrumento de inseminación.',
          },
          {
            id: 'r1q2',
            question: '¿Qué hormona es responsable de mantener la gestación?',
            options: ['Estrógeno', 'FSH', 'Progesterona', 'LH'],
            correctAnswer: 2,
            explanation: 'La progesterona, producida por el cuerpo lúteo, es la hormona encargada de mantener la gestación.',
          },
          {
            id: 'r1q3',
            question: '¿En cuál cuerno uterino ocurre principalmente la gestación en bovinos?',
            options: ['Cuerno izquierdo', 'Cuerno derecho', 'Ambos por igual', 'En el cuerpo del útero'],
            correctAnswer: 1,
            explanation: 'En bovinos, la gestación ocurre principalmente en el cuerno uterino derecho, aunque puede ocurrir en cualquiera.',
          },
        ],
      },
    },
    {
      id: 'rep-2',
      title: 'Ciclo Estral y Detección de Celo',
      duration: '25 min',
      content: `## El Ciclo Estral Bovino

La vaca es poliéstrica continua: cicla durante todo el año (no es estacional como las ovejas o cabras).

### Fases del ciclo estral (21 días promedio, rango 18-24)

#### 1. Proestro (días 18-20)
- El cuerpo lúteo del ciclo anterior se destruye (por PGF2α)
- Progesterona ↓, Estrógeno ↑
- Desarrollo folicular en el ovario
- La vaca empieza a mostrar inquietud

#### 2. Estro o Celo (día 0/21, duración 12-18 horas)
- **Único momento en que la vaca acepta la monta**
- Signos primarios (DEFINITIVO): Se deja montar por otras vacas o el toro
- Signos secundarios:
  - Inquietud, camina más de lo normal
  - Muge frecuentemente
  - Olfatea y lame a otras vacas
  - Monta a otras vacas (pero no se deja montar)
  - Vulva inflamada y enrojecida
  - Moco cervical claro y elástico (filante)
  - Disminución del consumo de alimento
  - Disminución de la producción de leche
  - Cola levantada o raspada

#### 3. Metaestro (días 1-5)
- Ovulación (24-32 horas después del inicio del celo)
- Formación del cuerpo lúteo (luteinización)
- La vaca deja de aceptar monta

#### 4. Diestro (días 5-18)
- Cuerpo lúteo funcional produce progesterona
- Útero se prepara para posible gestación
- Si NO hay embrión → día 17-18: PGF2α destruye cuerpo lúteo → nuevo ciclo

### Métodos de detección de celo

#### Observación visual (método más común y efectivo)
- Observar al menos 2 veces al día (30 minutos cada vez)
- Mejores horarios: muy temprano (5-7 am) y final de la tarde (5-7 pm)
- Buscar el signo DEFINITIVO: vaca quieta aceptando ser montada

#### Métodos auxiliares
- **Pintura en la base de la cola**: Se borra cuando otra vaca la monta
- **Parches detectores de monta** (Kamar, Estrotect): Cambian de color con la presión
- **Podómetros**: La vaca en celo camina 2-4 veces más de lo normal
- **Registros sistemáticos**: Predecir el próximo celo (cada 21 días)

### Mejores prácticas para el instructor
1. Entrenar a todo el personal en detección de signos de celo
2. Establecer horarios fijos de observación
3. Registrar TODO celo en Villa Luz (fecha, hora, signos observados)
4. Revisar la lista de vacas que "deberían" estar en celo cada semana`,
      objectives: [
        'Describir las 4 fases del ciclo estral bovino',
        'Identificar el signo definitivo de celo (se deja montar)',
        'Establecer un sistema de detección de celo en la finca',
      ],
      keyPoints: [
        'Ciclo estral: 21 días promedio (18-24)',
        'Signo DEFINITIVO: la vaca se deja montar quieta',
        'Duración del celo: 12-18 horas',
        'Ovulación: 24-32 horas después del inicio del celo',
        'Observar 2x al día, mínimo 30 min cada vez',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r2q1',
            question: '¿Cuál es la duración promedio del ciclo estral en la vaca?',
            options: ['7 días', '14 días', '21 días', '28 días'],
            correctAnswer: 2,
            explanation: 'El ciclo estral bovino dura en promedio 21 días, con un rango normal de 18-24 días.',
          },
          {
            id: 'r2q2',
            question: '¿Cuál es el signo DEFINITIVO de que una vaca está en celo?',
            options: ['Muge frecuentemente', 'Se deja montar quieta por otras vacas o el toro', 'Tiene la vulva inflamada', 'Produce menos leche'],
            correctAnswer: 1,
            explanation: 'El signo definitivo e inequívoco de celo es que la vaca se queda quieta y acepta ser montada. Los otros son signos secundarios.',
          },
          {
            id: 'r2q3',
            question: '¿Cuánto tiempo después del inicio del celo ocurre la ovulación?',
            options: ['6-12 horas', '24-32 horas', '48-72 horas', '5-7 días'],
            correctAnswer: 1,
            explanation: 'La ovulación ocurre aproximadamente 24-32 horas después del inicio del celo. Este dato es clave para programar la inseminación.',
          },
        ],
      },
    },
    {
      id: 'rep-3',
      title: 'Inseminación Artificial',
      duration: '25 min',
      content: `## Fundamentos de Inseminación Artificial (IA)

La IA es la tecnología reproductiva de mayor impacto en ganadería. Permite usar toros genéticamente superiores a bajo costo y controlar enfermedades venéreas.

### Ventajas de la IA
- Mejoramiento genético acelerado (toros élite inalcanzables en monta natural)
- Control de enfermedades venéreas (no hay contacto directo)
- Mayor seguridad para el personal (no hay manejo de toros)
- Registros precisos de paternidad
- Disminución de costos de mantenimiento de toros

### Equipos y materiales para IA
- **Termo de nitrógeno líquido**: Conserva pajillas a -196°C
- **Pajillas (pajuelas)**: Contenedores de semen con capacidad de 0.25 o 0.5 ml
- **Pistola de inseminación (aplicador)**: Universal o de medio cc
- **Fundas sanitarias**: Protegen la pistola durante la introducción
- **Cortapajillas**: Para cortar el extremo sellado de la pajilla
- **Pinzas**: Para extraer pajillas del termo sin descongelar otras
- **Termo descongelador**: Agua a 35-37°C para descongelar pajillas
- **Guantes de palpación**: Desechables, largos hasta el hombro
- **Lubricante**: Específico para IA (no usar jabón ni vaselina)

### Procedimiento de IA (resumen técnico)
1. Descongelar pajilla: 35-37°C por 30-40 segundos
2. Cargar la pistola con la pajilla
3. Colocar funda sanitaria y asegurar
4. Introducir mano enguantada en el recto (limpiar heces primero)
5. Localizar y sujetar la cérvix por vía rectal
6. Introducir pistola por vulva y vagina hasta la cérvix
7. Atravesar los anillos del cérvix (maniobra más delicada)
8. Depositar el semen en el cuerpo del útero (justo después de la cérvix)
9. Retirar pistola suavemente
10. Masajear clítoris para estimular contracciones uterinas

### Momento óptimo de inseminación
- Regla AM-PM: Si se detecta celo en la mañana → inseminar en la tarde
- Si se detecta en la tarde → inseminar a la mañana siguiente
- Objetivo: Depositar semen 6-12 horas ANTES de la ovulación`,
      objectives: [
        'Conocer las ventajas de la IA sobre la monta natural',
        'Identificar los equipos necesarios para IA',
        'Comprender el procedimiento paso a paso',
        'Aplicar la regla AM-PM para el momento óptimo de inseminación',
      ],
      keyPoints: [
        'La IA permite usar toros élite a bajo costo',
        'Regla AM-PM: Mañana detecta → tarde insemina; Tarde detecta → mañana insemina',
        'La pajilla se descongela a 35-37°C por 30-40 segundos',
        'El semen se deposita en el cuerpo del útero, no en la cérvix',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r3q1',
            question: 'Según la regla AM-PM, si una vaca es detectada en celo a las 8:00 AM, ¿a qué hora se debe inseminar aproximadamente?',
            options: ['Inmediatamente', 'En la tarde del mismo día', 'A la mañana siguiente', '48 horas después'],
            correctAnswer: 1,
            explanation: 'Regla AM-PM: celo detectado en la mañana → inseminar en la tarde del mismo día. Así el semen está en el tracto reproductivo varias horas antes de la ovulación.',
          },
          {
            id: 'r3q2',
            question: '¿A qué temperatura se descongela una pajilla de semen?',
            options: ['A temperatura ambiente (20°C)', '35-37°C en agua', '50-60°C en agua', 'Directamente con la mano'],
            correctAnswer: 1,
            explanation: 'Las pajillas se descongelan en agua a 35-37°C durante 30-40 segundos. Temperaturas incorrectas matan los espermatozoides.',
          },
          {
            id: 'r3q3',
            question: '¿Dónde se debe depositar el semen durante la inseminación artificial?',
            options: ['En la vagina', 'Dentro de la cérvix', 'En el cuerpo del útero (justo después de la cérvix)', 'En los ovarios'],
            correctAnswer: 2,
            explanation: 'El semen debe depositarse en el cuerpo del útero, justo después de atravesar la cérvix. Depositar en la cérvix o vagina reduce drásticamente la fertilidad.',
          },
        ],
      },
    },
    {
      id: 'rep-4',
      title: 'Gestación y Diagnóstico de Preñez',
      duration: '25 min',
      content: `## Manejo de la Vaca Gestante

La gestación bovina dura aproximadamente 283 días (9 meses y 1 semana).

### Etapas de la gestación

#### Primer tercio (0-90 días)
- Implantación del embrión (día 15-45)
- Diferenciación de órganos (organogénesis)
- **Momento crítico**: La mayoría de las pérdidas embrionarias ocurren aquí
- Evitar estrés (transporte, vacunaciones, cambios bruscos de dieta)
- Diagnóstico de preñez: posible desde día 28-30 (ultrasonido)

#### Segundo tercio (90-180 días)
- Crecimiento fetal acelerado
- Desarrollo del esqueleto y músculos
- La vaca debe ganar condición corporal (recuperar del parto anterior)
- Último momento seguro para vacunaciones de la madre

#### Tercer tercio (180-283 días)
- 70% del crecimiento fetal ocurre en esta etapa
- Mayor demanda nutricional
- **Secado** (60 días antes del parto): suspender el ordeño
- Preparar sala de parto o potrero de maternidad

### Métodos de diagnóstico de preñez

#### Palpación rectal
- Desde el día 35-45 de gestación
- Requiere entrenamiento y práctica
- Método más usado en Colombia por su bajo costo

#### Ultrasonido (ecografía)
- Desde el día 28-30
- Permite ver el embrión, latido cardíaco
- Puede determinar sexo fetal (día 55-65)
- Mayor costo pero más preciso y temprano

#### Pruebas de laboratorio
- PAG (Pregnancy Associated Glycoproteins): Muestra de sangre, día 28+
- Progesterona en leche: día 21-24 (si no retorna al celo)

### Signos de preñez
- No retorno al celo (signo más temprano, no 100% confiable)
- Aumento de peso progresivo
- Distensión abdominal (visible desde el 5°-6° mes)
- Aumento de la ubre (últimas 2-4 semanas)
- Relajación de ligamentos pélvicos (días antes del parto)`,
      objectives: [
        'Conocer las 3 etapas de la gestación y sus cuidados',
        'Diferenciar los métodos de diagnóstico de preñez',
        'Identificar los signos de preñez en la vaca',
      ],
      keyPoints: [
        'Gestación: 283 días promedio (9 meses + 1 semana)',
        'El 70% del crecimiento fetal es en el último tercio',
        'Secar la vaca 60 días antes del parto',
        'La palpación rectal es el método más usado en Colombia',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r4q1',
            question: '¿Cuánto dura aproximadamente la gestación bovina?',
            options: ['240 días', '270 días', '283 días', '310 días'],
            correctAnswer: 2,
            explanation: 'La gestación bovina dura aproximadamente 283 días (9 meses y 1 semana), aunque varía según raza y otros factores.',
          },
          {
            id: 'r4q2',
            question: '¿Cuándo ocurre el 70% del crecimiento fetal?',
            options: ['En el primer tercio', 'En el segundo tercio', 'En el último tercio', 'En el parto'],
            correctAnswer: 2,
            explanation: 'El 70% del crecimiento fetal ocurre durante el último tercio de la gestación, por lo que la demanda nutricional de la madre aumenta significativamente.',
          },
          {
            id: 'r4q3',
            question: '¿Cuántos días antes del parto se debe secar a la vaca?',
            options: ['30 días', '60 días', '90 días', '120 días'],
            correctAnswer: 1,
            explanation: 'Se recomienda el secado 60 días antes del parto, permitiendo que la ubre descanse y se prepare para la siguiente lactancia.',
          },
        ],
      },
    },
    {
      id: 'rep-5',
      title: 'Manejo del Parto y Atención al Neonato',
      duration: '25 min',
      content: `## Parto Bovino y Cuidados del Recién Nacido

El parto es el evento más crítico en la vida productiva de la vaca. Un manejo adecuado reduce la mortalidad de crías y complicaciones en la madre.

### Fases del parto

#### Fase 1: Preparación (2-6 horas)
- Inquietud, la vaca se separa del grupo
- Contracciones uterinas iniciales (no visibles externamente)
- Dilatación del cérvix
- Puede observarse el saco alantoideo (primera "bolsa de agua")

#### Fase 2: Expulsión del ternero (30 min - 2 horas)
- Contracciones abdominales visibles (la vaca puja)
- Aparece el saco amniótico (segunda "bolsa de agua") en la vulva
- Deben verse las pezuñas delanteras y la nariz
- La vaca puede estar echada o de pie
- **Límite de intervención**: 1-2 horas sin progreso visible

#### Fase 3: Expulsión de la placenta (2-8 horas)
- La placenta debe ser expulsada completamente
- **Si pasan más de 12 horas = retención de placenta**

### Presentaciones normales y anormales del ternero
- **Presentación anterior (normal)**: Cabeza y patas delanteras hacia el canal del parto
- **Presentación posterior (normal pero más riesgosa)**: Patas traseras primero (urgencia relativa)
- **Anormal**: Cabeza doblada, pata doblada, posición transversal (urgencia absoluta)

### Atención al recién nacido

#### Inmediatamente al nacer (primeros 5 minutos)
1. Limpiar membranas fetales de la nariz y boca
2. Verificar que respira (estimular con paja en la nariz o frotar el pecho)
3. Si no respira: colgar de patas traseras 10-15 segundos (solo si es necesario)
4. **NO cortar el cordón**: Se rompe naturalmente; solo desinfectar con yodo

#### Primera hora de vida
1. La vaca debe lamer al ternero (estimula la respiración y circulación)
2. El ternero debe intentar ponerse de pie en 30-60 minutos
3. **Toma de calostro**: Dentro de las primeras 2-4 horas de vida

### Calostro: El oro líquido
- Primera leche rica en anticuerpos (inmunoglobulinas)
- La absorción intestinal de anticuerpos SOLO ocurre en las primeras 24 horas (máximo 6-8 horas)
- **Regla 2-2-2**: 2 litros en las primeras 2 horas, 2 litros en las siguientes 2 horas
- Calidad del calostro: Denso, cremoso, color amarillento
- Si la vaca no produce suficiente, usar banco de calostro congelado

### Desinfección del ombligo
- Aplicar yodo al 7-10% en el ombligo inmediatamente
- Repetir cada 24 horas por 3 días
- Previene infecciones (onfaloflebitis)`,
      objectives: [
        'Conocer las 3 fases del parto bovino',
        'Identificar presentaciones normales y anormales al parto',
        'Aplicar el protocolo de atención al neonato',
        'Administrar calostro de calidad a tiempo',
      ],
      keyPoints: [
        'Regla de oro del calostro: 2 litros en las primeras 2 horas',
        'El cordón umbilical NO se corta, se desinfecta con yodo',
        'Máximo 1 hora sin progreso en el parto antes de intervenir',
        'La placenta debe salir en máximo 12 horas post-parto',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r5q1',
            question: 'Según la regla 2-2-2 del calostro, ¿cuánto debe consumir un ternero en las primeras 2 horas?',
            options: ['1 litro', '2 litros', '3 litros', '4 litros'],
            correctAnswer: 1,
            explanation: 'La regla 2-2-2 establece: 2 litros de calostro en las primeras 2 horas de vida, y 2 litros más en las siguientes 2 horas.',
          },
          {
            id: 'r5q2',
            question: '¿Qué se debe hacer con el cordón umbilical del ternero recién nacido?',
            options: ['Cortarlo con tijeras', 'No cortarlo, solo desinfectar con yodo', 'Amarrarlo con hilo', 'Dejarlo sin hacer nada'],
            correctAnswer: 1,
            explanation: 'El cordón umbilical NO se debe cortar. Se rompe naturalmente y solo se debe desinfectar con yodo al 7-10% para prevenir infecciones.',
          },
          {
            id: 'r5q3',
            question: '¿Cuánto tiempo máximo debe pasar para que la placenta sea expulsada después del parto?',
            options: ['2 horas', '12 horas', '24 horas', '48 horas'],
            correctAnswer: 1,
            explanation: 'La placenta debe ser expulsada en un máximo de 12 horas después del parto. Pasado este tiempo se considera retención de placenta.',
          },
        ],
      },
    },
    {
      id: 'rep-6',
      title: 'Evaluación Reproductiva del Toro',
      duration: '25 min',
      content: `## Examen de Aptitud Reproductiva del Toro

"El toro es la mitad del ganado". Un toro subfértil o infértil causa pérdidas económicas enormes al dejar vacas vacías.

### ¿Por qué evaluar a los toros?
- El 90% de las vacas pueden ser servidas por un solo toro en la temporada
- Un toro infértil = pérdida de toda una temporada de cría
- Muchos toros son subfértiles sin mostrar signos externos
- La evaluación es un seguro de fertilidad del ganado

### Componentes de la evaluación

#### 1. Examen físico general
- Condición corporal (ideal 3-3.5 en escala 1-5)
- Estado de pezuñas y aplomos (la cojera impide la monta)
- Ojos (no puede montar lo que no ve)
- Edad y desgaste dental

#### 2. Examen de órganos reproductivos
- **Testículos**: Tamaño, forma, consistencia (firme-elástico)
- Circunferencia escrotal mínima por edad
  - 12-14 meses: ≥30 cm
  - 15-20 meses: ≥32 cm
  - 21-30 meses: ≥34 cm
  - >30 meses: ≥36 cm
- **Epidídimo**: Sin nódulos ni inflamaciones
- **Pene y prepucio**: Sin lesiones, fimosis ni parafimosis
- **Glándulas accesorias**: Próstata y vesículas seminales (palpación rectal)

#### 3. Evaluación del semen
- Recolección con electroeyaculador o vagina artificial
- **Motilidad masal**: Movimiento en masa (escala 0-5, deseable ≥3)
- **Motilidad individual**: % de espermatozoides con movimiento progresivo (≥30%)
- **Concentración**: ≥500 millones/ml
- **Morfología**: ≥70% de espermatozoides normales

### Clasificación del toro
- **Satisfactorio**: Cumple todos los parámetros mínimos
- **Insatisfactorio**: No cumple un parámetro → repetir examen en 6 semanas
- **Diferido**: Condición temporal que puede mejorar (ej. baja condición corporal)

### Frecuencia de evaluación
- Antes del inicio de cada temporada de servicio
- Toros jóvenes: anualmente los primeros 3 años
- Toros adultos: cada 2 años si el historial es bueno`,
      objectives: [
        'Comprender la importancia económica de evaluar los toros',
        'Conocer los 3 componentes de la evaluación reproductiva',
        'Interpretar los resultados: satisfactorio, insatisfactorio, diferido',
      ],
      keyPoints: [
        'La circunferencia escrotal se correlaciona directamente con fertilidad',
        'Un toro adulto debe tener ≥36 cm de circunferencia escrotal',
        'Evaluar toros anualmente o antes de cada temporada',
        'El 90% de las vacas pueden depender de un solo toro',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r6q1',
            question: '¿Cuál debe ser la circunferencia escrotal mínima de un toro mayor de 30 meses?',
            options: ['30 cm', '32 cm', '34 cm', '36 cm'],
            correctAnswer: 3,
            explanation: 'Un toro adulto (>30 meses) debe tener mínimo 36 cm de circunferencia escrotal. A mayor tamaño testicular, mayor producción espermática y mejor fertilidad.',
          },
          {
            id: 'r6q2',
            question: '¿Cada cuánto se recomienda evaluar reproductivamente los toros jóvenes (primeros 3 años)?',
            options: ['Cada mes', 'Cada 6 meses', 'Anualmente', 'Solo cuando falla en preñar'],
            correctAnswer: 2,
            explanation: 'Los toros jóvenes deben evaluarse anualmente durante sus primeros 3 años de servicio. Los toros adultos cada 2 años si el historial es bueno.',
          },
          {
            id: 'r6q3',
            question: '¿Qué porcentaje de las vacas puede ser servido por un solo toro en una temporada?',
            options: ['30%', '50%', '75%', '90%'],
            correctAnswer: 3,
            explanation: 'Un solo toro puede servir hasta el 90% de las vacas en una temporada, por eso un toro infértil causa pérdidas tan grandes.',
          },
        ],
      },
    },
  ],
};
