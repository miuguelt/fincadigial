# VillaLuz Backend

API y lógica de negocio de VillaLuz. Este directorio es la única raíz backend del proyecto.

## Runtime local

- Flask/RESTX en `http://127.0.0.1:8092`.
- PostgreSQL en `127.0.0.1:5434`.
- Memurai/Redis en `127.0.0.1:6380`.
- Arranque recomendado desde la raíz: `pwsh -File .\start-windows.ps1 -BackendOnly`.
- Arranque directo: `python .\run.py` usando el entorno Python del proyecto.

La configuración se carga desde `backend/.env` y `backend/config.py`; nunca documentar valores secretos aquí. El launcher de la raíz es la referencia para puertos y servicios locales.

## Estructura

```text
app/
  namespaces/    rutas REST agrupadas por dominio
  services/      casos de uso y lógica de negocio
  models/        modelos SQLAlchemy
  extensions/    extensiones Flask y conexiones
  tasks/         tareas Celery
  utils/         utilidades transversales
migrations/      historial de esquema
maintenance/     auditorías y operaciones puntuales mantenibles
tests/            pruebas backend
run.py, wsgi.py  entradas de ejecución
```

Flujo esperado: `Request -> Namespace -> Service -> Model/Repository -> DB`. Las rutas validan y delegan; los servicios concentran reglas de negocio; los modelos/repositorios encapsulan persistencia.

## Calidad

Desde la raíz del repositorio:

```powershell
python -m compileall -q backend/app backend/maintenance backend/tests
python -m pytest backend/tests -q
```

Los archivos grandes heredados y las excepciones de modularidad están listados en `../docs/architecture/exceptions.md`. No crear scripts temporales en la raíz de `backend/`; usar `backend/maintenance/` si una operación debe conservarse.
