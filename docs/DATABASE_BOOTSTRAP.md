# Bootstrap de base de datos

El despliegue ejecuta `flask db upgrade` y después:

```text
python -m app.scripts.bootstrap_database
```

El comando es idempotente: crea lo que falta, actualiza el administrador
declarado por entorno y no borra registros existentes.

## Qué se precarga en una instalación nueva

### Datos globales, independientes de una finca

Los siembra `app.services.bootstrap.system`:

- especies y razas;
- estándares de crecimiento bovino;
- territorios y conectividad;
- recomendaciones, reglas y calendario de la base de conocimiento;
- materiales offline globales que ya estén definidos por los seeds existentes.

### Datos mínimos de cada finca

Los siembra `app.services.bootstrap.finca` para **cada** fila de `finca`, no
solo para la primera:

- rutas de administración, enfermedades, vacunas y medicamentos;
- tipos de alimento y potreros;
- configuraciones globales de alertas;
- doce ajustes estacionales, uno por mes.

Las tablas anteriores son tenant-scoped: cada registro lleva el `finca_id`
de la finca correspondiente. Nunca se reutiliza un catálogo de otra finca.

### Datos administrativos

`VILLALUZ_ADMIN_*` crea un usuario administrador aprobado y lo asocia a todas
las fincas existentes/configuradas. Su `finca_id` apunta a la primera finca
como finca primaria, mientras `user_finca` conserva las demás membresías.

## Qué queda para el flujo real

No se generan en producción registros falsos en tablas de auditoría,
actividad, chat, push subscriptions, dispositivos, sincronización,
solicitudes de ingreso, alertas disparadas ni movimientos. Esas tablas
representan eventos reales y deben nacer de la aplicación.

`animal_movements` además queda fuera de la fixture hasta corregir una
incompatibilidad histórica del esquema PostgreSQL: comparte el tipo enum
`movementtype` con inventario, cuyo catálogo actual no contiene los valores
regulatorios de movimientos ganaderos.

## Fixtures de prueba

Con `VILLALUZ_SEED_DEMO_DATA=true` y `VILLALUZ_DEMO_PASSWORD` se ejecuta
`app.services.bootstrap.demo`, que crea dos fincas con prefijo `Demo -`, siete
usuarios de prueba y registros relacionados de:

- animales, potreros, asignaciones, grupos y aforos;
- controles, enfermedades, vacunaciones, tratamientos e historial sanitario;
- leche, inventario y transacciones;
- tareas, condición corporal y reproducción;
- cultivos, labores, fuente/medición de agua, infraestructura y planes.

El fixture es determinista y se puede repetir sin duplicar por sus claves
naturales. Debe usarse solo en bases de QA o desarrollo.

## Variables requeridas en Coolify

```dotenv
VILLALUZ_BOOTSTRAP_ENABLED=true
VILLALUZ_ADMIN_IDENTIFICATION=100000001
VILLALUZ_ADMIN_EMAIL=admin@tu-dominio.com
VILLALUZ_ADMIN_PASSWORD=<secreto-fuerte>
VILLALUZ_ADMIN_FULLNAME=Administrador Villa Luz
VILLALUZ_ADMIN_PHONE=3000000000
VILLALUZ_BOOTSTRAP_FINCAS_JSON=[{"name":"Finca Villa Luz","type":"Tradicional","department":"Colombia"}]
VILLALUZ_SEED_DEMO_DATA=false
```

La contraseña no tiene valor por defecto. Si el bootstrap está habilitado y
falta cualquiera de las tres variables de identidad, el contenedor
`villaluz-db-init` termina con error antes de anunciar la instalación como
completa.

Para sembrar únicamente una capa durante desarrollo:

```text
python -m app.scripts.seed_system_baseline
python -m app.scripts.seed_finca_baseline
VILLALUZ_BOOTSTRAP_ENABLED=true VILLALUZ_ADMIN_IDENTIFICATION=... \
  VILLALUZ_ADMIN_EMAIL=... VILLALUZ_ADMIN_PASSWORD=... \
  VILLALUZ_SEED_DEMO_DATA=true VILLALUZ_DEMO_PASSWORD=... \
  python -m app.scripts.seed_demo_fincas
```
