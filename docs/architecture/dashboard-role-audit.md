# Auditoría del dashboard por rol

Fecha: 2026-09-14
Alcance: /admin/dashboard, /campesino, /instructor/dashboard, /veterinario/dashboard, /operario/dashboard y /apprentice/dashboard, incluidos sus widgets cargados en la vista inicial.

## Criterios

- El valor visible debe provenir de la API/BD o mostrarse como “—” si no existe evidencia.
- Cada rol debe ver acciones que puede ejecutar y datos que puede interpretar.
- Las alertas deben ser accionables, estar aisladas por finca y no exponer sentinelas técnicos.
- Los gráficos deben tener suficientes puntos reales; sin ellos deben explicar qué falta.
- Los controles deben poder usarse con teclado, tener objetivo táctil de al menos 42 px y adaptarse a móvil.
- La pantalla no debe ocupar espacio con metadatos internos, caché o contenido fijo que parezca dato de la finca.

## Resultado por rol

| Rol | Prioridad útil | Resultado de la auditoría |
|---|---|---|
| Administrador / Propietario | Estado global, pendientes, sanidad, cumplimiento y gestión | El arranque entra al resumen. Se conservan tabs de Sistema/Ajustes solo para estos roles. Las alertas se etiquetan como “sin leer”; los KPIs ya no muestran 0% sin comparación. |
| Capataz | Operación diaria, alertas, tareas, animales y potreros | Usa el resumen operativo sin acceso a configuración técnica. La ruta mantiene el aislamiento de finca del backend. |
| Veterinario | Sanidad, vacunación, tratamientos, diagnósticos, controles y asistencia | Mantiene sus módulos sanitarios y agenda. La orientación está presentada como recomendación técnica, sin metadatos de modelo/tokens. |
| Operario | Registrar control, traslado, enfermedad y tratamiento; trabajar offline | Se retiró el asistente genérico que no aportaba una decisión de campo. La pantalla queda centrada en jornada, conexión, cola offline y acciones de registro. |
| Instructor | Consultar datos para formación y abrir cursos | Se sustituyeron tarjetas de cursos con lecciones/duración fijas por un acceso al módulo de cursos, que es la fuente de verdad. Se eliminó “Usuarios activos”, que no corresponde a sus permisos/datos. |
| Aprendiz | Consulta y aprendizaje, sin administración | Se eliminaron “Usuarios activos” y el bloque técnico de estado/caché. Los indicadores no disponibles se muestran como — en vez de cero falso. |
| Campesino | Jornada, novedades, inventario de ganado, potreros y producción | ADG, utilización de potreros, leche y termómetro ya no inventan 0,55 kg/día, 65%, 100% ni “producción estable”. Se muestra estado no disponible con instrucción para registrar la evidencia faltante. |

## Hallazgos corregidos

1. health_trend convertía una semana sin controles en 100%. Ahora devuelve null; el frontend solo dibuja con al menos dos semanas con evidencia.
2. kpi_resumen.cards enviaba cambio: 0.0 sin comparar periodos. El campo se omite hasta que exista una comparación real.
3. Las métricas privadas se serializaban como cero. to_stat(None) conserva null y las tarjetas muestran —.
4. Alertas antiguas podían mostrar 9999 días. La generación nueva usa “sin historia clínica” y la salida de alertas sanea registros históricos.
5. El contenido técnico de recomendaciones podía terminar en db; se limpia al servirlo y se ocultan modelo/tokens del usuario.
6. El redirect /dashboard llevaba a gestión de animales, incluso para roles de gestión. Ahora abre el resumen por rol.
7. Se retiraron bloques estáticos que simulaban cursos publicados y metadatos de caché del sistema.

## Evidencia ejecutada

- Pruebas de veracidad del dashboard: 6 passed.
- Analytics HTTP, incluida autorización y estructura de /analytics/dashboard/complete: 33 passed.
- Pruebas unitarias frontend de tendencia, redirect y estados campesinos sin datos: 5 passed.
- tsc -p tsconfig.app.json --noEmit: passed.
- Verificación manual en Chrome de /admin/dashboard: clima, pulso, guía, eventos, KPIs, tendencia, reproducción, reportes, recomendación y enlaces de administración; se confirmó que ya no aparecen 9999 ni db.

## Riesgos pendientes no alterados

- La finca actual conserva 1.251 alertas persistentes sin leer. El contador coincide con la consulta de alertas y no se borró información durante esta auditoría. Requiere una decisión de negocio para archivado/cierre masivo antes de cambiar ese backlog.
- El endpoint de recomendaciones sirve contenido administrado desde system_contents; por eso se denomina “Recomendación técnica” y no se presenta como análisis IA en tiempo real.
- La ejecución visual automatizada se realizó con la sesión de administrador disponible. La matriz de roles se contrastó con RBAC y con las pruebas backend de dashboards por rol; no se reutilizaron credenciales ni se modificaron datos externos.
