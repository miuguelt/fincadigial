# Infraestructura de Pruebas Automatizadas E2E — Villa Luz

Este documento define la arquitectura, diseño y ejecución de la suite de pruebas automatizadas End-to-End (E2E) y de integración para la plataforma **Villa Luz**, fundamentada en la metodología **Dual Track** y estructurada en **4 Tiers de Cobertura Progresiva**.

---

## 1. Filosofía Dual Track y Principios de Diseño

El marco de pruebas de Villa Luz combina dos pistas complementarias:
1. **Pista de Caja Opaca Basada en Requisitos (Opaque-Box Requirement-Driven):**
   - Las pruebas verifican el comportamiento observable desde la perspectiva del ganadero, administrador, operario y veterinario.
   - Aplica partición por categorías (**Category-Partition**) y análisis de valores límite (**Boundary Value Analysis - BVA**) para aislar clases de equivalencia de entrada.
   - Utiliza combinatoria por pares (**Pairwise Testing**) para verificar interacciones entre estado reproductivo, sanidad, peso y producción láctea.
2. **Pista de Cargas de Trabajo del Mundo Real (Real-World Workloads):**
   - Simula el ciclo de vida zootécnico y productivo completo de los animales en la hacienda colombiana.
   - Valida la trazabilidad cronológica inmutable, la coherencia de estados fisiológicos y las reglas de negocio veterinarias.

### Principios Inquebrantables de DevBrain
- **100 % de Aserciones Observables:** Cada prueba verifica estados persistidos en base de datos, códigos HTTP, encabezados o mutaciones reales de estado. Quedan prohibidos los tests fachada o mocks triviales sin comprobación de efectos.
- **Motor Determinista (Directiva Anti-IA en Caliente):** Toda regla zootécnica (tiempos de retiro, Ganancia Diaria de Peso - ADG, descarte de leche) se valida mediante cálculos matemáticos deterministas y reglas de negocio, sin depender de LLMs en tiempo de ejecución.
- **Protocolo SSoT de Interfaz:** Verificación de modales flotantes con padding `p-6`, esquinas redondeadas, despeje en cabeceras (`pr-9 sm:pr-10`) y áreas táctiles mínimas de 44x44px.
- **Aislamiento Multi-Tenant:** Toda transacción de prueba asegura la integridad referencial y aislamiento por `finca_id`.
- **Terminología Colombiana (`es-CO`):** Aserciones de mensajes de error, advertencias de descarte y catálogos en lenguaje técnico ganadero colombiano.

---

## 2. Arquitectura de Cobertura en 4 Tiers

La suite E2E se organiza jerárquicamente en 4 Tiers de prueba:

```
┌────────────────────────────────────────────────────────┐
│  Tier 4: Ciclos de Vida Ganaderos del Mundo Real       │
│  (Ingreso -> Crecimiento/ADG -> Lactancia -> Retiro)   │
├────────────────────────────────────────────────────────┤
│  Tier 3: Interacciones y Combinaciones de Módulos      │
│  (Tratamiento Activo -> Bloqueo Leche; ADG -> Alerta)  │
├────────────────────────────────────────────────────────┤
│  Tier 2: Valores Límite y Casos Borde (BVA / Edge)     │
│  (Retiro 0d, ADG=0, Fechas Invertidas, Litros Máx/Mín) │
├────────────────────────────────────────────────────────┤
│  Tier 1: Cobertura de Características en Aislamiento   │
│  (Inventario, Sanidad, Pesaje, Alertas / Viewport)     │
└────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Aislamiento de cada Flujo)
- **Inventario y Registro Animal:** Registro rápido con validación estricta de raza, especie, sexo y arete. Consulta de ficha completa por identificador único. Carga directa por URL `/admin/animals/:id` sin modales duplicados.
- **Sanidad y Tratamientos:** Registro de tratamientos clínicos con posología, frecuencia y días de retiro. Creación automática del reflejo en la bitácora unificada (`AnimalHealthHistory`).
- **Control de Peso y Lotes:** Registro de pesaje masivo (`batch_weight`) con persistencia atómica en base de datos y actualización sincronizada del peso actual del animal. Cálculo de Ganancia Diaria de Peso (ADG).
- **Alertas y Jerarquía del Dashboard:** Generación determinista de alertas sanitarias y reproductivas, ordenadas y priorizadas para el primer viewport según criticidad.

### Tier 2: Boundary & Corner Cases (Valores Límite y Casos Borde)
- **Retiro Sanitario de 0 Días:** Tratamientos tópicos o no sistémicos sin período de retiro (`withdrawal_days = 0`) no deben generar restricciones; el ordeño en el mismo día debe ser admitido.
- **Pesos Idénticos:** Controles con peso sin variación (`weight_1 == weight_2`) en fechas separadas deben calcular un ADG determinista de `0.000 kg/día` sin fallos por división por cero.
- **Controles Retroactivos:** Un pesaje ingresado con fecha anterior no debe sobrescribir el peso actual del animal fijado por un pesaje más reciente.
- **Fechas Futuras:** Intentos de registrar pesajes o controles con fechas futuras son rechazados con `ValidationError`.
- **Límites de Producción Láctea:** Registro admisible en `0.0 L` y `80.0 L`; valores negativos o superiores a `80.0 L` son rechazados. Células somáticas mayores a 1,000,000 o negativas son invalidadas.
- **Identificadores Inválidos:** Manejo controlado con códigos `404 Not Found` y `422 Unprocessable Entity` ante identificadores inexistentes, negativos o no numéricos.

### Tier 3: Combinaciones Entre Características (Inter-Feature)
- **Tratamiento Activo con Retiro ➔ Ordeño Bloqueado:** Vaca en lactancia con tratamiento activo bajo tiempo de retiro (`withdrawal_end_date >= target_date`) rechaza el registro de producción de leche con mensaje explícito de descarte obligatorio según normativa ICA.
- **Superación del Período de Retiro ➔ Ordeño Admitido:** Una vez superada la fecha final de retiro (`target_date > withdrawal_end_date`), el sistema admite normalmente la producción láctea.
- **Pesaje Masivo ➔ Alerta de Pérdida de Peso / Bajo Rendimiento:** Identificación de animales con ADG negativo o crítico en pesajes por lote para alertamiento zootécnico.
- **Incompatibilidad Fisiológica:** Bloqueo estricto de ordeño para animales macho o hembras no lactantes.

### Tier 4: Escenarios de Ciclo de Vida Ganadero Real (End-to-End)
- **Ciclo Completo de una Res:**
  1. Ingreso e identificación formal de la novilla (`Animals.create`).
  2. Período de levante: múltiples pesajes mensuales con cálculo y acumulación de Ganancia Diaria de Peso.
  3. Preñez y parto: transición de estado reproductivo e inicio de lactancia activa (`is_lactating = True`).
  4. Producción lechera regular (ordeños comerciales AM y PM).
  5. Episodio clínico / mastitis: diagnóstico veterinario y aplicación de tratamiento con período de retiro de 5 días.
  6. Intento de registro lechero durante el retiro: interceptado y bloqueado con orden de descarte de leche.
  7. Convalecencia y fin del retiro: admisión del ordeño tras superar la fecha límite.
  8. Auditoría inmutable: verificación de la bitácora sanitaria consolidada (`AnimalHealthHistory`), controles de peso y métricas históricas persistidas.

---

## 3. Disposición de Archivos de Prueba

```
villaluz/
├── backend/
│   └── tests/
│       └── e2e/
│           ├── __init__.py
│           ├── conftest.py                       # Fixtures zootécnicos aislados
│           ├── test_tier1_feature_coverage.py    # Tier 1: Aislamiento por flujo
│           ├── test_tier2_boundaries.py          # Tier 2: Valores límite y robustez
│           ├── test_tier3_inter_feature.py       # Tier 3: Interacciones cruzadas
│           └── test_tier4_lifecycle.py           # Tier 4: Ciclo de vida completo
├── frontend/
│   └── src/
│       ├── features/
│       │   └── animal-bulk-actions/
│       │       └── BatchWeightModal.test.tsx     # Modal de pesaje y touch targets
│       └── test/
│           └── integration/
│               └── animalDetailUrlNavigation.test.tsx # Navegación URL sin duplicación
├── TEST_INFRA.md                                 # Esta especificación
└── TEST_READY.md                                 # Certificación y matriz de cobertura
```

---

## 4. Comandos de Ejecución

### Suite E2E Completa de Backend (Pytest)
```bash
cd backend
pytest tests/e2e -v
```

### Ejecución por Tier Individual
```bash
# Tier 1: Feature Coverage
pytest backend/tests/e2e/test_tier1_feature_coverage.py -v

# Tier 2: Boundary & Corner Cases
pytest backend/tests/e2e/test_tier2_boundaries.py -v

# Tier 3: Inter-Feature
pytest backend/tests/e2e/test_tier3_inter_feature.py -v

# Tier 4: Real-World Lifecycle
pytest backend/tests/e2e/test_tier4_lifecycle.py -v
```

### Suite de Integración Frontend (Vitest)
```bash
# Navegación URL de animales y modal de pesaje masivo
npm --prefix frontend test src/test/integration/animalDetailUrlNavigation.test.tsx -- --run
npm --prefix frontend test src/features/animal-bulk-actions/BatchWeightModal.test.tsx -- --run
```

### Verificación de Tipos y Compuertas Globales
```bash
npm --prefix frontend run type-check
python scripts/deploy_check.py
```

---

## 5. Criterios de Aprobación y Métricas de Calidad
- **Exit Code 0:** Todas las pruebas deben ejecutarse y aprobar limpiamente sin omitir (`skip`) validaciones.
- **Aislamiento Transaccional:** Cada prueba restablece la base de datos a un estado limpio evitando contaminación cruzada.
- **Respeto a Reglas Locales:** Operación exclusiva sobre SQLite en memoria para tests rápidos y PostgreSQL 5434 / Redis 6380 en integración completa, sin Docker ni servicios externos.
