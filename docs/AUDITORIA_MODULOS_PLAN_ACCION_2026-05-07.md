# Auditoria de Modulos y Plan de Accion - VillaLuz

Fecha: 2026-05-07
Proyecto auditado: `C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz`

## Resumen ejecutivo

VillaLuz esta en un estado tecnico saludable: el backend compila, la suite de pruebas backend pasa y el frontend compila para produccion. El problema principal no es que el sistema este roto, sino que varios modulos estan en un punto intermedio entre "infraestructura lista" y "producto completamente usable".

Validaciones ejecutadas:

- Backend: `python -m compileall app -q` OK.
- Backend: `python -m pytest -q` OK.
- Frontend: `npm run type-check` OK.
- Frontend: `npm run build` OK, con advertencias de ciclos/chunks.

Hallazgos de alto nivel:

- Backend robusto por namespaces y modelos.
- Frontend amplio, pero con deuda de consolidacion.
- Modulo rural/campesino iniciado, pero aun en version minima.
- Offline/PWA existe, pero falta protocolo completo de sincronizacion confiable.
- Hay 108 archivos duplicados tipo `(1)`, `(2)`, etc. dentro de `frontend/src`.
- Existen carpetas paralelas `src1`, `src3` y `frontend_VALIDATED_TMP` que deben archivarse o eliminarse tras validar que no contienen codigo vigente.
- `routeConfig.ts` esta vacio y las rutas reales viven hardcodeadas en `AppRoutes.tsx`.
- El build advierte ciclos en `dependencyCheck.service.ts` y modulos de diagnostico.

## Estado por modulo

| Modulo | Estado actual | Falta complementar | Prioridad |
|---|---|---|---|
| Autenticacion y usuarios | Funcional, con pruebas backend y rutas frontend | Flujo UX completo de recuperacion, auditoria de sesiones, endurecer permisos por rol en UI | Alta |
| Multi-finca y membresias | Backend y frontend presentes | Invitaciones, aprobacion, estados, trazabilidad de solicitudes y pruebas E2E | Alta |
| Ganaderia base | CRUD principal activo: animales, especies, razas, potreros | Experiencia completa de arbol genealogico, imagenes, dependencias, acciones masivas y validaciones moviles | Alta |
| Salud animal | Vacunas, vacunaciones, tratamientos, enfermedades y medicamentos presentes | Calendario sanitario, alertas preventivas, historia clinica unificada y reportes ICA completos | Alta |
| Produccion | Leche y algunos indicadores activos | Registro diario optimizado, graficas historicas, alertas por caida productiva y exportacion | Media |
| Reproduccion | Modelo y vistas existentes | Flujo completo de celo, servicio, gestacion, parto, descendencia, alertas y metricas por reproductor | Media-Alta |
| Crecimiento | Servicio y vista presentes | Captura de peso/talla, curva esperada, anomalias y recomendaciones accionables | Media |
| Inventario | CRUD y acciones rapidas presentes | Movimientos, lotes, vencimientos, stock minimo, costos y consumo automatico por tratamientos | Alta |
| Finanzas | Backend y dashboard financiero presentes | Flujo completo de ingresos/gastos, presupuestos, cartera, reportes y relacion con mercado/inventario | Media-Alta |
| Analytics | Amplio backend y varias vistas | Cerrar endpoints no consumidos, unificar metricas reales, estados vacios, cache y filtros por finca/periodo | Alta |
| Reportes regulatorios | Backend, widget y pagina presentes | Plantillas finales, exportacion validada, auditoria de cumplimiento, evidencia adjunta | Media-Alta |
| Actividad/auditoria | Backend y pagina presentes | Trazabilidad visible por entidad, filtros, exportacion y alertas de actividad sensible | Media |
| Preferencias/favoritos/historial | Backend detectado | Integracion real en UI, favoritos, recientes, preferencias por rol y persistencia offline | Media |
| Notificaciones push | Backend y servicio presentes | Flujo de permisos, configuracion por evento, fallback offline y pruebas de dispositivo | Media |
| Chat y mensajes de nodo | Chat y widgets presentes | Persistencia completa de mensajeria mesh, estados de entrega, adjuntos, cifrado y bus local | Alta |
| Offline/PWA | Service worker, cola local y UI de sincronizacion presentes | Oplog versionado, conflictos, recibos, paquetes exportables, adjuntos por chunks, pruebas multi-dispositivo | Critica |
| Mesh/nodo rural | Prototipo de monitor y comunicacion | Transporte real LAN/QR/archivo/nativo, seguridad de paquetes, nodo comunitario | Critica |
| Campesino territorial | Modelos y endpoints v1: cultivos, agua, riesgos, mercado, asistencia, aprendizaje | Vistas CRUD completas, mapas, fotos/audio, filtros, flujos de asistencia y aprendizaje offline | Critica |
| Navegacion y permisos | Rutas funcionales en `AppRoutes.tsx` | Centralizar rutas, menus, breadcrumbs, permisos y cobertura por rol | Alta |
| Diagnostico de dependencias | Herramientas presentes | Resolver ciclos de build, consolidar imports y evitar chunks con orden roto | Alta |
| Limpieza de repositorio | Proyecto funcional pero con duplicados | Archivar backups, eliminar copias `(1)`, documentar estructura canonica | Alta |

## Modulos que faltan por complementar con mas urgencia

### 1. Offline, Sync y Mesh Rural

Ya existen piezas importantes:

- Modelos backend: `devices`, `sync_operations`, `sync_sessions`, `sync_operation_receipts`, `sync_conflicts`, `attachment_blobs`.
- Frontend PWA con cola offline.
- `MeshMonitor` y `NodeCommunicationWidget`.

Falta para considerarlo completo:

- Unificar `offlineQueue` con `sync_operations`.
- Guardar cada mutacion como operacion versionada con `operation_id`, `device_id`, `finca_id`, firma y prioridad.
- Crear UI de conflictos con resolucion humana.
- Implementar recibos de entrega por dispositivo.
- Agregar export/import `.villaluzpack`.
- Separar adjuntos grandes y enviarlos por chunks con hash.
- Probar dos dispositivos simulados, perdida de red, reintento, duplicados y conflictos.

Criterio de aceptacion:

- Un usuario puede crear/editar/borrar registros sin internet.
- Al reconectar, las operaciones se aplican una sola vez.
- Si hay conflicto, se muestra en UI y se resuelve sin perder datos.
- El sistema indica que dispositivo envio, cuando, que finca afecta y si fue aplicado.

### 2. Campesino Territorial

Ya existe version v1:

- Cultivos.
- Actividades de cultivo.
- Fuentes de agua.
- Mediciones de agua.
- Riesgos climaticos.
- Mercado campesino.
- Asistencia tecnica.
- Aprendizaje offline.

Falta:

- Paginas CRUD completas por submodulo.
- Captura rapida con foto/audio real.
- Mapas y ubicacion para agua, riesgos y mercado.
- Estados de asistencia tecnica con evidencia.
- Materiales descargables para aprendizaje offline.
- Filtros por territorio, vereda, finca, estado, fecha y prioridad.

Criterio de aceptacion:

- Un campesino puede registrar cultivo, agua, riesgo, oferta y solicitud tecnica desde movil.
- Todo funciona sin internet y se sincroniza luego.
- Un tecnico puede responder y cerrar una asistencia con evidencia.

### 3. Navegacion, permisos y rutas

Problema:

- `routeConfig.ts` esta vacio.
- `AppRoutes.tsx` concentra rutas y permisos.
- Menus, breadcrumbs y permisos pueden desalinearse.

Falta:

- Crear una fuente unica de rutas con: path, componente, roles, icono, menu, breadcrumb, modulo.
- Generar rutas protegidas desde esa configuracion.
- Usar esa misma configuracion para sidebar, quick access y diagnostico de cobertura.

Criterio de aceptacion:

- Agregar una ruta nueva no requiere editar tres lugares distintos.
- Cada rol ve solo modulos permitidos.
- Existe reporte automatico de rutas sin menu, menu sin ruta y pagina sin permiso.

### 4. Limpieza y consolidacion frontend

Problema:

- 108 archivos duplicados tipo `(1)`, `(2)`, etc.
- Carpetas `src1`, `src3`, `frontend_VALIDATED_TMP`.
- Riesgo de editar archivos muertos o duplicados.

Falta:

- Comparar hashes/contenido de duplicados.
- Conservar solo version importada por el build.
- Mover descartes a `_archive` o eliminarlos tras validacion.
- Documentar estructura canonica.

Criterio de aceptacion:

- Cero archivos `(1)` dentro de `frontend/src`.
- Cero carpetas fuente paralelas no documentadas.
- `type-check`, `build` y pruebas siguen pasando despues de limpiar.

### 5. Diagnostico de dependencias y build

Problema:

- `npm run build` pasa, pero advierte ciclos entre `dependencyCheck.service.ts` y modulos especificos.

Falta:

- Cambiar imports en paginas de especies, razas y animales para apuntar directo al modulo exportador.
- Evitar reexports circulares.
- Revisar `manualChunks` solo si sigue siendo necesario.

Criterio de aceptacion:

- `npm run build` sin advertencias de ciclos circulares.
- Diagnosticos siguen funcionando en especies, razas y animales.

## Roadmap propuesto

### Fase 0 - Congelar base confiable

Duracion sugerida: 1 dia.

Tareas:

- Crear tag/checkpoint del estado actual.
- Guardar resultados de `pytest`, `type-check` y `build`.
- Definir `frontend/src` y `backend/app` como fuentes canonicas.
- Marcar backups y carpetas temporales como no editables.

Salida:

- Base estable conocida.
- Documento de estructura canonica.

### Fase 1 - Limpieza y navegacion

Duracion sugerida: 3 a 5 dias.

Tareas:

- Limpiar duplicados `(1)`.
- Archivar `src1`, `src3`, `frontend_VALIDATED_TMP` si no son fuente activa.
- Resolver ciclos de diagnostics.
- Rehacer `routeConfig.ts` como fuente unica.
- Conectar sidebar/breadcrumbs/permisos a esa fuente.

Salida:

- Frontend mas mantenible.
- Build sin advertencias criticas.
- Menor riesgo de regresiones.

### Fase 2 - Offline real

Duracion sugerida: 1 a 2 semanas.

Tareas:

- Convertir cola offline en oplog sincronizable.
- Implementar recibos, estados y conflictos.
- Agregar panel de sincronizacion por dispositivo.
- Crear pruebas E2E offline.
- Agregar export/import inicial `.villaluzpack`.

Salida:

- PWA offline-first confiable.
- Base lista para nodo local.

### Fase 3 - Campesino v1 completo

Duracion sugerida: 1 a 2 semanas.

Tareas:

- Crear CRUD completo para los 8 submodulos campesinos.
- Integrar foto/audio/adjuntos.
- Agregar filtros y estados.
- Crear dashboard tecnico para asistencia.
- Agregar aprendizaje offline descargable.

Salida:

- Producto rural usable, no solo modelo/API.

### Fase 4 - Integraciones de campo

Duracion sugerida: 2 semanas.

Tareas:

- Nodo local LAN.
- Paquetes `.villaluzpack`.
- Seguridad de paquetes.
- Mensajeria persistente entre nodos.
- Adjuntos por chunks.

Salida:

- Sincronizacion rural pragmatica para baja conectividad.

### Fase 5 - Cierre de modulos ganaderos y administrativos

Duracion sugerida: 2 a 3 semanas.

Tareas:

- Historia clinica animal unificada.
- Calendario sanitario.
- Inventario con movimientos y vencimientos.
- Produccion lechera diaria y tendencias.
- Finanzas vinculadas a inventario/mercado.
- Reportes regulatorios exportables.
- Actividad/auditoria visible.
- Preferencias/favoritos/historial.

Salida:

- Plataforma completa para operacion diaria y seguimiento gerencial.

## Backlog priorizado

### P0 - Critico

- Resolver fuente canonica de codigo y duplicados.
- Centralizar rutas/permisos.
- Cerrar ciclo de build en diagnostics.
- Unificar offlineQueue con sync_operations.
- Implementar conflictos y recibos de sync.
- Completar CRUD campesino minimo.

### P1 - Alto

- Adjuntos offline por chunks.
- Export/import `.villaluzpack`.
- UI de estado por dispositivo/nodo.
- Historia clinica animal unificada.
- Calendario sanitario.
- Inventario con movimientos.
- Actividad/auditoria visible.

### P2 - Medio

- Dashboard tecnico de asistencia.
- Mercado campesino con filtros y contactos.
- Aprendizaje offline descargable.
- Reportes regulatorios finales.
- Finanzas con presupuestos/cartera.
- Notificaciones push configurables.

### P3 - Optimizar

- Reducir chunks grandes.
- Optimizar imagenes landing.
- Mejorar lazy loading por modulo.
- Crear tablero automatico de cobertura endpoint-vista.
- Documentar playbooks de despliegue y restauracion.

## Checklist de aceptacion global

- `python -m pytest -q` pasa.
- `npm run type-check` pasa.
- `npm run build` pasa sin advertencias criticas.
- No hay archivos duplicados `(1)` en `frontend/src`.
- Cada ruta tiene roles, menu y breadcrumb definidos.
- Cada modulo critico tiene CRUD, filtros, estados vacios, errores y pruebas basicas.
- Offline soporta crear, editar y borrar sin internet.
- Sync soporta duplicados, conflictos y reintentos.
- Campesino territorial funciona desde movil con baja conectividad.
- Reportes y auditoria permiten explicar quien hizo que, cuando y desde que finca/dispositivo.

## Recomendacion de ejecucion

No conviene empezar agregando mas funcionalidades encima del frontend actual. La secuencia mas segura es:

1. Limpiar y consolidar.
2. Centralizar rutas/permisos.
3. Cerrar offline/sync.
4. Completar campesino territorial.
5. Volver a modulos ganaderos y administrativos para pulir experiencia.

Esta ruta reduce el riesgo de que cada mejora nueva se duplique, quede fuera del menu, rompa permisos o no funcione sin conectividad.

## Avance de ejecucion - 2026-05-07

### P0 parcialmente atendido: ciclo de build en diagnostics

Se corrigio el ciclo reportado por Vite entre `dependencyCheck.service.ts` y los modulos especificos de diagnostics.

Archivos ajustados:

- `frontend/src/pages/dashboard/admin/species/index.tsx`
- `frontend/src/pages/dashboard/admin/breeds/index.tsx`
- `frontend/src/pages/dashboard/admin/animals/index.tsx`

Cambio aplicado:

- Las paginas de especies, razas y animales dejaron de importar `checkSpeciesDependencies`, `checkBreedDependencies` y `checkAnimalDependencies` desde el agregador `dependencyCheck.service.ts`.
- Ahora importan directamente desde `dependencyCheck.animals.ts`.
- `clearAnimalDependencyCache` se importa directamente desde `dependencyCheck.cache.ts`.

Validacion posterior:

- `npm run type-check` OK.
- `npm run build` OK.
- La advertencia circular de Rollup/Vite desaparecio.
- Queda solo la advertencia de chunk grande en `vendor-charts`, que es optimizacion P3 y no bloqueo funcional.

### Inventario no destructivo de duplicados frontend

Se clasificaron los duplicados tipo `(1)`, `(2)`, etc. dentro de `frontend/src`:

- Total duplicados detectados: 108.
- Duplicados identicos a su candidato canonico: 59.
- Duplicados divergentes o sin par canonico directo: 49.

Interpretacion:

- Los 59 identicos son candidatos fuertes para eliminacion/archivo automatizado tras checkpoint.
- Los 49 divergentes requieren revision manual o comparacion semantica antes de decidir si se conserva la version canonica o la copia.

Carpetas fuente paralelas:

- `frontend/src1`
- `frontend/src3`

Inventario de esas carpetas:

- 1122 archivos.
- 18.5 MB aproximados.

Recomendacion inmediata:

1. Crear carpeta de archivo fuera de `frontend/src`, por ejemplo `_archive/frontend_source_duplicates_2026-05-07`.
2. Mover primero solo los 59 duplicados identicos.
3. Ejecutar `npm run type-check` y `npm run build`.
4. Revisar los 49 divergentes por grupos de modulo.
5. Archivar `src1` y `src3` solo despues de comparar contra `src`.

### P0 parcialmente atendido: archivo de duplicados identicos

Se agrego una herramienta de mantenimiento:

- `scripts/Audit-FrontendDuplicates.ps1`

Uso:

- Dry-run: `.\scripts\Audit-FrontendDuplicates.ps1`
- Archivar duplicados identicos: `.\scripts\Audit-FrontendDuplicates.ps1 -ArchiveIdentical`

Resultado ejecutado:

- Duplicados identicos archivados: 59.
- Destino: `_archive/frontend_source_duplicates_2026-05-07`.
- Duplicados restantes en `frontend/src`: 49.
- Todos los restantes son divergentes o sin canonico directo, por lo que requieren revision manual.

Validacion posterior:

- `npm run type-check` OK.
- `npm run build` OK.
- No reaparecio la advertencia circular de diagnostics.
- Queda la advertencia P3 de chunk grande en `vendor-charts`.

### P0 completado en frontend/src: seleccion por mejor UX

Se revisaron los 13 duplicados divergentes que aun quedaban en `frontend/src` y se eligieron las versiones canonicas sin sufijo porque son las integradas al flujo actual y ofrecen mejor experiencia de usuario:

- `pages/chat/ChatPage.tsx`: conserva autenticacion real, servicio de chat, busqueda dentro del chat, adjuntos, emoji picker, realtime y componentes UI consistentes.
- `shared/ui/common/AdminCRUDPage.tsx`: conserva la experiencia CRUD mas completa: busqueda global, vistas tabla/tarjeta, modales enriquecidos, estados visuales, validacion y contenido de detalle extensible.
- `widgets/dashboard/components/AnimalActionModalInstance.tsx`: conserva produccion lechera, reportes y acciones ganaderas ampliadas.
- `widgets/dashboard/components/renderListItem.tsx`: conserva `milk_production` y mejores tarjetas visuales para historial.
- `widgets/dashboard/AnimalActionsMenu.types.ts`: conserva tipos para `milk_production` y `report`.
- `widgets/dashboard/utils/historyHelpers.ts`: conserva clases visuales para eventos de leche.
- `features/diagnostics/api/dependencyCheck.service.ts`: conserva el agregador modular posterior a la correccion del ciclo de build.
- `shared/utils/securityValidation.ts`: conserva la version completa con sanitizacion, contrasenas, archivos, rate limiting, CSRF y utilidades.
- `pages/dashboard/admin/animals/animalFormHelpers.ts`: conserva la version actual de formulario, validacion y mapeo.

Versiones archivadas:

- `features/diagnostics/api/dependencyCheck.service(1).ts`
- `pages/chat/ChatPage(1).tsx` a `ChatPage(5).tsx`
- `pages/dashboard/admin/animals/animalFormHelpers(1).ts`
- `shared/ui/common/AdminCRUDPage(3).tsx`
- `shared/utils/securityValidation(2).ts`
- `widgets/dashboard/AnimalActionsMenu.types(1).ts`
- `widgets/dashboard/components/AnimalActionModalInstance(1).tsx`
- `widgets/dashboard/components/renderListItem(1).tsx`
- `widgets/dashboard/utils/historyHelpers(1).ts`

Resultado:

- Duplicados restantes en `frontend/src`: 0.
- Destino de archivo: `_archive/frontend_source_duplicates_2026-05-07`.
- `scripts/Audit-FrontendDuplicates.ps1` reporta 0 duplicados.

Validacion posterior:

- `npm run type-check` OK.
- `npm run build` OK.
- Queda solo la advertencia P3 de chunk grande en `vendor-charts`.

### P0 completado: archivo de fuentes paralelas

Se revisaron las carpetas paralelas:

- `frontend/src1`
- `frontend/src3`

Hallazgos:

- `src1` y `src3` son identicas entre si: 561 archivos cada una, 0 diferencias por hash.
- No tienen archivos unicos frente a `frontend/src`.
- `frontend/src` es la fuente activa usada por `tsconfig`, alias `@`, Vite y PWA.
- `frontend/src` contiene 177 archivos adicionales, incluyendo modulos recientes de campesino, alertas, analytics, PWA, multi-finca, reportes regulatorios, acciones masivas, dashboards y diagnostics modularizado.
- En rutas de UX criticas, `frontend/src` conserva versiones mas completas que las copias antiguas, por ejemplo chat, rutas y dashboard ganadero.

Decision:

- Se conserva `frontend/src` como unica fuente activa.
- Se archivan `src1` y `src3` en `_archive/frontend_parallel_sources_2026-05-07`.

Validacion posterior:

- `npm run type-check` OK.
- `npm run build` OK.
- En `frontend` solo queda la carpeta activa `src`.

### P3 atendido: chunk de graficas

Se dividio el chunk grande de graficas en `vite.config.ts`:

- `vendor-recharts`
- `vendor-chartjs`

Resultado:

- `vendor-charts` dejo de existir como chunk monolitico de 614 kB.
- `vendor-recharts` queda alrededor de 430 kB.
- `vendor-chartjs` queda alrededor de 184 kB.
- `npm run build` queda sin advertencias.

### P1 parcialmente atendido: navegacion y descubribilidad

Se revisaron rutas, paginas existentes y menu lateral basado en roles.

Problema detectado:

- Habia paginas funcionales en `frontend/src/pages` sin ruta o sin entrada visible en el menu.
- Algunas paginas no se deben publicar aun porque estan vacias o usan datos mock, por ejemplo `api-docs`, `diagnostics`, `cattle` y `economy/FarmWallet`.
- El menu llamaba "Finanzas y Gastos" a `operational`, aunque ya existe un modulo financiero real en `/admin/financial`.

Cambios aplicados:

- Se conecto `frontend/src/pages/dashboard/admin/data-overview/index.tsx` en `/admin/data-overview`.
- Se agrego "Vista de Datos" al menu de Tablero Ejecutivo para roles administrativos.
- Se agrego "Finanzas" al menu administrativo usando `/admin/financial`.
- Se renombro el acceso `operational` a "Operacion y Costos" para evitar confusion con el modulo financiero.
- Se agrego "Auditoria" al menu de Configuracion usando `/admin/activity-log`.

Paginas omitidas deliberadamente:

- `pages/api-docs/ApiDocsPage.tsx`: archivo vacio.
- `pages/dashboard/admin/diagnostics/index.tsx`: devuelve `null`.
- `pages/cattle/CattleDashboard.tsx`: dashboard con datos mock.
- `pages/economy/FarmWallet.tsx`: monedero con datos mock.

Validacion posterior:

- `npm run type-check` OK.
- `npm run build` OK.
