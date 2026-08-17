import { Course } from '../model/types';

export const courseBasics: Course = {
  id: 'basics',
  slug: 'basics',
  title: 'Manejo Básico del Ganado',
  description: 'Fundamentos esenciales para el manejo diario del ganado bovino. Aprende las mejores prácticas de alimentación, instalaciones y bienestar animal.',
  icon: 'BookOpen',
  color: 'indigo',
  totalLessons: 8,
  totalDuration: '2h',
  level: 'Básico',
  lessons: [
    {
      id: 'basics-1',
      title: 'Introducción al Manejo Bovino',
      duration: '15 min',
      content: `## Objetivo del Módulo

El manejo bovino es el conjunto de prácticas y técnicas que garantizan el bienestar, la productividad y la salud del ganado. Este curso está diseñado para que adquieras los conocimientos fundamentales necesarios para el cuidado diario del ganado.

### ¿Por qué es importante el buen manejo?
- **Bienestar animal**: Animales bien manejados son más productivos y longevos.
- **Rentabilidad**: Buenas prácticas reducen pérdidas por enfermedad y estrés.
- **Calidad del producto**: La carne y leche de animales bien cuidados tienen mejor calidad.
- **Cumplimiento normativo**: La legislación colombiana exige estándares de bienestar animal.

### Principios del manejo moderno
1. Observación diaria del comportamiento del animal
2. Instalaciones adecuadas y seguras
3. Alimentación balanceada según etapa productiva
4. Programa sanitario preventivo
5. Registros sistemáticos de todas las actividades

### El Rol del Operario como Instructor
Como instructor, tu labor va más allá del cuidado directo: debes ser capaz de enseñar, supervisar y garantizar que todos los operarios sigan los protocolos establecidos.`,
      objectives: [
        'Comprender la importancia del manejo bovino en la producción ganadera',
        'Identificar los principios fundamentales del manejo moderno',
        'Reconocer el rol del instructor en la cadena de producción',
      ],
      keyPoints: [
        'El bienestar animal es la base de la productividad',
        'La observación diaria previene problemas mayores',
        'Los registros son tan importantes como las acciones',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b1q1',
            question: '¿Cuál es la base fundamental de la productividad ganadera?',
            options: ['La genética del animal', 'El bienestar animal', 'La cantidad de alimento', 'El tamaño del potrero'],
            correctAnswer: 1,
            explanation: 'El bienestar animal es la base sobre la cual se construye toda la productividad. Un animal estresado o mal cuidado no producirá eficientemente, independientemente de su genética.',
          },
          {
            id: 'b1q2',
            question: '¿Cuántos principios fundamentales del manejo moderno se mencionan?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 2,
            explanation: 'Son 5 principios: observación diaria, instalaciones adecuadas, alimentación balanceada, programa sanitario, y registros sistemáticos.',
          },
          {
            id: 'b1q3',
            question: 'Como instructor, ¿cuál es una responsabilidad adicional al cuidado directo?',
            options: ['Solo alimentar los animales', 'Enseñar y supervisar a otros operarios', 'Únicamente tomar registros', 'Solo administrar medicamentos'],
            correctAnswer: 1,
            explanation: 'El instructor debe enseñar, supervisar y garantizar que todos los operarios sigan los protocolos establecidos.',
          },
        ],
      },
    },
    {
      id: 'basics-2',
      title: 'Instalaciones y Corrales',
      duration: '15 min',
      content: `## Instalaciones Ganaderas

Las instalaciones son el entorno físico donde el ganado pasa gran parte de su vida. Un diseño adecuado previene lesiones, reduce el estrés y facilita el manejo.

### Componentes esenciales

#### Corrales de manejo
- **Dimensiones mínimas**: 2.5m² por animal adulto en confinamiento temporal
- **Pisos**: Antideslizantes, con pendiente del 2-3% para drenaje
- **Techos**: En zonas de espera y trabajo, altura mínima de 3m
- **Ventilación**: Crucial en climas cálidos; corrales abiertos con barreras rompevientos

#### Embudo y manga de manejo
- Diseño curvo (aprovecha el instinto natural del bovino de querer regresar)
- Paredes sólidas (evitan distracciones visuales)
- Ancho ajustable según tamaño del animal
- Longitud máxima: 10-12 metros

#### Báscula
- Ubicación estratégica en la ruta de manejo
- Superficie plana y antideslizante
- Calibración mensual obligatoria

### Zonas del sistema de manejo
1. **Corral de recepción**: Amplio, con agua y sombra
2. **Embudo**: Reduce gradualmente el espacio
3. **Manga**: Trabajo individual
4. **Báscula**: Pesaje
5. **Corral de salida**: Separación por categorías

### Mantenimiento preventivo
- Revisión semanal de cercas y puertas
- Revisión mensual de pisos y drenajes
- Lubricación trimestral de puertas y trancas
- Reparación inmediata de puntas, clavos o astillas expuestas`,
      objectives: [
        'Identificar los componentes esenciales de las instalaciones ganaderas',
        'Conocer las dimensiones mínimas recomendadas para corrales',
        'Establecer un plan de mantenimiento preventivo',
      ],
      keyPoints: [
        'El diseño curvo de la manga aprovecha el instinto natural del bovino',
        'Paredes sólidas = menos estrés para el animal',
        'El mantenimiento preventivo evita accidentes y lesiones',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b2q1',
            question: '¿Cuál es el área mínima recomendada por animal adulto en confinamiento temporal?',
            options: ['1.5m²', '2.5m²', '3.5m²', '5m²'],
            correctAnswer: 1,
            explanation: 'Se recomienda un mínimo de 2.5m² por animal adulto en confinamiento temporal.',
          },
          {
            id: 'b2q2',
            question: '¿Por qué la manga de manejo debe tener diseño curvo?',
            options: ['Por estética', 'Para ahorrar espacio', 'Porque aprovecha el instinto natural del bovino de querer regresar', 'Porque es más barato de construir'],
            correctAnswer: 2,
            explanation: 'El diseño curvo aprovecha el instinto natural del bovino de querer regresar por donde vino, facilitando el flujo.',
          },
          {
            id: 'b2q3',
            question: '¿Cada cuánto se debe calibrar la báscula?',
            options: ['Cada semana', 'Cada mes', 'Cada 3 meses', 'Cada año'],
            correctAnswer: 1,
            explanation: 'La calibración mensual de la báscula es obligatoria para garantizar mediciones precisas.',
          },
        ],
      },
    },
    {
      id: 'basics-3',
      title: 'Alimentación Básica del Ganado',
      duration: '15 min',
      content: `## Fundamentos de Nutrición Bovina

La alimentación representa entre el 60% y 70% de los costos de producción ganadera. Una nutrición adecuada es fundamental para la salud, reproducción y productividad del ganado.

### Requerimientos nutricionales básicos
- **Agua**: 30-50 litros/día (adulto); acceso permanente y limpio
- **Energía**: Pastos, henos, ensilajes, concentrados
- **Proteína**: 7-14% de la dieta según etapa productiva
- **Minerales**: Calcio, fósforo, magnesio, sodio, zinc, cobre, selenio
- **Vitaminas**: A, D, E principalmente

### Tipos de sistemas de alimentación

#### Pastoreo extensivo
- Rotación de potreros (cada 3-7 días según carga)
- Suplementación mineral permanente
- Agua en cada potrero o a máximo 200m

#### Semi-estabulación
- Pastoreo diurno + suplementación en corral
- Ideal para vacas en producción
- Control más preciso del consumo

#### Estabulación completa
- Dieta totalmente mezclada (TMR)
- Máximo control nutricional
- Mayor costo pero mayor eficiencia

### Cálculo básico de consumo
- **Materia seca (MS)** = 2-3% del peso vivo/día
- Ejemplo: Animal de 450 kg consume 9-13.5 kg MS/día
- Pasto fresco tiene 20-30% MS → 450 kg animal consume 30-67 kg pasto fresco/día

### Suplementación mineral
- Sal mineralizada al 6-8% de fósforo
- Consumo esperado: 60-80 g/día por animal adulto
- Saladeros cubiertos, distribuidos estratégicamente`,
      objectives: [
        'Conocer los requerimientos nutricionales básicos del ganado',
        'Diferenciar los sistemas de alimentación',
        'Calcular el consumo básico de materia seca',
        'Implementar un programa de suplementación mineral',
      ],
      keyPoints: [
        'El agua es el nutriente más importante y más económico',
        'La sal mineralizada debe estar SIEMPRE disponible',
        'La rotación de potreros mejora la calidad del pasto',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b3q1',
            question: '¿Qué porcentaje de los costos de producción representa la alimentación?',
            options: ['30-40%', '40-50%', '60-70%', '80-90%'],
            correctAnswer: 2,
            explanation: 'La alimentación representa entre el 60% y 70% de los costos totales de producción ganadera.',
          },
          {
            id: 'b3q2',
            question: '¿Cuánta materia seca consume un animal como porcentaje de su peso vivo?',
            options: ['1-2%', '2-3%', '3-4%', '4-5%'],
            correctAnswer: 1,
            explanation: 'Un bovino consume entre el 2% y 3% de su peso vivo en materia seca por día.',
          },
          {
            id: 'b3q3',
            question: '¿Cuántos litros de agua consume aproximadamente un bovino adulto por día?',
            options: ['10-20 litros', '30-50 litros', '60-80 litros', '100-120 litros'],
            correctAnswer: 1,
            explanation: 'Un bovino adulto consume entre 30 y 50 litros de agua por día, dependiendo del clima, etapa productiva y tipo de alimentación.',
          },
        ],
      },
    },
    {
      id: 'basics-4',
      title: 'Manejo del Estrés Animal',
      duration: '15 min',
      content: `## Etología Aplicada al Manejo

La etología es el estudio del comportamiento animal. Entender cómo piensa y reacciona el bovino es la clave para un manejo eficiente y libre de estrés.

### Los 5 sentidos del bovino

#### Visión
- Visión panorámica de 330° (punto ciego justo detrás)
- Excelente percepción de movimiento
- Ven bien en la oscuridad (mejor que los humanos)
- Perciben contrastes fuertes (sombras, reflejos) como barreras
- No distinguen bien profundidad en pisos de rejilla

#### Oído
- Más sensible que el humano a frecuencias altas
- Los gritos y ruidos metálicos fuertes causan estrés extremo
- Se calman con voces suaves y familiares

#### Olfato
- Extremadamente desarrollado
- Detectan feromonas, miedo en otros animales
- Reconocen a su cuidador por el olor

### Zona de fuga
- Distancia a la que un animal se siente amenazado y huye
- Varía según: mansedumbre, genética, experiencias previas
- Vacas lecheras: 0.5-2 metros
- Ganado de carne extensivo: 5-50 metros

### Punto de balance
- Línea imaginaria a la altura del hombro
- Si te acercas por detrás del punto de balance → el animal avanza
- Si te acercas por delante → el animal retrocede

### Banderas y estímulos visuales
- La bandera es una extensión de tu brazo, no un arma
- Movimientos suaves, nunca golpes
- Usar para dirigir, no para asustar

### Señales de estrés en bovinos
1. Cola levantada o enroscada
2. Orejas hacia atrás
3. Resoplidos frecuentes
4. Defecación/ micción excesiva
5. Intentos de fuga o embestida
6. Temblores musculares`,
      objectives: [
        'Comprender cómo perciben el mundo los bovinos',
        'Aplicar el concepto de zona de fuga y punto de balance',
        'Identificar señales de estrés en el ganado',
      ],
      keyPoints: [
        'Los bovinos tienen visión panorámica de 330° y temen las sombras',
        'La zona de fuga define cómo acercarse sin estresar',
        'Un animal estresado es menos productivo y más peligroso',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b4q1',
            question: '¿Cuál es el campo visual aproximado de un bovino?',
            options: ['180°', '270°', '330°', '360°'],
            correctAnswer: 2,
            explanation: 'Los bovinos tienen una visión panorámica de aproximadamente 330°, con un pequeño punto ciego directamente detrás de ellos.',
          },
          {
            id: 'b4q2',
            question: 'Si quieres que un animal avance, ¿dónde debes posicionarte respecto a su punto de balance?',
            options: ['Delante del hombro', 'Detrás del hombro', 'Directamente al frente', 'Directamente detrás'],
            correctAnswer: 1,
            explanation: 'Para que el animal avance, debes posicionarte detrás de su punto de balance (línea del hombro). Si te pones delante, retrocederá.',
          },
          {
            id: 'b4q3',
            question: '¿Cuál NO es una señal de estrés en bovinos?',
            options: ['Cola levantada', 'Orejas hacia atrás', 'Rumia tranquila', 'Resoplidos frecuentes'],
            correctAnswer: 2,
            explanation: 'La rumia tranquila es señal de un animal relajado y saludable. Las otras opciones son indicadores de estrés.',
          },
        ],
      },
    },
    {
      id: 'basics-5',
      title: 'Sujeción y Manejo Seguro',
      duration: '15 min',
      content: `## Técnicas de Sujeción Segura

El manejo físico del ganado conlleva riesgos tanto para el operario como para el animal. Aplicar técnicas correctas de sujeción previene accidentes.

### Equipo de protección personal (EPP)
- **Botas de seguridad**: Punta de acero, antideslizantes, impermeables
- **Overol o ropa de trabajo**: Que permita movimiento, sin elementos sueltos
- **Guantes**: Para manejo de medicamentos y curaciones
- **Casco** (opcional): En trabajo con animales bravos
- **Protección respiratoria**: En ambientes con polvo o químicos

### Métodos de sujeción

#### Sujeción física sin estructuras
- **Lazo o soga**: Técnica de nudo rápido (no corredizo)
- **Nariguera o narigón**: Solo en animales adultos, uso temporal
- **Tope de cadera**: Presión suave en el flanco para inmovilizar

#### Sujeción con instalaciones
- **Bretel o cepo**: Inmovilización completa de cabeza
- **Manga de manejo**: Contención individual
- **Puertas de compresión**: Sujeción lateral para procedimientos

### Técnica de volteo (derribo)
**Solo para personal capacitado y en emergencias**
- Método de Ruffman o método de Reuff
- Requiere mínimo 2 personas
- Superficie acolchada o pasto suave
- Máximo 30 minutos de decúbito lateral

### Reglas de seguridad
1. Nunca trabajar solo con animales grandes
2. Mantener vías de escape identificadas
3. No hacer movimientos bruscos ni gritar
4. Revisar instalaciones antes de cada uso
5. Reportar animales agresivos inmediatamente
6. No introducir manos entre barrotes o puertas

### Zonas de peligro
- **Patada**: Alcance lateral y trasero; la coz más peligrosa es lateral
- **Cornada**: Alcance frontal y lateral con movimiento de cabeza
- **Aplastamiento**: Contra paredes, puertas o entre animales
- **Mordedura**: Menos común, pero posible en animales muy mansos`,
      objectives: [
        'Identificar el equipo de protección personal necesario',
        'Conocer los métodos de sujeción según la práctica a realizar',
        'Aplicar reglas de seguridad en el manejo diario',
      ],
      keyPoints: [
        'Nunca trabajar solo con animales grandes',
        'El bretel es el método más seguro de sujeción individual',
        'Las vías de escape deben estar siempre identificadas',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b5q1',
            question: '¿Cuál es el método más seguro de sujeción individual para procedimientos?',
            options: ['Lazo', 'Nariguera', 'Bretel o cepo', 'Volteo manual'],
            correctAnswer: 2,
            explanation: 'El bretel o cepo proporciona inmovilización completa de la cabeza y es el método más seguro para procedimientos individuales.',
          },
          {
            id: 'b5q2',
            question: '¿Cuál es la regla de seguridad más importante al manejar ganado?',
            options: ['Usar ropa de color rojo', 'Nunca trabajar solo con animales grandes', 'Siempre correr si el animal se asusta', 'Usar solo la voz para controlar'],
            correctAnswer: 1,
            explanation: 'Nunca se debe trabajar solo con animales grandes; siempre debe haber al menos otra persona presente.',
          },
        ],
      },
    },
    {
      id: 'basics-6',
      title: 'Bioseguridad en la Finca',
      duration: '15 min',
      content: `## Protocolos de Bioseguridad

La bioseguridad es el conjunto de medidas preventivas para evitar la entrada y propagación de enfermedades en la finca.

### Principios de bioseguridad
1. **Aislamiento**: Mantener separados animales enfermos, nuevos y de diferentes edades
2. **Control de tráfico**: Regular entrada de personas, vehículos y animales
3. **Limpieza y desinfección**: Protocolos estrictos en instalaciones
4. **Manejo de residuos**: Disposición adecuada de cadáveres, jeringas, medicamentos

### Barreras sanitarias

#### Barrera perimetral
- Cerca o malla que delimita la propiedad
- Un solo punto de acceso controlado
- Señalización visible de restricción

#### Rodaluvio o pediluvio
- Solución desinfectante para vehículos (entrada principal)
- Pediluvio para botas en cada zona de animales
- Cambio de solución cada 48-72 horas
- Desinfectantes: Amonio cuaternario, yodo, cloro (rotar mensualmente)

#### Cuarentena
- **Animales nuevos**: 21-30 días de aislamiento
- Ubicación alejada del ganado principal
- Personal dedicado o atención al final del día
- Pruebas diagnósticas antes de integrar

### Visitantes y personal
- Registro obligatorio de visitas (fecha, nombre, motivo, último contacto con ganado)
- Overol y botas de la finca (no permitir ingreso con ropa de calle)
- Prohibir acceso a personas con síntomas gripales a zonas de animales

### Manejo de agujas y medicamentos
- Aguja nueva por cada animal (no reutilizar)
- Recipiente rígido para agujas usadas (guardián)
- Eliminación por gestor autorizado
- Nunca enterrar o quemar jeringas plásticas`,
      objectives: [
        'Comprender los principios fundamentales de bioseguridad',
        'Implementar barreras sanitarias efectivas',
        'Conocer el protocolo de cuarentena para animales nuevos',
      ],
      keyPoints: [
        'La cuarentena de animales nuevos es la medida preventiva más importante',
        'Una aguja = un animal (nunca reutilizar)',
        'El pediluvio debe cambiarse cada 48-72 horas',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b6q1',
            question: '¿Cuántos días de cuarentena se recomiendan para animales nuevos?',
            options: ['7-14 días', '21-30 días', '45-60 días', '90 días'],
            correctAnswer: 1,
            explanation: 'Se recomiendan 21-30 días de aislamiento para animales nuevos antes de integrarlos al ganado principal.',
          },
          {
            id: 'b6q2',
            question: '¿Cada cuánto debe cambiarse la solución del pediluvio?',
            options: ['Cada 24 horas', 'Cada 48-72 horas', 'Cada semana', 'Cada mes'],
            correctAnswer: 1,
            explanation: 'La solución desinfectante del pediluvio debe cambiarse cada 48-72 horas para mantener su efectividad.',
          },
          {
            id: 'b6q3',
            question: '¿Cuál es la práctica correcta con las agujas usadas?',
            options: ['Se pueden reutilizar hasta 5 animales', 'Se lavan y reutilizan', 'Una aguja por cada animal, recipiente rígido para desecho', 'Se entierran en la finca'],
            correctAnswer: 2,
            explanation: 'Cada animal debe recibir una aguja nueva. Las usadas se depositan en recipiente rígido (guardián) y se eliminan por gestor autorizado.',
          },
        ],
      },
    },
    {
      id: 'basics-7',
      title: 'Bienestar Animal: Las 5 Libertades',
      duration: '15 min',
      content: `## Las 5 Libertades del Bienestar Animal

El concepto de las "5 Libertades", establecido por el Farm Animal Welfare Council (FAWC) del Reino Unido, es el estándar internacional para evaluar el bienestar animal.

### 1. Libre de hambre y sed
- Acceso permanente a agua fresca y limpia
- Dieta balanceada que mantenga salud y vigor
- Suplementación mineral permanente
- Ajustar alimentación según etapa productiva y clima

**Lista de verificación diaria:**
- ¿Todos los bebederos tienen agua limpia?
- ¿Los comederos no tienen alimento fermentado o mohoso?
- ¿Los saladeros tienen sal mineralizada disponible?

### 2. Libre de incomodidad
- Espacio suficiente para movimiento natural
- Áreas de descanso secas y limpias
- Protección contra condiciones climáticas extremas
- Instalaciones sin puntas, clavos o superficies que causen lesiones

**Áreas de sombra**: Un bovino sin sombra en clima cálido puede reducir su ganancia de peso hasta un 20%.

### 3. Libre de dolor, lesión y enfermedad
- Programa sanitario preventivo vigente
- Atención veterinaria oportuna
- Diagnóstico y tratamiento temprano
- Manejo cuidadoso en procedimientos dolorosos

**Indicadores de dolor en bovinos:**
- Aislamiento del grupo
- Arqueo de lomo
- Rechinar de dientes
- Disminución del consumo de alimento
- Postura anormal

### 4. Libre de miedo y angustia
- Manejo tranquilo y respetuoso
- Instalaciones diseñadas para flujo natural
- Evitar gritos, golpes, perros agresivos, picanas eléctricas
- Personal capacitado en etología básica

### 5. Libre para expresar comportamiento natural
- Espacio para pastoreo, rumia e interacción social
- Instalaciones que permitan movimiento natural
- Agrupación por edades y categorías compatibles
- Enriquecimiento ambiental básico (cepillos, sombra, etc.)`,
      objectives: [
        'Enumerar y explicar las 5 Libertades del bienestar animal',
        'Aplicar listas de verificación diarias en la finca',
        'Identificar indicadores de dolor en bovinos',
      ],
      keyPoints: [
        'Las 5 Libertades son el estándar mínimo internacional de bienestar',
        'La sombra puede afectar hasta 20% la ganancia de peso',
        'Un animal con dolor se aísla del grupo y arquea el lomo',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b7q1',
            question: '¿Cuántas son las libertades del bienestar animal?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 2,
            explanation: 'Las 5 Libertades fueron establecidas por el Farm Animal Welfare Council del Reino Unido.',
          },
          {
            id: 'b7q2',
            question: '¿Qué porcentaje de ganancia de peso puede perder un bovino sin acceso a sombra?',
            options: ['5%', '10%', '20%', '30%'],
            correctAnswer: 2,
            explanation: 'Un bovino sin acceso a sombra en clima cálido puede reducir su ganancia de peso hasta un 20%.',
          },
          {
            id: 'b7q3',
            question: '¿Cuál es un indicador de dolor en bovinos?',
            options: ['Rumia frecuente', 'Aislamiento del grupo', 'Juego con otros animales', 'Aumento del consumo'],
            correctAnswer: 1,
            explanation: 'El aislamiento del grupo es un indicador clásico de dolor o enfermedad en bovinos, junto con el arqueo de lomo y rechinar de dientes.',
          },
        ],
      },
    },
    {
      id: 'basics-8',
      title: 'Registros Básicos y Trazabilidad',
      duration: '15 min',
      content: `## Sistema de Registros en Ganadería

"Lo que no se mide, no se puede mejorar". Los registros son la herramienta más poderosa para la toma de decisiones en la finca.

### Tipos de registros esenciales

#### 1. Registro individual del animal
- Identificación única (chapeta, tatuaje o microchip)
- Fecha de nacimiento
- Raza, sexo, color
- Genealogía (padre y madre)
- Historial de pesos
- Historial sanitario

#### 2. Registro sanitario
- Fecha de vacunaciones
- Tipo de vacuna, lote, laboratorio
- Desparasitaciones (producto, dosis, fecha)
- Tratamientos médicos (diagnóstico, medicamento, dosis, duración)
- Tiempo de retiro de medicamentos

#### 3. Registro reproductivo
- Fechas de celo
- Fechas de servicio (monta natural o inseminación)
- Identificación del toro o pajilla
- Diagnóstico de preñez
- Fecha probable de parto
- Fecha real de parto
- Peso al nacimiento de la cría

#### 4. Registro de movimientos
- Altas (nacimientos, compras)
- Bajas (ventas, muertes, sacrificios)
- Causa de baja
- Traslados entre potreros

### Sistema Villa Luz de registros
La plataforma Villa Luz automatiza gran parte de estos registros. Como instructor, debes:
1. Verificar que todos los operarios registren las actividades en el sistema
2. Revisar alertas de registros faltantes
3. Corregir errores de digitación oportunamente
4. Generar reportes para la administración`,
      objectives: [
        'Identificar los 4 tipos de registros esenciales en ganadería',
        'Comprender la importancia de la trazabilidad',
        'Usar el sistema Villa Luz para la gestión de registros',
      ],
      keyPoints: [
        'Los registros son la base de la toma de decisiones',
        'La trazabilidad es obligatoria por normativa ICA',
        'El sistema Villa Luz automatiza y consolida todos los registros',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'b8q1',
            question: '¿Cuántos tipos de registros esenciales se mencionan en esta lección?',
            options: ['2', '3', '4', '5'],
            correctAnswer: 2,
            explanation: 'Son 4: registro individual del animal, registro sanitario, registro reproductivo y registro de movimientos.',
          },
          {
            id: 'b8q2',
            question: '¿Qué entidad regula la trazabilidad obligatoria en Colombia?',
            options: ['Ministerio de Agricultura', 'ICA', 'Fedegán', 'DIAN'],
            correctAnswer: 1,
            explanation: 'El ICA (Instituto Colombiano Agropecuario) es la entidad que regula y exige la trazabilidad del ganado en Colombia.',
          },
          {
            id: 'b8q3',
            question: '¿Cuál es la frase que resume la importancia de los registros?',
            options: ['El que mucho abarca poco aprieta', 'Lo que no se mide, no se puede mejorar', 'Más vale prevenir que lamentar', 'El que no arriesga no gana'],
            correctAnswer: 1,
            explanation: '"Lo que no se mide, no se puede mejorar" resume la filosofía detrás de mantener registros sistemáticos en la ganadería.',
          },
        ],
      },
    },
  ],
};
