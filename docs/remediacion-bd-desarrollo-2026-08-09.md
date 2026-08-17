# Remediación de la BD de desarrollo — 2026-08-09

Base revisada: `finca_db` en `localhost:5434`.

## Respaldo

Antes de escribir se creó y verificó este respaldo PostgreSQL en formato custom:

`backups/finca_db_pre_final_cleanup_20260809_134756.dump`

Su archivo fue reconocido por `pg_restore --list` y tiene 23.237.437 bytes.

## Cambios aplicados

- Se remapearon `treatment_medications` y `treatment_vaccines` al catálogo de la finca del tratamiento.
- Se remapearon lotes, vacunaciones, diagnósticos, potreros, rutas y enfermedades objetivo cuando apuntaban a otra finca.
- Se consolidó una relación duplicada de medicamento sin eliminar cantidades válidas.
- Se eliminaron 30 medicamentos, 30 vacunas, 30 enfermedades y 10 alimentos con nombres inequívocos de fixtures.
- Se eliminaron 100 tratamientos y sus 200 enlaces asociados marcados `Diagnóstico preventivo / Generado por auditoría masiva`.
- Se conservaron registros con nombres reales o plausibles que no estaban identificados como pruebas.

El procedimiento reproducible está en `backend/scripts/remap_dev_catalog_data.py`. Por seguridad, solo escribe con `--apply` y exige un respaldo mayor de 1 MB.

## Verificación posterior

- 36 fincas con rutas, medicamentos, vacunas, enfermedades, alimentos y alertas base.
- Mínimo por finca: 10 rutas, 23 medicamentos, 10 vacunas, 26 enfermedades y 14 alimentos.
- Cruces finca–animal, finca–tratamiento–medicamento y finca–tratamiento–vacuna: 0.
- Cruces de rutas y enfermedades objetivo: 0.
- Duplicados de relaciones de tratamiento: 0.
- Referencias huérfanas en las relaciones corregidas: 0.
- Fixtures marcados restantes: 0.

`farm_entity_alert_configs` queda documentada como tabla legacy no usada por el modelo activo; la tabla operativa vigente es `animal_alert_configs`, con cobertura 36/36.
