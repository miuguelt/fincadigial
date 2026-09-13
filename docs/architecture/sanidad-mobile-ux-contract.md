# Contrato UX: Sanidad en celular

## Usuario y tarea principal

El usuario es un campesino que registra una atención desde el teléfono, con
poca tolerancia a tablas anchas o términos ambiguos. Debe poder responder
rápidamente: qué res necesita atención, qué se le aplicó, si sigue en retiro y
a qué caso clínico pertenece.

## Jerarquía de las vistas

- Casos clínicos: res, enfermedad, fecha de detección, estado, gravedad y
  responsable.
- Tratamientos: diagnóstico o motivo, res, fecha, caso clínico, dosis, retiro,
  costo y responsable.
- Las acciones secundarias quedan al final de cada tarjeta; el vínculo al caso
  abre el seguimiento correspondiente.

## Reglas de relación

- Un tratamiento puede existir sin caso clínico cuando fue una atención
  independiente.
- Si se vincula un caso, el selector solo muestra casos de la res elegida.
- Una coincidencia por animal con un caso activo se presenta como sugerencia
  para revisar, nunca como vínculo guardado.
- Las actualizaciones parciales del tratamiento conservan y validan la pareja
  res–caso para evitar relaciones cruzadas.

## Responsive y estados

- En menos de 768 px se usan tarjetas con campos esenciales, sin desplazamiento
  horizontal.
- Los filtros se mantienen táctiles y muestran conteos cuando son confiables.
- La carga inicial usa skeleton; los errores de datos principales conservan el
  estado de reintento del CRUD.
