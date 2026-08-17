# VillaLuz — Runbook de copias de seguridad

## Límites

El repositorio contiene código y configuración. Los respaldos viven fuera del
repositorio, por defecto en:

```text
C:\Users\Miguel\Documents\Backups\VillaLuz
```

También se puede definir `VILLALUZ_BACKUP_ROOT`, siempre que apunte fuera de
`C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz`.

## Código del proyecto

Crear un snapshot versionado después de un cambio estructural aprobado:

```powershell
python scripts/backup/auto_backup.py --type snapshot --description "VillaLuz release candidate"
python scripts/backup/auto_backup.py --list
```

Los respaldos diarios y semanales conservan 30 y 12 copias respectivamente,
según la configuración del script. La opción `--schedule` imprime la tarea de
Windows que debe instalar un administrador; este repositorio no crea tareas
del sistema de forma silenciosa.

## Base de datos

El dump PostgreSQL se genera desde el flujo Windows con `pg_dump` y se guarda
en el root externo. No se deben copiar dumps a `backend/`, `backups/` ni a la
raíz del proyecto.

Antes de considerar válido un respaldo:

1. Confirmar que el archivo existe y tiene fecha actual.
2. Generar y conservar un SHA-256 junto al respaldo.
3. Verificar que el dump se puede leer con `pg_restore --list` o, si es SQL,
   inspeccionarlo con `psql` en una base temporal.

## Restauración controlada

La restauración siempre se hace en una carpeta externa de inspección:

```powershell
python scripts/backup/restore.py --list
python scripts/backup/restore.py --info <TIMESTAMP>
python scripts/backup/restore.py --restore <TIMESTAMP> `
  --target "C:\Users\Miguel\Documents\Backups\VillaLuz\restore-tests\<TIMESTAMP>" `
  --dry-run
```

Después de revisar el dry-run, ejecutar la restauración y registrar fecha,
origen, checksum, destino y resultado. Nunca usar `restored_*` dentro del
repositorio ni restaurar encima de la base de datos de desarrollo sin una
confirmación explícita.

## Cadencia mínima

- Diario: 14–30 copias.
- Semanal: 8–12 copias.
- Mensual: 6–12 copias.
- Prueba de restauración: una vez al mes.

La existencia de los scripts no demuestra que exista una tarea programada.
Después de instalarla, comprobarla con:

```powershell
schtasks /query /tn VillaLuz_Backup_daily /fo LIST /v
schtasks /query /tn VillaLuz_Backup_weekly /fo LIST /v
```
