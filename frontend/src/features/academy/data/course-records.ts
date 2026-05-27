import { Course } from '../model/types';

export const courseRecords: Course = {
  id: 'records',
  slug: 'records',
  title: 'Registro ICA y Trazabilidad',
  description: 'Aprende a cumplir con los requisitos del ICA para el registro de predios, movilización de animales, identificación y reportes obligatorios.',
  icon: 'Award',
  color: 'amber',
  totalLessons: 10,
  totalDuration: '3h',
  level: 'Básico',
  lessons: [
    {
      id: 'records-1',
      title: 'El Sistema ICA y su Marco Normativo',
      duration: '20 min',
      content: `## El Instituto Colombiano Agropecuario y la Sanidad Animal

El Instituto Colombiano Agropecuario (ICA) es la entidad oficial encargada de ejercer el control técnico-científico de la sanidad animal en Colombia. Su misión es prevenir la introducción y propagación de plagas y enfermedades que puedan afectar la producción pecuaria nacional. Como operario ganadero, entender el marco normativo del ICA es fundamental para garantizar que tu finca opere dentro de la legalidad.

### Ley 395 de 1997
La Ley 395 de 1997 establece la obligatoriedad del registro sanitario de predios pecuarios (RSPP) en todo el territorio nacional. Esta ley busca proteger el estatus sanitario del país y garantizar la trazabilidad del ganado desde su nacimiento hasta el consumidor final. Ningún predio puede tener animales de producción sin este registro.

### SINIIGA: El Sistema Nacional de Identificación
El Sistema Nacional de Identificación e Información de Ganado Bovino (SINIIGA) es la plataforma oficial administrada por el ICA para centralizar la identificación individual de cada bovino y bufalino en Colombia. Cada animal debe tener un identificador único vinculado al predio de origen.

### Las 7 obligaciones del productor pecuario
1. Obtener y mantener vigente el RSPP
2. Identificar individualmente todos los animales con dispositivo SINIIGA
3. Expedir Guía Sanitaria de Movilización Interna (GSMI) para todo traslado
4. Llevar el libro de registro de la finca actualizado
5. Reportar nacimientos, muertes y movimientos oportunamente
6. Cumplir con los programas sanitarios oficiales (vacunación aftosa, brucelosis, tuberculosis)
7. Permitir las visitas de inspección y auditoría del ICA

El incumplimiento de cualquiera de estas obligaciones puede resultar en sanciones económicas, decomiso de animales e incluso el cierre del predio.`,
      objectives: [
        'Comprender el rol del ICA en la sanidad animal colombiana',
        'Conocer las disposiciones de la Ley 395 de 1997 sobre registro de predios',
        'Identificar las 7 obligaciones fundamentales del productor pecuario',
      ],
      keyPoints: [
        'El ICA es la máxima autoridad sanitaria para la producción pecuaria en Colombia',
        'La Ley 395/1997 hace obligatorio el RSPP en todo el territorio nacional',
        'SINIIGA centraliza la identificación individual de todos los bovinos del país',
        'El incumplimiento de obligaciones ICA puede resultar en cierre del predio',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r1q1',
            question: '¿Qué ley establece la obligatoriedad del Registro Sanitario de Predio Pecuario en Colombia?',
            options: ['Ley 100 de 1993', 'Ley 395 de 1997', 'Ley 715 de 2001', 'Ley 1753 de 2015'],
            correctAnswer: 1,
            explanation: 'La Ley 395 de 1997 estableció la obligatoriedad del RSPP como mecanismo para proteger la sanidad animal y garantizar la trazabilidad del ganado colombiano.',
          },
          {
            id: 'r1q2',
            question: '¿Qué significa la sigla SINIIGA?',
            options: ['Sistema Nacional de Inocuidad e Inspección Ganadera', 'Sistema Nacional de Identificación e Información de Ganado Bovino', 'Sistema Integral de Inspección y Guía Agropecuaria', 'Sistema Informatizado de Normas Internacionales Ganaderas'],
            correctAnswer: 1,
            explanation: 'SINIIGA significa Sistema Nacional de Identificación e Información de Ganado Bovino, la plataforma oficial del ICA para la identificación individual de cada animal.',
          },
          {
            id: 'r1q3',
            question: '¿Cuál de las siguientes NO es una obligación del productor pecuario?',
            options: ['Obtener y mantener vigente el RSPP', 'Identificar animales con dispositivo SINIIGA', 'Exportar directamente ganado sin certificación', 'Llevar libro de registro de la finca'],
            correctAnswer: 2,
            explanation: 'Exportar ganado sin certificación NO es un derecho automático; se requiere certificación del ICA y cumplir con los requisitos del país de destino. Las otras tres opciones sí son obligaciones del productor.',
          },
        ],
      },
    },
    {
      id: 'records-2',
      title: 'Registro Sanitario de Predio Pecuario RSPP',
      duration: '20 min',
      content: `## El RSPP: Tu Licencia para Producir

El Registro Sanitario de Predio Pecuario (RSPP) es el documento oficial que acredita que tu finca cumple con las condiciones sanitarias mínimas para la producción de ganado. Es el equivalente a una licencia de funcionamiento y ningún predio puede operar sin él.

### ¿Qué es el RSPP?
Es un registro administrativo otorgado por el ICA que certifica la ubicación geográfica, la capacidad instalada, el tipo de producción y las condiciones sanitarias de un predio pecuario. El RSPP es único para cada predio y está vinculado a un código de identificación predial.

### Requisitos para obtener el RSPP
Para tramitar el RSPP por primera vez necesitas presentar ante la oficina ICA de tu jurisdicción:
- Formulario de solicitud debidamente diligenciado
- Certificado de tradición y libertad del predio (no mayor a 30 días)
- Cédula de ciudadanía del propietario o representante legal
- Plano de ubicación del predio con coordenadas geográficas
- Inventario inicial de animales (si aplica)
- Certificado de vacunación vigente contra fiebre aftosa
- Comprobante de pago de la tarifa correspondiente

### Proceso de obtención paso a paso
1. Visita la oficina ICA más cercana con los documentos requeridos
2. Radica la solicitud con todos los soportes completos
3. El ICA programa una visita técnica al predio (dentro de los 15-30 días hábiles siguientes)
4. El inspector verifica instalaciones, inventario, bioseguridad y condiciones sanitarias
5. Si todo está en orden, se expide el certificado RSPP (vigencia indefinida mientras se mantengan condiciones)
6. El código RSPP queda registrado en el sistema SINIIGA

### Mantenimiento y actualización
El RSPP no es un trámite de una sola vez. Debes:
- Actualizar el inventario animal anualmente
- Reportar cambios en la capacidad instalada (nuevas construcciones, ampliaciones)
- Reportar cambios de propietario o razón social inmediatamente
- Mantener vigentes los certificados de vacunación

### Causales de cancelación
El ICA puede cancelar el RSPP por: brotes de enfermedades no reportados, falsedad en la información, obstrucción a visitas de inspección, o reincidencia en movilización sin GSMI.`,
      objectives: [
        'Definir qué es el RSPP y su importancia legal para la finca',
        'Enumerar los documentos necesarios para tramitar el RSPP',
        'Conocer el proceso de mantenimiento y las causales de cancelación',
      ],
      keyPoints: [
        'El RSPP es obligatorio para todo predio pecuario en Colombia',
        'La visita técnica del ICA es parte del proceso de aprobación',
        'La vigencia es indefinida siempre que se mantengan las condiciones sanitarias',
        'Actualizar el inventario anualmente es responsabilidad del productor',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r2q1',
            question: '¿Qué significa la sigla RSPP?',
            options: ['Registro Sanitario de Producción Pecuaria', 'Registro Sanitario de Predio Pecuario', 'Registro de Seguimiento y Producción Pecuaria', 'Red de Sanidad Pecuaria y Predial'],
            correctAnswer: 1,
            explanation: 'RSPP significa Registro Sanitario de Predio Pecuario, el documento que acredita las condiciones sanitarias mínimas del predio ante el ICA.',
          },
          {
            id: 'r2q2',
            question: '¿Qué documento NO es necesario para tramitar el RSPP por primera vez?',
            options: ['Formulario de solicitud', 'Certificado de tradición y libertad', 'Licencia ambiental del predio', 'Certificado de vacunación aftosa vigente'],
            correctAnswer: 2,
            explanation: 'La licencia ambiental no es un requisito exigido por el ICA para el RSPP. Los otros tres documentos sí son necesarios para el trámite inicial.',
          },
          {
            id: 'r2q3',
            question: '¿Qué sucede si un productor moviliza animales repetidamente sin GSMI?',
            options: ['Solo recibe una llamada de atención', 'No pasa nada si los animales están sanos', 'Puede ser causal de cancelación del RSPP por reincidencia', 'Solo paga una multa menor'],
            correctAnswer: 2,
            explanation: 'La reincidencia en la movilización sin Guía Sanitaria de Movilización Interna (GSMI) es causal de cancelación del RSPP, además de las sanciones económicas.',
          },
        ],
      },
    },
    {
      id: 'records-3',
      title: 'Identificación Animal y SINIIGA',
      duration: '20 min',
      content: `## El Sistema de Identificación Individual del Ganado

La identificación individual de cada animal es la base de la trazabilidad. En Colombia, el SINIIGA establece que todo bovino y bufalino debe ser identificado con un dispositivo único e intransferible, lo que permite seguir el rastro del animal desde su nacimiento hasta el consumidor final.

### La chapeta SINIIGA
La chapeta oficial SINIIGA es un dispositivo visual de color naranja que contiene un código alfanumérico único de 16 dígitos. Este código vincula al animal con su predio de origen y permite consultar su historial completo en la plataforma del ICA. La chapeta debe colocarse en la oreja izquierda del animal (oreja derecha reservada para otros identificadores).

### Dispositivo RFID (Identificación Electrónica)
Además de la chapeta visual, el SINIIGA contempla el uso de dispositivos RFID (Radio Frequency Identification) tipo botón o bandera. El RFID permite lectura automática sin necesidad de acercarse al animal, agilizando pesajes, vacunaciones y movilizaciones. Ventajas:
- Lectura sin contacto visual directo
- Reduce errores de digitación
- Automatiza registros en báscula y manga
- Permite trazabilidad en tiempo real
- Disminuye el estrés del animal al reducir el tiempo de manejo

### Proceso de identificación
1. Solicitar los dispositivos al administrador SINIIGA autorizado en tu zona
2. Registrar el predio y solicitar el lote de chapetas correspondiente
3. Identificar cada animal al nacimiento o al ingreso al predio (antes de 90 días de edad máximo)
4. Registrar la identificación en el sistema, vinculando: código chapeta, fecha de nacimiento, raza, sexo, madre
5. Si una chapeta se pierde, solicitar reposición inmediata (no reutilizar chapetas viejas)

### Beneficios de una identificación correcta
- Cumplimiento normativo que evita sanciones del ICA
- Trazabilidad completa del animal para mercados de exportación
- Facilita el manejo reproductivo y sanitario
- Permite el control preciso de inventario ganadero
- Agrega valor comercial al hato (animal identificado = mayor precio)

### Errores comunes en la identificación
- Colocar la chapeta en la oreja equivocada (debe ser oreja izquierda)
- No registrar la identificación en el sistema después de colocar la chapeta
- Reutilizar chapetas de animales muertos o vendidos
- Dejar pasar más de 90 días para identificar terneros recién nacidos`,
      objectives: [
        'Explicar la función del SINIIGA y la importancia de la identificación individual',
        'Describir el proceso correcto de identificación con chapeta y RFID',
        'Identificar los errores comunes en la identificación animal',
      ],
      keyPoints: [
        'La chapeta SINIIGA naranja con código de 16 dígitos va en la oreja izquierda',
        'El RFID permite lectura automática y reduce errores de digitación',
        'Todo animal debe ser identificado antes de los 90 días de nacido',
        'NUNCA reutilizar chapetas de animales fallecidos o vendidos',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r3q1',
            question: '¿En qué oreja debe colocarse la chapeta oficial SINIIGA?',
            options: ['Oreja derecha', 'Oreja izquierda', 'Cualquiera de las dos', 'Alternar entre ambas'],
            correctAnswer: 1,
            explanation: 'La chapeta SINIIGA debe colocarse en la oreja izquierda del animal. La oreja derecha se reserva para otros identificadores internos de la finca.',
          },
          {
            id: 'r3q2',
            question: '¿Cuál es el plazo máximo para identificar un ternero recién nacido?',
            options: ['30 días', '60 días', '90 días', '120 días'],
            correctAnswer: 2,
            explanation: 'El plazo máximo para identificar un bovino con dispositivo SINIIGA es de 90 días desde su nacimiento o ingreso al predio.',
          },
          {
            id: 'r3q3',
            question: '¿Cuál es una ventaja del RFID frente a la chapeta visual tradicional?',
            options: ['Es más barato', 'Permite lectura automática sin contacto visual', 'No necesita ser solicitado al ICA', 'Se puede reutilizar entre animales'],
            correctAnswer: 1,
            explanation: 'El RFID (Radio Frequency Identification) permite lectura automática sin necesidad de acercarse al animal, lo que agiliza procesos como pesaje y reduce el estrés del animal.',
          },
        ],
      },
    },
    {
      id: 'records-4',
      title: 'Guía Sanitaria de Movilización Interna GSMI',
      duration: '20 min',
      content: `## Movilización Legal de Ganado en Colombia

La Guía Sanitaria de Movilización Interna (GSMI) es el documento oficial obligatorio que ampara todo traslado de animales vivos dentro del territorio colombiano. Ningún animal puede ser transportado sin la GSMI correspondiente, y transportar ganado sin ella constituye una infracción grave.

### ¿Qué es la GSMI?
Es un documento electrónico expedido por el ICA a través del sistema SINIIGA que certifica que los animales a movilizar cumplen con los requisitos sanitarios vigentes, provienen de un predio registrado (RSPP activo), están identificados individualmente y no representan riesgo sanitario para la zona de destino. La GSMI es específica para cada movilización: un viaje = una GSMI.

### Requisitos para expedir la GSMI
Antes de solicitar la GSMI debes cumplir con:
- RSPP del predio de origen vigente y sin sanciones
- Todos los animales a movilizar debidamente identificados con chapeta SINIIGA
- Vacunación contra fiebre aftosa vigente en el ciclo correspondiente
- Vacunación contra brucelosis en hembras de 3 a 8 meses (si aplica a la zona)
- Prueba de tuberculosis negativa en animales mayores de 6 semanas (para algunas zonas)
- El predio de destino debe tener RSPP activo

### Proceso de expedición
1. Ingresar al sistema SINIIGA con usuario y contraseña del predio
2. Seleccionar la opción "Expedir GSMI" e ingresar los datos del transporte
3. Diligenciar: código RSPP de origen y destino, datos del transportador, placa del vehículo, fecha y hora estimada de salida
4. Seleccionar individualmente los animales a movilizar (por código de chapeta)
5. El sistema valida automáticamente los requisitos sanitarios
6. Si todo está en orden, se genera la GSMI electrónica (código único de verificación)
7. Imprimir al menos 3 copias: una para el transportador, otra para el predio de origen y otra para el destino
8. La autoridad de tránsito y policía pueden solicitar la GSMI en cualquier punto del recorrido

### Sanciones por incumplimiento
Movilizar sin GSMI conlleva:
- Decomiso inmediato de los animales transportados
- Multa de hasta 10,000 salarios mínimos legales diarios vigentes (SMLDV)
- Cancelación o suspensión del RSPP del predio de origen
- Investigación penal por contrabando si se trata de movilización hacia zonas de frontera
- Inmovilización del vehículo transportador`,
      objectives: [
        'Definir la GSMI y su función en la movilización legal de animales',
        'Enumerar los requisitos previos para expedir la GSMI',
        'Describir el proceso de expedición y las sanciones por incumplimiento',
      ],
      keyPoints: [
        'Ningún animal puede ser transportado sin GSMI vigente',
        'La GSMI es específica: un viaje requiere una guía diferente',
        'Se requieren mínimo 3 copias impresas de la GSMI por movilización',
        'Movilizar sin GSMI puede resultar en decomiso y multas de hasta 10,000 SMLDV',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r4q1',
            question: '¿Qué significa GSMI?',
            options: ['Guía de Servicios Médicos Internos', 'Guía Sanitaria de Movilización Interna', 'Guía de Sanidad y Manejo Integral', 'Garantía Sanitaria para Movimiento de Insumos'],
            correctAnswer: 1,
            explanation: 'GSMI significa Guía Sanitaria de Movilización Interna, el documento electrónico oficial del ICA para todo traslado de animales vivos en Colombia.',
          },
          {
            id: 'r4q2',
            question: '¿Qué requisito sanitario es indispensable para expedir la GSMI?',
            options: ['Prueba de ADN de cada animal', 'Vacunación contra fiebre aftosa vigente', 'Certificado de peso individual', 'Prueba de fertilidad del lote'],
            correctAnswer: 1,
            explanation: 'La vacunación contra fiebre aftosa vigente en el ciclo correspondiente es indispensable. Sin este certificado, el sistema SINIIGA no permite expedir la GSMI.',
          },
          {
            id: 'r4q3',
            question: '¿Qué sanción aplica por movilizar animales sin GSMI?',
            options: ['Solo una advertencia verbal', 'Multa de máximo 100 SMLDV', 'Decomiso inmediato de los animales y multa de hasta 10,000 SMLDV', 'Prohibición de vacunar en el siguiente ciclo'],
            correctAnswer: 2,
            explanation: 'La movilización sin GSMI conlleva decomiso inmediato de los animales, multa de hasta 10,000 SMLDV, y posible cancelación del RSPP.',
          },
        ],
      },
    },
    {
      id: 'records-5',
      title: 'Libro de Registro de la Finca',
      duration: '20 min',
      content: `## El Libro Físico: Bitácora Oficial del Predio

El libro de registro es un documento físico, foliado y oficial que todo predio pecuario debe mantener actualizado. Es la bitácora donde se registran cronológicamente todas las actividades sanitarias, movimientos de animales y eventos relevantes de la finca. Este libro es revisado por el ICA en cada visita de auditoría.

### Características del libro
- Debe ser un libro físico (no digital), preferiblemente de pasta dura y cosido
- Las hojas deben estar numeradas (foliadas) secuencialmente
- No se pueden arrancar hojas ni usar corrector líquido
- Los errores se corrigen con una línea diagonal y la firma del responsable
- Debe permanecer en el predio, disponible para inspección en cualquier momento
- La tinta debe ser indeleble (esfero de tinta negra o azul, nunca lápiz)

### Las 5 secciones obligatorias del libro
1. **Identificación del predio**: Nombre de la finca, código RSPP, nombre del propietario, ubicación (vereda, municipio, departamento), teléfono de contacto y nombre del administrador o capataz responsable.

2. **Inventario de animales**: Registro de todos los animales presentes en el predio, clasificados por categoría (terneros, novillas, vacas, toros, toretes, bueyes). Debe actualizarse cada vez que haya altas (nacimientos, compras) o bajas (ventas, muertes, sacrificios).

3. **Registro sanitario**: Cada evento sanitario debe registrarse con: fecha, actividad (vacunación, desparasitación, tratamiento), producto utilizado, laboratorio, número de lote, dosis aplicada, vía de administración, tiempo de retiro, animales tratados (identificados por chapeta) y firma del responsable.

4. **Control de movilizaciones**: Entradas y salidas de animales con: fecha, código GSMI, código de chapetas movilizadas, motivo del movimiento, predio de origen/destino, vehículo y transportador.

5. **Visitas y auditorías**: Registro de cada visita técnica o de auditoría del ICA con: fecha, nombre del funcionario, motivo de la visita, hallazgos, recomendaciones y firma del representante del predio.

### Responsabilidades del instructor
Como instructor del predio, debes: designar un responsable del libro, revisar semanalmente que los registros estén actualizados, verificar la legibilidad y congruencia de la información, y reportar a la administración cualquier inconsistencia detectada.`,
      objectives: [
        'Conocer las características del libro de registro oficial del predio',
        'Identificar las 5 secciones obligatorias que debe contener el libro',
        'Asumir las responsabilidades del instructor en el mantenimiento del libro',
      ],
      keyPoints: [
        'El libro debe ser físico, foliado y con tinta indeleble (nunca lápiz)',
        'Los errores se tachan con una línea y se firman; no se usa corrector',
        'Las 5 secciones obligatorias cubren: predio, inventario, sanidad, movimientos y visitas',
        'El ICA revisa este libro en cada visita de auditoría',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r5q1',
            question: '¿Cómo debe corregirse un error en el libro de registro de la finca?',
            options: ['Usando corrector líquido blanco', 'Arrancando la hoja y empezando de nuevo', 'Con una línea diagonal sobre el error y la firma del responsable', 'Escribiendo encima del error con tinta más oscura'],
            correctAnswer: 2,
            explanation: 'Los errores deben corregirse trazando una línea diagonal sobre el texto erróneo y firmando al lado. No se permite corrector líquido ni arrancar hojas, ya que el libro debe mantener su integridad.',
          },
          {
            id: 'r5q2',
            question: '¿Cuántas secciones obligatorias debe tener el libro de registro de la finca?',
            options: ['3', '4', '5', '7'],
            correctAnswer: 2,
            explanation: 'El libro debe contener 5 secciones: identificación del predio, inventario de animales, registro sanitario, control de movilizaciones, y visitas y auditorías.',
          },
          {
            id: 'r5q3',
            question: '¿Cuál es la frecuencia recomendada para que el instructor revise el libro de registro?',
            options: ['Diariamente', 'Semanalmente', 'Mensualmente', 'Solo cuando haya visita del ICA'],
            correctAnswer: 1,
            explanation: 'Como instructor debes revisar el libro semanalmente para verificar que los registros estén actualizados, sean legibles y congruentes. No esperar a la visita del ICA.',
          },
        ],
      },
    },
    {
      id: 'records-6',
      title: 'Uso del Sistema Villa Luz para Registros ICA',
      duration: '20 min',
      content: `## Digitalización de los Registros Oficiales

La plataforma Villa Luz integra módulos específicos para facilitar el cumplimiento de las obligaciones con el ICA. Aunque el libro físico sigue siendo obligatorio, el sistema digital te permite llevar un control paralelo más eficiente, generar reportes automáticos y recibir alertas de vencimientos.

### Módulo de Registro de Predio en Villa Luz
En la sección de configuración de la finca encontrarás los siguientes campos que debes mantener actualizados:
- Código RSPP: El número de registro sanitario asignado por el ICA
- Número de identificación predial SINIIGA
- Fecha de expedición y última actualización del RSPP
- Datos de contacto del funcionario ICA asignado a tu zona
- Ciclo de vacunación aftosa correspondiente a tu región

El sistema te alertará 30 días antes del vencimiento de cualquier certificado o ciclo de vacunación.

### Registro y seguimiento de chapetas
Cada animal en Villa Luz tiene un campo específico para el código SINIIGA:
1. Al registrar un nuevo animal, asigna el código de la chapeta en el campo correspondiente
2. El sistema valida que el código no esté duplicado en el hato
3. Puedes generar un reporte de chapetas faltantes (animales sin identificar)
4. El listado de chapetas por animal está disponible para imprimir y cruzar con el inventario físico
5. Al dar de baja un animal, la chapeta queda marcada como "inactiva" y no puede reutilizarse

### Registro sanitario digital
Cada vez que se aplica una vacuna, desparasitante o tratamiento, el sistema permite:
- Registrar el evento sanitario vinculado a cada animal (por código de chapeta o RFID)
- Almacenar datos del producto: nombre comercial, principio activo, laboratorio, número de lote, fecha de vencimiento
- Calcular automáticamente el tiempo de retiro (días hasta que la leche o carne son aptas para consumo)
- Generar el reporte sanitario mensual que coincide con el formato requerido por el ICA

### Generación de reportes para el ICA
Villa Luz automatiza la generación de:
- Inventario animal actualizado por categorías (requerido anualmente)
- Historial sanitario consolidado por animal y por lote
- Reporte de movilizaciones con códigos GSMI asociados
- Listado de animales por identificar (chapeta faltante)
- Alertas de ciclos de vacunación próximos a vencer

### Cruce con el libro físico
La recomendación es: registra los eventos primero en Villa Luz (digital), y al final del día o semana, transcribe los eventos al libro físico. Esto reduce errores y garantiza que ambos registros estén sincronizados.`,
      objectives: [
        'Navegar los módulos de registro ICA dentro de la plataforma Villa Luz',
        'Registrar correctamente chapetas, eventos sanitarios y movilizaciones en el sistema digital',
        'Generar reportes automatizados en los formatos requeridos por el ICA',
      ],
      keyPoints: [
        'Villa Luz alerta con 30 días de anticipación sobre vencimientos de certificados',
        'El sistema valida que no se dupliquen códigos de chapeta en el mismo hato',
        'Los reportes sanitarios generados coinciden con el formato ICA',
        'Registra primero en digital, luego transcribe al libro físico para sincronizar',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r6q1',
            question: '¿Con cuántos días de anticipación alerta Villa Luz sobre el vencimiento de un certificado?',
            options: ['7 días', '15 días', '30 días', '60 días'],
            correctAnswer: 2,
            explanation: 'El sistema Villa Luz envía alertas 30 días antes del vencimiento de cualquier certificado o ciclo de vacunación, dándote tiempo suficiente para gestionar la renovación.',
          },
          {
            id: 'r6q2',
            question: '¿Qué validación realiza Villa Luz al registrar el código de una chapeta?',
            options: ['Que tenga exactamente 16 dígitos', 'Que no esté duplicada en el hato', 'Que coincida con el color del animal', 'Que esté aprobada por Fedegán'],
            correctAnswer: 1,
            explanation: 'El sistema valida que el código de chapeta no esté duplicado dentro del mismo hato, evitando que dos animales tengan el mismo identificador.',
          },
          {
            id: 'r6q3',
            question: '¿Cuál es la práctica recomendada para mantener sincronizados el sistema digital y el libro físico?',
            options: ['Usar solo el sistema digital y abandonar el libro físico', 'Registrar solo en el libro físico', 'Registrar primero en Villa Luz y luego transcribir al libro', 'Usar cada sistema para eventos diferentes'],
            correctAnswer: 2,
            explanation: 'Se recomienda registrar los eventos primero en Villa Luz (digital) y al final del día o semana transcribir al libro físico, garantizando sincronización y reduciendo errores.',
          },
        ],
      },
    },
    {
      id: 'records-7',
      title: 'Auditorías y Visitas del ICA',
      duration: '20 min',
      content: `## Cómo Prepararte y qué Esperar de una Visita del ICA

Las visitas de inspección y auditoría del ICA son parte del sistema de control sanitario. Pueden ser programadas (auditoría de rutina) o inopinadas (sin aviso previo, ante sospecha de irregularidad). Estar siempre preparado es la mejor estrategia.

### Tipos de visitas del ICA
1. **Visita de registro inicial**: Ocurre cuando solicitas el RSPP por primera vez. El funcionario verifica las condiciones del predio antes de otorgar el registro.
2. **Auditoría de rutina**: Periódica (generalmente anual), revisa el cumplimiento integral de las obligaciones sanitarias.
3. **Visita de verificación**: Puede ocurrir en cualquier momento si el sistema SINIIGA detecta inconsistencias en tus reportes (animales no identificados, GSMI no coherentes con inventario).
4. **Visita por contingencia sanitaria**: En caso de brote de enfermedad en la zona, el ICA visita todos los predios del área para verificar estado y aplicar medidas de control.
5. **Auditoría para certificación especial**: Requerida para predios que buscan certificación de exportación o Buenas Prácticas Ganaderas (BPG).

### ¿Qué revisa el funcionario del ICA?
El inspector del ICA tiene una lista de verificación estándar que incluye:
- Vigencia del RSPP y coincidencia de la información registrada con la realidad del predio
- Inventario físico de animales vs. inventario reportado en SINIIGA (conteo por categorías)
- Estado de identificación: porcentaje de animales con chapeta SINIIGA colocada y legible
- Libro de registro de la finca: actualizado, foliado, con las 5 secciones completas
- Certificados de vacunación: aftosa vigente, brucelosis en hembras, tuberculosis donde aplique
- Condiciones de bioseguridad: pediluvio, cerco perimetral, manejo de residuos, cuarentena
- Instalaciones: estado de corrales, báscula, áreas de manejo, condiciones de bienestar animal
- Botiquín veterinario: medicamentos dentro de la fecha de vencimiento, nevera para biológicos
- Registro de visitantes y protocolo de ingreso al predio

### Cómo prepararte para una visita
1. Mantén TODA la documentación en una carpeta física organizada por secciones
2. Designa a una persona responsable de atender al funcionario (preferiblemente el instructor o el administrador)
3. Ten a mano: RSPP, libro de registro, certificados de vacunación, inventario impreso, GSMI recientes
4. Acompaña al funcionario en todo el recorrido, toma nota de cada observación
5. No discutas ni confrontes; si hay hallazgos, pregunta cómo subsanarlos
6. Al finalizar, solicita copia del acta de visita firmada por el funcionario

### Posibles sanciones
Dependiendo de la gravedad de los hallazgos, el ICA puede: emitir recomendaciones con plazo de cumplimiento, imponer multas, suspender temporalmente el RSPP, decomisar animales, o cancelar definitivamente el registro del predio.`,
      objectives: [
        'Diferenciar los tipos de visitas que realiza el ICA al predio',
        'Conocer la lista de verificación estándar del inspector del ICA',
        'Preparar un protocolo de atención para visitas de auditoría',
      ],
      keyPoints: [
        'El ICA puede llegar sin aviso previo; mantén la finca lista siempre',
        'La documentación debe estar organizada en carpeta física, no dispersa',
        'Nunca confrontes al funcionario: toma nota y pregunta cómo subsanar',
        'Solicita siempre copia firmada del acta de visita',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r7q1',
            question: '¿Cómo se llama la visita que el ICA realiza sin aviso previo?',
            options: ['Visita programada', 'Visita inopinada', 'Visita de cortesía', 'Visita de seguimiento rutinario'],
            correctAnswer: 1,
            explanation: 'La visita inopinada es aquella que el ICA realiza sin aviso previo, generalmente cuando hay sospecha de irregularidades o inconsistencias en los reportes.',
          },
          {
            id: 'r7q2',
            question: '¿Cuál de los siguientes NO es un aspecto que revisa el ICA durante la auditoría?',
            options: ['Inventario físico de animales', 'Libro de registro de la finca', 'Rentabilidad económica de la producción', 'Certificados de vacunación vigentes'],
            correctAnswer: 2,
            explanation: 'El ICA no audita la rentabilidad económica del predio. Su función es exclusivamente sanitaria: verifica inventario, documentación, vacunación, bioseguridad y bienestar animal.',
          },
          {
            id: 'r7q3',
            question: '¿Qué debes hacer si el funcionario del ICA encuentra hallazgos negativos durante la visita?',
            options: ['Discutir para defender el predio', 'Ignorar los hallazgos', 'Tomar nota de cada observación y preguntar cómo subsanarlos', 'Pedir que regrese otro día'],
            correctAnswer: 2,
            explanation: 'Lo correcto es tomar nota de cada observación, preguntar los plazos y procedimientos para subsanar los hallazgos, y solicitar copia del acta firmada. Nunca confrontar al funcionario.',
          },
        ],
      },
    },
    {
      id: 'records-8',
      title: 'Certificación de Predios',
      duration: '20 min',
      content: `## Certificaciones que Agregan Valor a tu Producción

Más allá del RSPP básico, existen certificaciones voluntarias que abren puertas a mercados especializados, exportación y mejores precios. Estas certificaciones elevan el estándar sanitario y de gestión del predio a niveles superiores.

### Certificación de Predio para Exportación
Para que tu finca pueda proveer animales o productos cárnicos a mercados internacionales, el ICA debe certificarla como "Predio de Exportación". Los requisitos adicionales al RSPP incluyen:
- Trazabilidad individual completa de todos los animales desde su nacimiento
- Programa sanitario reforzado con pruebas diagnósticas periódicas (tuberculosis, brucelosis, EEB)
- Ausencia comprobada de enfermedades de declaración obligatoria en los últimos 24 meses
- Registro detallado de todos los insumos veterinarios utilizados (incluyendo tiempos de retiro)
- Infraestructura de bioseguridad con doble barrera sanitaria
- Programa documentado de control de plagas y roedores
- Capacitación certificada del personal en Buenas Prácticas Ganaderas
- El ICA realiza auditorías más frecuentes (semestrales) a los predios de exportación

### Certificación en Buenas Prácticas Ganaderas (BPG)
La certificación BPG es un sello de calidad otorgado por el ICA que avala que el predio cumple con estándares superiores en:
- **Sanidad animal y bioseguridad**: Plan sanitario preventivo documentado, protocolos de manejo de medicamentos, registro de todos los eventos sanitarios.
- **Buenas prácticas en alimentación**: Agua de calidad certificada, control de proveedores de alimentos, almacenamiento adecuado de concentrados y suplementos, prohibición de subproductos de rumiantes.
- **Bienestar animal**: Cumplimiento comprobado de las 5 libertades, instalaciones adecuadas, personal capacitado, programa de manejo del dolor en procedimientos.
- **Manejo de registros y trazabilidad**: Sistema de registro completo y verificable que permite rastrear cada animal y producto.
- **Sostenibilidad ambiental**: Manejo de residuos sólidos y líquidos, protección de fuentes de agua, plan de reforestación.

### Proceso de certificación BPG
1. Solicitar la visita de certificación ante la oficina ICA de la jurisdicción
2. El ICA asigna un médico veterinario oficial para realizar la auditoría en campo
3. La auditoría evalúa 5 componentes con una lista de verificación de aproximadamente 120 criteríos
4. Se requiere un cumplimiento mínimo del 80% en cada componente para obtener la certificación
5. La certificación tiene vigencia de 3 años, con auditorías de seguimiento anuales
6. El predio certificado aparece en el registro público de predios BPG del ICA

### Beneficios de las certificaciones
- Acceso a mercados internacionales con mejores precios (exportación)
- Reconocimiento como proveedor de calidad ante compradores nacionales
- Prioridad en programas de apoyo y subsidios gubernamentales
- Reducción de primas de seguros agropecuarios
- Mejor posicionamiento comercial y valor agregado del predio`,
      objectives: [
        'Conocer los requisitos para la certificación de predio de exportación',
        'Identificar los 5 componentes de la certificación en Buenas Prácticas Ganaderas (BPG)',
        'Valorar los beneficios comerciales y sanitarios de las certificaciones',
      ],
      keyPoints: [
        'La certificación de exportación requiere trazabilidad completa y auditorías semestrales',
        'La certificación BPG evalúa 5 componentes con aproximadamente 120 criterios',
        'Se requiere mínimo 80% de cumplimiento en cada componente BPG',
        'Las certificaciones abren mercados internacionales y mejoran el precio del producto',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r8q1',
            question: '¿Cada cuánto audita el ICA los predios certificados para exportación?',
            options: ['Cada mes', 'Semestralmente', 'Anualmente', 'Cada 2 años'],
            correctAnswer: 1,
            explanation: 'Los predios de exportación son auditados semestralmente por el ICA, el doble de frecuencia que un predio con RSPP convencional.',
          },
          {
            id: 'r8q2',
            question: '¿Cuál es el porcentaje mínimo de cumplimiento requerido en cada componente para obtener la certificación BPG?',
            options: ['60%', '70%', '80%', '95%'],
            correctAnswer: 2,
            explanation: 'Se requiere un cumplimiento mínimo del 80% en cada uno de los 5 componentes evaluados para obtener la certificación BPG.',
          },
          {
            id: 'r8q3',
            question: '¿Cuál NO es un componente evaluado en la certificación BPG?',
            options: ['Sanidad animal y bioseguridad', 'Bienestar animal', 'Mercadeo y publicidad de productos', 'Sostenibilidad ambiental'],
            correctAnswer: 2,
            explanation: 'El mercadeo y la publicidad no son componentes de la certificación BPG. Los 5 componentes son: sanidad, alimentación, bienestar animal, registros y trazabilidad, y sostenibilidad ambiental.',
          },
        ],
      },
    },
    {
      id: 'records-9',
      title: 'Reportes y Estadísticas para el ICA',
      duration: '20 min',
      content: `## Reportes Obligatorios: Información que Debes Enviar

El ICA requiere que cada predio reporte información periódicamente para mantener actualizado el sistema SINIIGA y las estadísticas pecuarias nacionales. La oportunidad y veracidad de estos reportes es responsabilidad directa del productor.

### Ciclo de reportes obligatorios
El calendario de reportes al ICA está estructurado en ciclos que todo instructor debe conocer:

**Reporte anual de inventario**: Entre el 1 de enero y el 31 de marzo de cada año debes reportar el inventario completo de animales por categoría. Este reporte se cruza con el ciclo de vacunación aftosa en la mayoría de las regiones, lo que facilita el cumplimiento simultáneo de ambas obligaciones.

**Reporte de nacimientos**: Los nacimientos deben reportarse dentro de los 30 días siguientes al evento. Incluye: fecha de nacimiento, código de chapeta asignado, sexo, raza, peso al nacimiento y código de la madre.

**Reporte de muertes y sacrificios**: Debe reportarse dentro de los 15 días siguientes, indicando: fecha, código de chapeta, causa probable de la muerte (diagnóstico presuntivo), y destino del cadáver (enterratorio, compostaje, incineración autorizada).

**Reporte de movilizaciones**: Aunque la GSMI queda registrada en el sistema, debes verificar que todas las movilizaciones del periodo estén correctamente cerradas en SINIIGA (sin GSMI pendientes por confirmar recepción en destino).

**Reportes sanitarios extraordinarios**: Cualquier sospecha o confirmación de enfermedad de declaración obligatoria (fiebre aftosa, brucelosis, tuberculosis, rabia bovina, estomatitis vesicular, encefalopatía espongiforme bovina) debe reportarse de INMEDIATO, en menos de 24 horas.

### Consecuencias de reportes tardíos o inexactos
- Reportes fuera de plazo generan bloqueo temporal del código RSPP
- Inconsistencias entre lo reportado y la realidad pueden desencadenar auditorías
- La omisión repetida de reportes es causal de sanción y posible cancelación del RSPP
- Información falsa constituye delito sancionable por la ley colombiana

### Cómo generar reportes desde Villa Luz
La plataforma Villa Luz te permite:
1. Generar el inventario consolidado automáticamente (basado en los datos de tus animales activos)
2. Obtener el listado de animales por identificar o con chapetas pendientes de reporte
3. Revisar las GSMI pendientes de cierre en el sistema
4. Exportar reportes en formato PDF o Excel listos para presentar al ICA
5. Programar recordatorios automáticos para las fechas límite de cada reporte

### Estadísticas útiles que puedes extraer
Más allá del cumplimiento, los datos que reportas te permiten analizar: tasa de natalidad y mortalidad anual, eficiencia reproductiva del hato, días promedio de permanencia de animales, y trazabilidad completa de cada animal para mercados premium.`,
      objectives: [
        'Conocer el calendario de reportes obligatorios al ICA durante el año',
        'Identificar los plazos para reportar nacimientos, muertes y movilizaciones',
        'Utilizar Villa Luz para generar y exportar los reportes en formatos oficiales',
      ],
      keyPoints: [
        'El inventario anual debe reportarse entre 1 de enero y 31 de marzo',
        'Los nacimientos se reportan dentro de 30 días; muertes dentro de 15 días',
        'Enfermedades de declaración obligatoria deben notificarse en menos de 24 horas',
        'Villa Luz genera automáticamente los reportes en formatos PDF y Excel',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r9q1',
            question: '¿Cuál es el plazo para reportar un nacimiento al ICA?',
            options: ['7 días', '15 días', '30 días', '60 días'],
            correctAnswer: 2,
            explanation: 'Los nacimientos deben reportarse dentro de los 30 días siguientes al evento, incluyendo fecha, código de chapeta, sexo, raza, peso y madre.',
          },
          {
            id: 'r9q2',
            question: '¿En qué plazo debe notificarse una sospecha de enfermedad de declaración obligatoria?',
            options: ['24 horas', '7 días', '15 días', '30 días'],
            correctAnswer: 0,
            explanation: 'Cualquier sospecha o confirmación de enfermedad de declaración obligatoria (fiebre aftosa, brucelosis, rabia, etc.) debe reportarse de INMEDIATO, en menos de 24 horas.',
          },
          {
            id: 'r9q3',
            question: '¿Qué puede suceder si un predio omite reportes de manera repetida?',
            options: ['Nada, no hay consecuencias', 'Recibe un aviso amistoso', 'Puede ser sancionado con cancelación del RSPP', 'Solo paga una multa simbólica'],
            correctAnswer: 2,
            explanation: 'La omisión repetida de reportes es causal de sanción administrativa y posible cancelación del Registro Sanitario de Predio Pecuario.',
          },
        ],
      },
    },
    {
      id: 'records-10',
      title: 'Plan de Mejora Continua en Registros',
      duration: '20 min',
      content: `## Construyendo una Cultura de Cumplimiento en la Finca

El cumplimiento de las obligaciones ICA no es un evento puntual sino un proceso continuo que requiere disciplina, organización y mejora constante. Como instructor, tu rol es liderar la cultura de cumplimiento y asegurar que todos los operarios entiendan la importancia de los registros.

### Revisión periódica del cumplimiento
Establece una rutina mensual de revisión que incluya los siguientes pasos:
1. Verificar que el RSPP esté vigente y sin observaciones pendientes
2. Cotejar el inventario físico contra el inventario en el sistema (Villa Luz y SINIIGA)
3. Revisar que no haya animales sin chapeta o con chapeta ilegible
4. Verificar que NO existan GSMI pendientes de cierre en el sistema
5. Confirmar que todos los certificados de vacunación estén al día y archivados
6. Revisar la vigencia de medicamentos en el botiquín veterinario
7. Inspeccionar el libro de registro físico y cruzar con los registros digitales
8. Documentar los hallazgos y asignar responsables para correcciones

### Actualización de procedimientos
La normativa ICA se actualiza periódicamente. Debes:
- Consultar al menos cada 6 meses la página web del ICA para verificar nuevas resoluciones
- Mantener contacto con la oficina ICA de tu jurisdicción
- Participar en las jornadas de actualización que convoca ICA y Fedegán
- Incorporar los nuevos requisitos en los protocolos de trabajo de la finca
- Comunicar los cambios al equipo de operarios mediante capacitaciones cortas

### Capacitación continua del personal
El eslabón más débil del sistema de registros es el factor humano. Implementa un programa de capacitación sencillo:
- **Inducción**: Todo operario nuevo recibe entrenamiento sobre la importancia del RSPP, identificación animal y libro de registro
- **Refuerzo trimestral**: Sesiones de 30 minutos repasando un tema específico (ej. cómo llenar correctamente el registro de un tratamiento)
- **Simulacro de auditoría**: Una vez al año, simula una visita del ICA con tu equipo para identificar debilidades
- **Reconocimiento**: Identifica y destaca a los operarios que mantienen registros impecables

### Indicadores de cumplimiento que debes monitorear
- Porcentaje de animales correctamente identificados (meta: 100%)
- Días promedio de retraso en registro de nacimientos (meta: <7 días)
- GSMI cerradas oportunamente (meta: 100% cerradas en el mes)
- Hallazgos en simulacros de auditoría (meta: 0 hallazgos críticos)
- Tiempo promedio para subsanar observaciones del ICA (meta: <72 horas)

### La mejora continua como ventaja competitiva
Una finca con registros impecables no solo evita sanciones: accede a mejores precios de compradores, califica más rápido para certificaciones, reduce pérdidas por errores de manejo, y construye una reputación de seriedad que atrae oportunidades de negocio.`,
      objectives: [
        'Diseñar una rutina mensual de revisión y verificación del cumplimiento ICA',
        'Establecer un programa de capacitación continua del personal en registros',
        'Definir indicadores de cumplimiento y metas de mejora para el predio',
      ],
      keyPoints: [
        'Realiza una revisión mensual de 8 puntos para verificar el cumplimiento ICA',
        'Capacita al personal con inducción al ingreso, refuerzo trimestral y simulacro anual',
        'Mantén contacto con la oficina ICA local y revisa resoluciones nuevas cada 6 meses',
        'La finca con registros impecables accede a mejores precios y certificaciones',
      ],
      quiz: {
        passingScore: 70,
        questions: [
          {
            id: 'r10q1',
            question: '¿Con qué frecuencia se recomienda realizar la revisión integral del cumplimiento ICA?',
            options: ['Semanalmente', 'Mensualmente', 'Trimestralmente', 'Solo cuando hay visita del ICA'],
            correctAnswer: 1,
            explanation: 'Se recomienda una revisión mensual integral que cubra los 8 puntos de verificación, desde el RSPP hasta el libro de registro y botiquín veterinario.',
          },
          {
            id: 'r10q2',
            question: '¿Cada cuánto se debe consultar la página web del ICA para verificar nuevas resoluciones?',
            options: ['Cada mes', 'Cada 6 meses', 'Cada año', 'Nunca, el ICA envía notificaciones'],
            correctAnswer: 1,
            explanation: 'Se recomienda consultar al menos cada 6 meses la página web del ICA para verificar si hay nuevas resoluciones que afecten las obligaciones del predio.',
          },
          {
            id: 'r10q3',
            question: '¿Cuál es la meta recomendada de animales correctamente identificados con chapeta?',
            options: ['80%', '90%', '100%', 'No hay meta definida'],
            correctAnswer: 2,
            explanation: 'La meta debe ser 100% de animales correctamente identificados. Cualquier animal sin chapeta es un incumplimiento que puede generar sanciones.',
          },
        ],
      },
    },
  ],
};
