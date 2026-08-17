# Documentación de Búsqueda Mejorada

## 📋 Resumen

Se ha implementado una funcionalidad de búsqueda avanzada que permite buscar por **año, mes, día** y en **todas las columnas** de texto de cada modelo.

## 🔍 Tipos de Búsqueda Soportados

### 1. 📅 Búsqueda por Año
- **Formato:** `2024`
- **Descripción:** Busca registros que coincidan con el año especificado en cualquier columna de fecha
- **Ejemplo:** `search=2024` → Encuentra todos los registros de 2024

### 2. 📅 Búsqueda por Mes
- **Formatos:** `2024-12` o `2024/12`
- **Descripción:** Busca registros que coincidan con el año y mes especificados
- **Ejemplo:** `search=2024-12` → Encuentra todos los registros de diciembre 2024

### 3. 📅 Búsqueda por Día (Fecha Completa)
- **Formatos:**
  - `2024-12-25` (ISO)
  - `25/12/2024` (Europeo)
  - `2024/12/25` (Americano)
- **Descripción:** Busca registros que coincidan exactamente con la fecha especificada
- **Ejemplo:** `search=2024-12-25` → Encuentra registros del 25 de diciembre 2024

### 4. 🔤 Búsqueda en Todas las Columnas de Texto
- **Formato:** Cualquier texto
- **Descripción:** Busca el texto en TODAS las columnas de tipo String/Text del modelo
- **Ejemplo:** `search=vacuna` → Busca "vacuna" en todas las columnas de texto

### 5. 🔢 Búsqueda por ID
- **Formato:** Número entero
- **Descripción:** Búsqueda exacta por ID del registro
- **Ejemplo:** `search=123` → Encuentra el registro con ID 123

## 🗃️ Modelos con Campos de Fecha

La búsqueda por fechas funciona automáticamente en estos modelos:

### Animals
- `birth_date` - Fecha de nacimiento
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Treatments
- `treatment_date` - Fecha del tratamiento
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Vaccinations
- `vaccination_date` - Fecha de vacunación
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Control
- `checkup_date` - Fecha del control
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### AnimalDiseases
- `diagnosis_date` - Fecha del diagnóstico
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### GeneticImprovements
- `date` - Fecha de la mejora genética
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

## 📡 Uso en el Frontend

### Endpoint
```javascript
GET /api/v1/{resource}?search={termino_de_busqueda}
```

### Ejemplos de Petición

```javascript
// Buscar por año
const response = await fetch('/api/v1/treatments?search=2024');

// Buscar por mes
const response = await fetch('/api/v1/vaccinations?search=2024-12');

// Buscar por día específico
const response = await fetch('/api/v1/animals?search=2024-12-25');

// Buscar texto en todas las columnas
const response = await fetch('/api/v1/treatments?search=antibiótico');

// Buscar por ID
const response = await fetch('/api/v1/animals?search=123');
```

## 🎯 Características Principales

1. **Búsqueda Inteligente:** El sistema detecta automáticamente el tipo de búsqueda (año, mes, día, texto, ID)
2. **Todas las Columnas:** La búsqueda de texto se aplica a todas las columnas de tipo String/Text
3. **Múltiples Fechas:** Busca en todas las columnas de fecha/hora de cada modelo
4. **Formatos Flexibles:** Soporta múltiples formatos de fecha
5. **Rendimiento:** Usa índices de base de datos para búsquedas eficientes

## 🔧 Implementación Técnica

La funcionalidad se implementa en el método `get_namespace_query()` del `BaseModel`:

- Usa `extract('year', column)` para búsqueda por año
- Usa `extract('month', column)` para búsqueda por mes
- Usa comparación directa para búsqueda por día específico
- Usa `ilike('%term%')` para búsqueda de texto en todas las columnas
- Aplica búsqueda con `or_()` para coincidencias en cualquier campo

## 📝 Ejemplos de Resultados

### Búsqueda por Año: `2024`
```json
{
  "items": [
    {
      "id": 1,
      "treatment_date": "2024-03-15",
      "description": "Tratamiento 2024",
      "created_at": "2024-03-15T10:30:00"
    },
    {
      "id": 2,
      "treatment_date": "2024-06-20",
      "description": "Otro tratamiento",
      "created_at": "2024-06-20T14:15:00"
    }
  ],
  "total_items": 2
}
```

### Búsqueda por Mes: `2024-12`
```json
{
  "items": [
    {
      "id": 5,
      "vaccination_date": "2024-12-10",
      "vaccine_id": 3,
      "created_at": "2024-12-10T09:00:00"
    }
  ],
  "total_items": 1
}
```

## 🚀 Beneficios

1. **Experiencia de Usuario Mejorada:** Los usuarios pueden buscar de forma más intuitiva
2. **Búsqueda Completa:** No se limita a campos predefinidos
3. **Flexibilidad:** Soporta múltiples formatos y tipos de búsqueda
4. **Rendimiento:** Optimizado con índices de base de datos
5. **Consistencia:** Funciona de manera uniforme en todos los modelos
