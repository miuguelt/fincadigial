# Módulo campesino: decisión Mobile First

## Diagnóstico

El módulo ya cubría registro diario, ganadería, cultivos, agua, clima, mercado y
asistencia técnica. El problema principal era de jerarquía: el inicio repetía el
estado de conexión y el clima, mostraba analítica antes de las tareas urgentes y
presentaba todas las herramientas como tarjetas grandes. En un teléfono de 320 px
eso alargaba la jornada y escondía la acción que debía hacer el usuario.

## Decisión

La pantalla `Mi panel` se organiza en este orden:

1. Finca, fecha, clima y estado de sincronización.
2. Alertas y acciones de la jornada.
3. Registros frecuentes: trabajo, ordeño, novedad y ayuda.
4. Termómetro productivo de lectura rápida.
5. Búsqueda y herramientas agrupadas en secciones plegables.
6. Consejo breve para trabajo rural.

La navegación lateral de `Mi espacio` conserva el panel como entrada y separa
registro diario, cultivos y agua, clima, mercado, asistencia y aprendizaje sin
conexión. `activePaths` se considera parte del contrato de navegación para que
una ruta hija mantenga resaltada la sección correcta.

## Criterios verificables

- Los controles principales miden al menos 42 px de alto.
- La primera vista útil en móvil no obliga a recorrer la lista completa de
  herramientas.
- Registrar trabajo, ordeño y novedades continúa disponible sin conexión.
- Mercado y asistencia indican explícitamente que requieren señal.
- La biblioteca rural queda enlazada en `/campesino/aprender` y puede guardar
  materiales para usarlos después sin internet.
- Asistencia técnica permite adjuntar una foto tomada con la cámara o un audio
  grabado desde el celular; el servidor valida el tipo, tamaño, finca y hash.
- Las tarjetas de indicadores se pueden operar con teclado y lector de pantalla.

## Alcance y siguiente etapa

Este cambio reorganiza la experiencia usando servicios y rutas existentes y
agrega la columna persistente de adjuntos para asistencia. Como siguiente
incremento de producto conviene agregar a la jornada un plan de labores
asignadas, precios locales por municipio y, si se necesita, múltiples adjuntos
por caso. Esas capacidades requieren contratos persistentes propios y no se
deben resolver con estado local de la pantalla.
