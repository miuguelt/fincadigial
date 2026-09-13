# Explorador de esquema y relaciones en la interfaz

## Contexto

La vista `data-overview` mantenía una lista manual de 19 indicadores y afirmaba que la base estaba “100% poblada y sincronizada”. Esa afirmación no era comprobable: la auditoría estática documentaba 44 tablas, mientras que el contrato vivo de `/api/v1/docs/schema` entrega actualmente 83 modelos, 112 relaciones ORM distribuidas en 54 modelos y sus metadatos de consulta.

## Decisión

La vista general consulta el esquema vivo y lo presenta como un explorador de tablas y relaciones:

- normaliza la respuesta `{ data: { models } }` del servidor;
- muestra campos, llaves de finca, relaciones ORM, búsqueda, filtros, ordenamiento, campos obligatorios y únicos;
- agrupa por dominio funcional y permite buscar por tabla, campo o relación;
- enlaza a las rutas administrativas que existen y marca como “Sin vista CRUD” las tablas sin pantalla conocida;
- muestra conteos solo cuando provienen de un indicador real del tablero. Si no existe un indicador para una tabla, muestra “Conteo no medido”.
- el modal CRUD genérico consume `config.detailTabs`, conserva “Resumen” como entrada y permite que cada vista pinte relaciones o acciones contextuales sin duplicar el modal.

## Escenarios de aceptación

- **Dado** un esquema válido del servidor, **cuando** se abre la vista de datos, **entonces** el resumen debe calcular tablas, campos, relaciones y tablas aisladas por finca desde los metadatos recibidos.
- **Dado** un nombre de tabla o campo, **cuando** se escribe en la búsqueda, **entonces** solo se muestran los modelos coincidentes.
- **Dado** un modelo con relaciones, **cuando** se expande, **entonces** se muestran los nombres de relación, sus campos y enlaces a la entidad relacionada cuando existe una ruta.
- **Dado** un modelo sin conteo publicado por el tablero, **cuando** se presenta, **entonces** no se debe interpretar el metadato del esquema como cantidad de registros.
- **Dado** un error de consulta, **cuando** falla la carga, **entonces** debe aparecer una alerta descriptiva con acción de reintento.
- **Dado** un CRUD con pestañas de detalle configuradas, **cuando** se abre otro registro, **entonces** el modal debe volver a “Resumen” y conservar navegación y cierre.

## Límites actuales

El endpoint de documentación expone metadatos del modelo, pero no conteos por tabla ni una autorización de escritura genérica. Por eso esta entrega mejora descubrimiento y navegación, pero no inventa operaciones CRUD para tablas como `infrastructure`, `animal_groups` o `pasture_aforos`. Para habilitarlas se requiere primero un contrato API estable, migración de base y permisos por finca.
