# 📊 Gráficos y Visualizaciones Recomendadas - VillaLuz

## Guía Visual para Implementación en Frontend

---

## 1. DASHBOARD EJECUTIVO

### Vista General
```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD EJECUTIVO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🐄       │  │ 💚       │  │ 🏥       │  │ 🔔       │      │
│  │ 450      │  │ 420      │  │ 95%      │  │ 8        │      │
│  │ Animales │  │ Vivos    │  │ Salud OK │  │ Alertas  │      │
│  │ +5.2%    │  │ +0%      │  │ +2.1%    │  │ +15%     │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  ┌────────────────────────┐  ┌────────────────────────┐       │
│  │ DISTRIBUCIÓN SEXO      │  │ TENDENCIA INVENTARIO   │       │
│  │                        │  │                        │       │
│  │      [GRÁFICO          │  │      [GRÁFICO          │       │
│  │       DE DONA]         │  │      DE LÍNEAS]        │       │
│  │                        │  │                        │       │
│  │ 🔵 Machos: 180        │  │  Últimos 12 meses     │       │
│  │ 🔴 Hembras: 240       │  │  📈 Nacimientos        │       │
│  └────────────────────────┘  │  📉 Muertes            │       │
│                              │  💰 Ventas             │       │
│  ┌─────────────────────────────────────────────────┐  │       │
│  │ ⚠️  ALERTAS CRÍTICAS                            │  │       │
│  ├─────────────────────────────────────────────────┤  │       │
│  │ 🚨 3 potreros sobrecargados                     │  │       │
│  │ ⚠️  5 animales sin control (>60 días)           │  │       │
│  │ 💉 2 animales sin vacunación reciente           │  │       │
│  └─────────────────────────────────────────────────┘  └───────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Endpoints necesarios:**
- `GET /api/analytics/dashboard/complete` → KPIs principales
- `GET /api/analytics/charts/animal-distribution` → Gráfico de dona
- `GET /api/analytics/animals/trends?months=12` → Gráfico de líneas
- `GET /api/analytics/alerts?priority=critical&limit=5` → Alertas

**Componentes React:**
```jsx
<Dashboard>
  <KPIRow>
    <KPICard title="Animales" value={450} change={5.2} icon="🐄" />
    <KPICard title="Vivos" value={420} change={0} icon="💚" />
    <KPICard title="Salud" value="95%" change={2.1} icon="🏥" />
    <KPICard title="Alertas" value={8} change={15} icon="🔔" color="red" />
  </KPIRow>

  <ChartRow>
    <DonutChart
      title="Distribución por Sexo"
      endpoint="/api/analytics/charts/animal-distribution"
      dataKey="by_sex"
    />
    <LineChart
      title="Tendencia de Inventario"
      endpoint="/api/analytics/animals/trends?months=12"
      series={['births', 'deaths', 'sales']}
    />
  </ChartRow>

  <AlertPanel
    endpoint="/api/analytics/alerts?priority=critical&limit=5"
  />
</Dashboard>
```

---

## 2. MÓDULO DE ANIMALES

### 2.1 Inventario y Demografía

#### Gráfico de Dona - Distribución por Sexo
```
      Distribución por Sexo
   ┌─────────────────────────┐
   │                         │
   │        ┌───┐            │
   │       ╱     ╲           │
   │      │  🔵   │          │
   │      │ 42%   │          │
   │       ╲     ╱           │
   │        └───┘            │
   │       ┌───┐             │
   │      │  🔴  │           │
   │      │ 58%  │           │
   │       └───┘             │
   │                         │
   │  🔵 Machos: 180 (42%)  │
   │  🔴 Hembras: 240 (58%) │
   └─────────────────────────┘
```

**Endpoint:** `GET /api/analytics/charts/animal-distribution`

**Chart.js Config:**
```javascript
{
  type: 'doughnut',
  data: {
    labels: ['Machos', 'Hembras'],
    datasets: [{
      data: [180, 240],
      backgroundColor: ['#3B82F6', '#EC4899'],
      borderWidth: 2
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} (${(context.parsed/420*100).toFixed(1)}%)`
        }
      }
    }
  }
}
```

---

#### Gráfico de Barras - Distribución por Raza
```
   Distribución por Raza (Top 5)
   ┌────────────────────────────┐
   │                            │
   │  Brahman  ████████████████ │ 150
   │  Angus    ████████████     │ 120
   │  Holstein ████████         │  85
   │  Simmental ██████          │  65
   │  Charolais ████            │  40
   │                            │
   └────────────────────────────┘
      0    50   100  150  200
```

**Endpoint:** `GET /api/analytics/animals/inventory`

**Chart.js Config:**
```javascript
{
  type: 'bar',
  data: {
    labels: data.by_breed.map(b => b.name),
    datasets: [{
      label: 'Número de Animales',
      data: data.by_breed.map(b => b.count),
      backgroundColor: '#10B981',
      borderRadius: 6
    }]
  },
  options: {
    indexAxis: 'y', // Barras horizontales
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { beginAtZero: true }
    }
  }
}
```

---

#### Pirámide Poblacional
```
        Pirámide Poblacional
   ┌──────────────────────────────┐
   │                              │
   │ 5+ años    20 │█│ 30          │
   │ 3-5 años   45 │██│ 67         │
   │ 2-3 años   35 │██│ 50         │
   │ 1-2 años   40 │███│ 45        │
   │ 6-12 meses 25 │██│ 30         │
   │ 0-6 meses  15 │█│ 18          │
   │                              │
   │  Machos ◄────┼────► Hembras  │
   │         80 60 40 20 0 20 40 60 80
   └──────────────────────────────┘
```

**Endpoint:** `GET /api/analytics/animals/age-pyramid`

**Chart.js Config:**
```javascript
{
  type: 'bar',
  data: {
    labels: ['0-6 meses', '6-12 meses', '1-2 años', '2-3 años', '3-5 años', '5+ años'],
    datasets: [
      {
        label: 'Machos',
        data: [-15, -25, -40, -35, -45, -20], // Negativo para lado izquierdo
        backgroundColor: '#3B82F6'
      },
      {
        label: 'Hembras',
        data: [18, 30, 45, 50, 67, 30],
        backgroundColor: '#EC4899'
      }
    ]
  },
  options: {
    indexAxis: 'y',
    scales: {
      x: {
        ticks: {
          callback: (value) => Math.abs(value) // Mostrar valores absolutos
        }
      }
    }
  }
}
```

---

### 2.2 Tendencias y Evolución

#### Gráfico de Líneas - Evolución del Inventario
```
   Evolución del Inventario (12 meses)
   ┌────────────────────────────────────┐
 15│                    ┌───●           │
   │               ┌────┘               │
 12│          ┌────┘                    │ 📈 Nacimientos
   │     ┌────┘                         │
  9│ ┌───┘                              │
   │                                    │
  6│ ───────●───●───●──────●────●──    │ 💰 Ventas
   │                                    │
  3│ ●─────────────────────────────    │ 📉 Muertes
   │                                    │
  0└────────────────────────────────────┘
     Ene Feb Mar Abr May Jun Jul Ago Sep
```

**Endpoint:** `GET /api/analytics/animals/trends?months=12`

**Chart.js Config:**
```javascript
{
  type: 'line',
  data: {
    labels: trends.map(t => t.month),
    datasets: [
      {
        label: 'Nacimientos',
        data: trends.map(t => t.births),
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Muertes',
        data: trends.map(t => t.deaths),
        borderColor: '#EF4444',
        tension: 0.4
      },
      {
        label: 'Ventas',
        data: trends.map(t => t.sales),
        borderColor: '#F59E0B',
        tension: 0.4
      }
    ]
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          footer: (items) => {
            const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
            return `Net: ${total}`;
          }
        }
      }
    }
  }
}
```

---

## 3. MÓDULO DE SALUD

### 3.1 Estado de Salud

#### Gráfico de Barras Apiladas - Distribución de Salud
```
   Estado de Salud del Hato
   ┌──────────────────────────────────┐
   │                                  │
 100│ ████████████████████████         │
   │ ████████████████████████         │
  80│ ████████████████████████         │
   │ ████████████████████████  ███    │
  60│ ████████████████████████  ███    │
   │ ████████████████████████  ███    │
  40│ ████████████████████████  ███    │
   │ ████████████████████████  ███  █ │
  20│ ████████████████████████  ███  █ │
   │                                  │
  0└──────────────────────────────────┘
     Excelente  Bueno  Sano  Regular Malo
        200      180    30      8      2
```

**Endpoint:** `GET /api/analytics/health/summary`

**Chart.js Config:**
```javascript
{
  type: 'bar',
  data: {
    labels: ['Estado de Salud'],
    datasets: [
      { label: 'Excelente', data: [200], backgroundColor: '#10B981' },
      { label: 'Bueno', data: [180], backgroundColor: '#3B82F6' },
      { label: 'Sano', data: [30], backgroundColor: '#8B5CF6' },
      { label: 'Regular', data: [8], backgroundColor: '#F59E0B' },
      { label: 'Malo', data: [2], backgroundColor: '#EF4444' }
    ]
  },
  options: {
    indexAxis: 'y',
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  }
}
```

---

### 3.2 Enfermedades

#### Gráfico de Barras - Top 10 Enfermedades
```
   Enfermedades Más Frecuentes
   ┌───────────────────────────────┐
   │                               │
   │  Mastitis      ████████████   │ 15
   │  Parasitosis   ██████████     │ 12
   │  Neumonía      ████████       │ 10
   │  Diarrea       ██████         │  8
   │  Cojera        ████           │  5
   │                               │
   └───────────────────────────────┘
```

**Endpoint:** `GET /api/analytics/health/diseases?months=12`

**Componente React:**
```jsx
<BarChart
  title="Top 10 Enfermedades"
  data={diseases.top_diseases}
  xKey="disease"
  yKey="cases"
  color="#EF4444"
/>
```

---

### 3.3 Vacunación

#### Gráfico de Barras Horizontales - Cobertura de Vacunación
```
   Cobertura de Vacunación
   ┌────────────────────────────────┐
   │                                │
   │ Fiebre Aftosa  ████████████ 95%│
   │ Rabia          ██████████   90%│
   │ Brucelosis     █████████    87%│
   │ Carbunco       ████████     82%│
   │ Clostridiales  ███████      75%│
   │                                │
   └────────────────────────────────┘
    0%  20%  40%  60%  80% 100%
```

**Endpoint:** `GET /api/analytics/health/vaccination-coverage`

**Chart.js Config:**
```javascript
{
  type: 'bar',
  data: {
    labels: coverage.coverage_by_vaccine.map(v => v.vaccine),
    datasets: [{
      label: 'Cobertura (%)',
      data: coverage.coverage_by_vaccine.map(v => v.coverage_percentage),
      backgroundColor: (context) => {
        const value = context.parsed.x;
        return value >= 90 ? '#10B981' :
               value >= 70 ? '#F59E0B' : '#EF4444';
      },
      borderRadius: 6
    }]
  },
  options: {
    indexAxis: 'y',
    scales: {
      x: { max: 100, ticks: { callback: (v) => v + '%' } }
    },
    plugins: {
      datalabels: {
        anchor: 'end',
        align: 'right',
        formatter: (value) => value + '%'
      }
    }
  }
}
```

---

## 4. MÓDULO DE CAMPOS/POTREROS

### 4.1 Ocupación

#### Heatmap - Ocupación por Potrero
```
   Mapa de Calor - Ocupación
   ┌─────────────────────────────────┐
   │ Potrero 1  ■■■■■■■■■■ 95%  🟢   │
   │ Potrero 2  ■■■■■■■■■■ 120% 🔴   │
   │ Potrero 3  ■■■■■      45%  🟡   │
   │ Potrero 4  ■■■■■■■■   78%  🟢   │
   │ Potrero 5  ■■■■■■■■■  85%  🟢   │
   │ Potrero 6  ■■         25%  🟡   │
   └─────────────────────────────────┘

    🟢 Normal  🟡 Subutilizado  🔴 Sobrecargado
```

**Endpoint:** `GET /api/analytics/fields/occupation`

**D3.js Implementation:**
```javascript
const color = d3.scaleLinear()
  .domain([0, 50, 100, 150])
  .range(['#FEF3C7', '#10B981', '#F59E0B', '#EF4444']);

fields.forEach(field => {
  const occupationRate = (field.occupied / field.capacity) * 100;
  // Renderizar barra con color según ocupación
});
```

---

### 4.2 Salud por Potrero

#### Mapa de Calor - Estado de Salud
```
   Estado de Salud por Potrero
   ┌───────────────────────────────────────┐
   │                Score │ Animales │ Enf │
   │ Potrero Norte   87%  │    45    │  2  │🟢
   │ Potrero Sur     92%  │    38    │  1  │🟢
   │ Potrero Este    65%  │    25    │  5  │🟡
   │ Potrero Oeste   45%  │    30    │  8  │🔴
   └───────────────────────────────────────┘
```

**Endpoint:** `GET /api/analytics/fields/health-map`

**React Component:**
```jsx
<FieldHealthTable
  data={healthMap}
  columns={[
    { key: 'field_name', label: 'Potrero' },
    { key: 'health_score', label: 'Score Salud', type: 'percentage' },
    { key: 'animal_count', label: 'Animales' },
    { key: 'active_diseases', label: 'Enfermedades' }
  ]}
  getRowColor={(row) => {
    if (row.health_score >= 80) return 'green';
    if (row.health_score >= 60) return 'yellow';
    return 'red';
  }}
/>
```

---

## 5. MÓDULO DE CRECIMIENTO

### 5.1 Curvas de Crecimiento

#### Gráfico de Líneas - Curvas por Raza
```
   Curvas de Crecimiento por Raza
   ┌────────────────────────────────────┐
600│                          ┌─────●   │ Brahman
   │                     ┌────┘         │
500│                ┌────┘              │
   │           ┌────┘                   │
400│      ┌────┘                    ●   │ Angus
   │ ┌────┘                      ┌──┘   │
300│─┘                      ┌────┘      │
   │                   ┌────┘           │
200│              ┌────┘                │
   │         ┌────┘                     │
100│    ┌────┘                          │
   │────┘                               │
  0└────────────────────────────────────┘
    0  6  12  18  24  30  36  42  48 (meses)
```

**Endpoint:** `GET /api/analytics/growth/curves`

**Chart.js Config:**
```javascript
{
  type: 'line',
  data: {
    datasets: growthData.map((breed, index) => ({
      label: breed.breed,
      data: breed.growth_curve.map(point => ({
        x: point.age_months,
        y: point.avg_weight
      })),
      borderColor: COLORS[index],
      tension: 0.4,
      pointRadius: 4
    }))
  },
  options: {
    scales: {
      x: { title: { display: true, text: 'Edad (meses)' } },
      y: { title: { display: true, text: 'Peso (kg)' } }
    }
  }
}
```

---

### 5.2 Ganancia Media Diaria

#### Gráfico de Barras - Ranking GMD
```
   Top 10 Mejor Ganancia Media Diaria
   ┌────────────────────────────────┐
   │ A125  ████████████████  1.25   │
   │ A089  ███████████████   1.18   │
   │ A234  ██████████████    1.12   │
   │ A156  █████████████     1.08   │
   │ A078  ████████████      1.02   │
   └────────────────────────────────┘
     0.0  0.5  1.0  1.5 (kg/día)
```

**Endpoint:** `GET /api/analytics/production/statistics`

**React Component:**
```jsx
<RankingChart
  title="Top 10 Mejor GMD"
  data={productionStats.best_performers}
  metric="daily_gain"
  label="record"
  unit="kg/día"
  color="#10B981"
/>
```

---

## 6. SISTEMA DE ALERTAS

### 6.1 Panel de Alertas

```
   ┌─────────────────────────────────────────┐
   │ 🚨 ALERTAS CRÍTICAS (5)                 │
   ├─────────────────────────────────────────┤
   │ ⚠️  Animal A012 sin control (65 días)   │ HIGH
   │ 🚨 Potrero Norte sobrecargado (120%)    │ CRITICAL
   │ 💉 Animal A025 sin vacunación (200d)    │ MEDIUM
   │ 📉 Animal A078 pérdida peso (-15%)      │ HIGH
   │ ⚠️  Animal A034 estado salud: Malo      │ HIGH
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ ⚠️  ALERTAS MEDIAS (15)                 │
   ├─────────────────────────────────────────┤
   │ 💊 12 animales en tratamiento >30 días  │
   │ 🏥 25 animales sin control (>30 días)   │
   │ 📊 GMD promedio bajo (0.42 kg/día)      │
   └─────────────────────────────────────────┘
```

**Endpoint:** `GET /api/analytics/alerts?limit=50`

**React Component:**
```jsx
<AlertPanel>
  <AlertSection priority="critical">
    {criticalAlerts.map(alert => (
      <AlertCard
        key={alert.id}
        icon={alert.icon}
        title={alert.title}
        message={alert.message}
        action={alert.action_required}
        color={alert.color}
        onAction={() => handleAlert(alert)}
      />
    ))}
  </AlertSection>

  <AlertSection priority="medium">
    {mediumAlerts.map(alert => (
      <AlertCard {...alert} />
    ))}
  </AlertSection>
</AlertPanel>
```

---

## 7. COMPONENTES REUSABLES

### KPI Card Component
```jsx
const KPICard = ({ title, value, change, icon, color = 'blue' }) => (
  <div className="kpi-card">
    <div className="kpi-header">
      <span className="kpi-icon">{icon}</span>
      <span className="kpi-title">{title}</span>
    </div>
    <div className="kpi-value">{value}</div>
    <div className={`kpi-change ${change >= 0 ? 'positive' : 'negative'}`}>
      {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
    </div>
  </div>
);
```

### Alert Card Component
```jsx
const AlertCard = ({ icon, title, message, action, color, onAction }) => (
  <div className={`alert-card alert-${color}`}>
    <div className="alert-icon">{icon}</div>
    <div className="alert-content">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onAction}>{action}</button>
    </div>
  </div>
);
```

---

## 8. PALETA DE COLORES RECOMENDADA

```
📊 Animales:
  - Machos:     #3B82F6 (Azul)
  - Hembras:    #EC4899 (Rosa)
  - Vivos:      #10B981 (Verde)
  - Muertos:    #EF4444 (Rojo)
  - Vendidos:   #F59E0B (Naranja)

🏥 Salud:
  - Excelente:  #10B981 (Verde)
  - Bueno:      #3B82F6 (Azul)
  - Sano:       #8B5CF6 (Púrpura)
  - Regular:    #F59E0B (Naranja)
  - Malo:       #EF4444 (Rojo)

🔔 Alertas:
  - Critical:   #DC2626 (Rojo Oscuro)
  - High:       #EF4444 (Rojo)
  - Medium:     #F59E0B (Naranja)
  - Low:        #3B82F6 (Azul)

🏞️ Ocupación:
  - < 50%:      #FEF3C7 (Amarillo Claro)
  - 50-100%:    #10B981 (Verde)
  - 100-120%:   #F59E0B (Naranja)
  - > 120%:     #EF4444 (Rojo)
```

---

## 9. MEJORES PRÁCTICAS

### ✅ Performance
- Usar lazy loading para gráficos no visibles
- Implementar caché en frontend (2-5 minutos)
- Usar virtualized lists para alertas largas
- Debounce en filtros y búsquedas

### ✅ UX
- Mostrar skeletons mientras cargan datos
- Incluir tooltips explicativos
- Permitir exportar gráficos como PNG/PDF
- Responsive design para móviles

### ✅ Accesibilidad
- Colores con suficiente contraste
- Textos alternativos para gráficos
- Navegación por teclado
- Soporte para lectores de pantalla

---

**Versión:** 1.0
**Última actualización:** 2025-10-15
