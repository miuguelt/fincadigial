# Módulo reproductivo: la unidad de servicio como núcleo

**Fecha:** 2026-08-19 · **Alcance:** `backend/app/services/reproduction/`,
`backend/app/namespaces/animals/reproduction/`, pantallas de `/admin/reproduction`.

## 1. El problema

El registro guardaba eventos sueltos (`Celo`, `Inseminacion`, `Diagnostico`,
`Parto`) sin reconstruir la relación entre ellos. De ahí salían tres clases de
defectos:

1. **Indicadores que no existían.** Se calculaba tasa de concepción e intervalo
   entre partos, pero no días abiertos, servicios por concepción, intervalo
   parto–primer servicio, detección de celo, tasa de preñez ni edad al primer
   parto. Son los que una finca usa para decidir.
2. **Emparejamientos imposibles.** Un diagnóstico positivo 300 días después de
   una inseminación se contaba como éxito de esa inseminación. Un parto dentro
   de la ventana de tolerancia confirmaba a la vez dos servicios separados por
   21 días, inflando la tasa de concepción.
3. **Estado derivado congelado.** `is_pregnant`, `is_lactating` y
   `last_calving_date` se escribían solo al crear el evento. Corregir un
   diagnóstico de positivo a negativo, o borrar un parto, dejaba al animal con
   el estado viejo para siempre.

## 2. La decisión

La abstracción central es la **unidad de servicio** (`ServiceUnit`): la monta o
inseminación junto al desenlace que le corresponde, resuelto respetando las
ventanas biológicas.

```
Celo ─▶ Servicio ─┬─▶ Diagnóstico (25–150 d) ─┬─▶ Parto (283 ± 25 d) ─▶ calved
                  │                            └─▶ sin parto y vencido ─▶ aborted
                  ├─▶ Diagnóstico negativo ─────────────────────────────▶ failed
                  ├─▶ Re-servicio ──────────────────────────────────────▶ failed
                  └─▶ dentro de ventana, sin evidencia ─────────────────▶ pending
```

Reglas que hacen honesto el emparejamiento:

- Un diagnóstico solo se atribuye a un servicio si cae en la ventana
  `[servicio + 25 d, servicio + 150 d]` **y** antes del siguiente servicio.
- **Un parto pertenece a un solo servicio**: el que mejor lo explica. Con
  re-servicios cada 21 días la ventana de ±25 días admite varios candidatos, así
  que la asignación es exclusiva y por menor diferencia contra la fecha
  esperada (`_assign_births`).
- Un servicio sin evidencia sigue `pending` hasta que vence la gestación; solo
  entonces pasa a `failed`. Los `pending` **no cuentan en el denominador** de la
  tasa de concepción.

Todo lo demás se deriva de ahí: días abiertos (parto → concepción efectiva),
servicios por concepción, intervalo parto–primer servicio, tasa de preñez.

## 3. Estructura

```
backend/app/services/reproduction/
├── cycle_rules.py         Parámetros del ciclo y metas; overrides por finca
├── pregnancy_resolver.py  Unidad de servicio: emparejamiento y desenlace
├── female_metrics.py      Series por hembra (IEP, días abiertos, S/C, EPP)
├── heat_detection.py      Detección de celo y tasa de preñez
├── outcome_stats.py       Tasas de concepción, pérdida y resultado del parto
├── body_condition_link.py Concepción por banda de condición corporal
├── risk_lists.py          Listas accionables por animal
├── herd_kpis.py           Orquestador del panel
├── summary.py             Resumen compacto (contrato histórico de la interfaz)
├── state_sync.py          Estado derivado del animal y ciclo de lactancia
├── calf_registration.py   Alta de la cría como animal, con genealogía
└── validators.py          Reglas de dominio al registrar o editar

backend/app/namespaces/animals/reproduction/
├── _namespace.py          Namespace y modelos Swagger
├── events_routes.py       CRUD de eventos reproductivos
├── offspring_routes.py    Crías y su alta como animal del hato
├── analytics_routes.py    /summary, /kpis, /fertility-dashboard, /sire-performance
├── planning_routes.py     /pending-births, /heat-alerts, /calendar
└── batch_routes.py        /genealogy, /batch
```

**Dirección de dependencias:** rutas → servicios → modelos. Ninguna ruta calcula;
ningún servicio conoce Flask.

## 4. Estado derivado: recalcular, no aplicar deltas

`state_sync.resync_animal` recalcula `is_pregnant`, `is_lactating` y
`last_calving_date` desde **todo** el historial del animal, y se invoca en alta,
edición y borrado. Aplicar deltas era la causa del estado congelado; recalcular
lo hace imposible por construcción.

Efectos derivados que ahora sí se materializan:

| Evento | Efecto |
|---|---|
| `Parto` | Cierra la lactancia anterior y abre `LactationCycle` numerada |
| `Parto` | Crea las filas de `Offspring` que declaran `alive_count`/`dead_count` |
| `Secado` | Cierra el ciclo con `dry_off_date` real y estado `Dry` |
| `Diagnostico` positivo | Hereda `expected_birth_date` de su servicio |
| Cualquiera | Resincroniza el estado reproductivo del animal |

Esto conecta reproducción con el módulo de leche: antes, un parto marcaba
`is_lactating = True` sin abrir ciclo, y la lactancia quedaba sin registro.

### Secado (`EventType.Secado`, migración `repro001`)

Sin evento de secado la lactancia solo terminaba por vencimiento a los 305 días,
así que una vaca seca seguía contando como lactando. Ahora un secado posterior al
último parto cierra la lactancia de inmediato; sin secado se mantiene el tope de
305 días como red de seguridad, y la vaca aparece en `due_for_dry_off`.

El validador exige una lactancia abierta y una fecha posterior al parto que la
inició: no se puede secar una vaca que nunca parió.

### Alta de la cría (`POST /reproduction/offspring/{id}/register-animal`)

El parto deja filas en `offspring`, pero la cría no entra al inventario hasta que
alguien le asigna un arete —que es una decisión humana, no derivable—. El
endpoint recibe registro y sexo, y deriva del parto todo lo demás: fecha de
nacimiento, madre, **padre del servicio que la engendró** (resuelto por la unidad
de servicio cuando el parto no lo trae), raza de la madre y los abuelos conocidos
(`idMotherMother`, `idMotherFather`, `idFatherMother`, `idFatherFather`).

Rechaza registrar dos veces la misma cría, dar de alta una cría muerta o repetir
un registro ya usado en la finca.

### Condición corporal al servicio

`body_condition_link` cruza cada servicio resuelto con la medición de
`body_condition_scores` vigente en los **45 días previos** y agrupa la tasa de
concepción por banda (Emaciado, Delgado, Ideal, Gordo, Obeso), reusando el umbral
que ya define el modelo. Una medición más vieja describe otro momento del animal,
así que no se usa; el contrato reporta `coverage_pct` para que se vea sobre qué
proporción de los servicios se está hablando.

## 5. Validación: lo imposible se rechaza, lo improbable se advierte

`validators.validate_event` rechaza con mensaje accionable: evento sobre un
macho, reproductor que es hembra, fecha futura, fecha anterior al nacimiento,
evento duplicado, parto sin crías y dos partos a menos de 240 días.

Devuelve **advertencias** (no bloquean) cuando la situación es improbable pero
posible en campo: servicio sin reproductor ni técnica, novilla por debajo de la
edad mínima, servicio sobre una hembra que figura preñada, y parto o diagnóstico
sin servicio previo en la ventana esperada. El registro por lote las evalúa por
animal y reporta los rechazos en vez de descartarlos en silencio.

## 6. Indicadores nuevos (`GET /reproduction/kpis`)

| Indicador | Meta | Por qué importa |
|---|---|---|
| Intervalo entre partos | 400 d | Cuántas crías por vaca y por año |
| **Días abiertos** | 100 d | Manda sobre el intervalo; es lo accionable |
| **Parto a primer servicio** | 60 d | Qué tan rápido reingresa la vaca al programa |
| **Servicios por concepción** | 1,8 | Costo real en pajillas y jornadas |
| **Edad al primer parto** | 30 meses | Cuánto capital inmovilizan las novillas |
| Tasa de concepción | 50 % | Calidad del servicio |
| **Detección de celo** | 60 % | Techo de todo lo demás |
| **Tasa de preñez** | 25 % | Detección × concepción: resume el programa |
| Pérdida de preñez | 2 % | Confirmadas que no llegaron a parto |
| Mortalidad perinatal | 3 % | |

Cada uno viaja con su meta y su semáforo (`ok` / `warn` / `bad`) resueltos en el
servidor, para que la interfaz no duplique el criterio agronómico.

Además el panel entrega **listas de atención** (días abiertos excedidos,
repetidoras, novillas sin servicio, servicios sin diagnóstico, partos vencidos,
secados pendientes, partos próximos) y la **proyección de partos y secados** mes
a mes.

### Detección de celo

No se puede contar directamente: hay que compararla con las oportunidades que el
hato ofreció. Una hembra elegible —en edad, no preñada y pasado el período de
espera voluntario— presenta un celo por ciclo estral, así que:

```
oportunidades = días elegibles / 21
detección     = celos observados / oportunidades
```

Los días de gestación y de espera voluntaria se restan de los elegibles. Un
servicio implica un celo detectado, y se deduplica por fecha con el evento
`Celo` correspondiente.

## 7. Ventanas y sus límites

Los KPIs se calculan sobre un período (por defecto 12 meses, máximo 60), pero el
historial se carga con **una gestación más 60 días de margen hacia atrás**: sin
ese margen, un servicio anterior al borde dejaría a su parto huérfano dentro de
la ventana.

La **edad al primer parto** usa el primer parto real del animal —consultado
sobre todo el historial, no sobre la ventana— y solo cuenta para la cohorte que
estrenó maternidad dentro del período. Sin eso, el parto más antiguo visible se
confundía con el primero de la vida del animal, y el indicador se repetiría año
tras año.

> **Nota sobre datos sembrados:** con historial simulado de 30 meses sobre
> animales adultos, la edad al primer parto sale alta (≈45 meses) porque su
> primer parto *registrado* es reciente. El indicador solo es interpretable
> cuando el hato tiene historial real desde la novilla.

## 8. Código retirado

- `app/services/reproduction_service.py` (359 líneas): sin ningún consumidor, y
  sus consultas ignoraban `finca_id` pese a recibirlo.
- `app/namespaces/animals/reproduction_namespace.py` (1 461 líneas): dividido en
  el paquete descrito arriba; las analíticas que tenía en línea pasaron a
  `FertilityAnalyticsService` y `SirePerformanceService`, que estaban escritos y
  sin usar.

## 9. Verificación

```bash
python -m pytest tests/test_reproduction_kpis.py tests/test_reproduction_state_sync.py tests/test_reproduction_endpoints.py tests/test_fertility_dashboard.py -q
```

Historial de prueba reproducible:

```bash
python -m app.scripts.seed_reproduction_demo --finca 1 --months 30
```

Genera ciclos coherentes con los casos que la finca sí ve: repetidoras,
servicios sin diagnóstico, abortos, gemelares y mortalidad perinatal.

## 10. Estado de la migración `repro001`

`repro001` añade la etiqueta `Secado` al enum `eventtype`. **Está sin aplicar en
`finca_db`**: requiere un rol dueño y la credencial de Windows Credential Manager
(`DevBrain/PG_USER` + `DevBrain/PG_PASSWORD`) dejó de autenticar contra el rol
`postgres` a media sesión —probablemente por una rotación del ciclo de
mantenimiento de DevBrain—.

Mientras no se aplique, **el código funciona salvo el registro de secados**: nada
consulta el enum por esa etiqueta, así que indicadores, resumen y CRUD siguen
operando. Intentar crear un evento `Secado` fallará con
`invalid input value for enum eventtype`.

Para aplicarla, con un rol dueño válido:

```bash
python -m flask db upgrade
```

## 11. Pendiente

- **Costo por preñez.** Cruzar servicios con `operational_costs` daría el costo
  real de cada preñez lograda.
- **`ReproductiveEvent.control_id`** sigue sin uso: vincular el servicio con el
  control sanitario del día permitiría cruzar peso y estado de salud, no solo
  condición corporal.
- **Alta de crías por lote.** Hoy el alta es una cría a la vez; una jornada de
  aretado querría hacerlo en bloque.
