# Auditoría de rendimiento — 2026-08-01

## Incidente

El calendario bloqueaba el equipo al renderizar decenas de miles de alertas históricas.
La tabla `animal_alerts` contiene 460.813 filas, de las cuales 460.769 están sin leer.
El generador periódico añadía alertas repetidas y ejecutaba commits y búsquedas dentro
de bucles de animales.

## Acciones

- Se implementó resumen de alertas por día y detalle acotado a 50.
- Se corrigió Flask-Caching para usar Redis compartido.
- Se convirtió `read-all` en una actualización masiva y aislada por finca.
- Se añadieron lock distribuido, evaluación cada seis horas, deduplicación por lotes,
  commits agrupados y notificaciones resumidas.
- Se añadió caché GET persistente efectiva para uso con señal intermitente.
- Se crearon pruebas de volumen y aislamiento multi-finca.
- Se preparó y aplicó `perf002_calendar_alert_indexes.py` junto con `perf001_runtime` usando
  la cuenta propietaria administrativa, sin tocar los datos de negocio.

## Verificación

- 15 pruebas backend: correctas.
- TypeScript: correcto.
- Build PWA de producción: correcto.
- Redis: `PING` correcto y backend `RedisCache` confirmado.
- Servicios 3005, 8092, 5434 y 6380: operativos tras reinicio.
- DOM Agenda: 285.258 → 347 nodos.
- DOM Mes: 18.313 → 1.217 nodos.

## Estado de base de datos

La migración quedó en `perf002_calendar (head)`. Se verificaron los índices de alertas,
producción de leche, campos, aforos y controles de recomendaciones. No hubo eliminación
de alertas ni modificación masiva de datos.
