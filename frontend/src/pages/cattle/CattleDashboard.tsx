import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  IconActivity, IconUsers, IconCalendar, IconTrendingUp, IconChevronRight, IconDownload, 
  IconFilter, IconPlus, IconInfoCircle, IconAward
} from '@/shared/ui/icons';
import { motion } from 'framer-motion';

// Mock data based on simulation logic
const FRAME_SCORE_DATA = [
  { name: 'Chica (1-3)', value: 15, color: '#f87171' },
  { name: 'Mediana (4-6)', value: 45, color: '#fbbf24' },
  { name: 'Grande (7-9)', value: 20, color: '#34d399' },
];

const BIRTH_TREND_DATA = [
  { month: 'Ene', births: 4 },
  { month: 'Feb', births: 7 },
  { month: 'Mar', births: 5 },
  { month: 'Abr', births: 12 },
  { month: 'May', births: 8 },
  { month: 'Jun', births: 15 },
];

const REPRODUCTIVE_STATUS = [
  { name: 'Vacias', value: 40, color: '#94a3b8' },
  { name: 'Preñadas', value: 35, color: '#60a5fa' },
  { name: 'En Celo', value: 10, color: '#f472b6' },
  { name: 'Lactantes', value: 15, color: '#fbbf24' },
];

const CattleDashboard: React.FC = () => {
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control Ganadero</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <IconCalendar size="sm" /> Mayo 6, 2026 • Finca Villa Luz
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 transition-all">
            <IconDownload size="sm" /> Exportar Datos
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold shadow-[var(--shadow-token-md)] hover:bg-primary/80 transition-all active:scale-95">
            <IconPlus size="sm" /> Nuevo Animal
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Hato', value: '142', sub: '+5 este mes', icon: IconUsers, color: 'bg-blue-50 text-blue-600' },
          { label: 'Preñez Promedio', value: '82%', sub: '+2% vs last yr', icon: IconActivity, color: 'bg-pink-50 text-pink-600' },
          { label: 'Frame Score Prom.', value: '5.4', sub: 'Categoría Mediana', icon: IconAward, color: 'bg-amber-50 text-amber-600' },
          { label: 'Eficiencia Partos', value: '94%', sub: 'Meta: 95%', icon: IconTrendingUp, color: 'bg-emerald-50 text-emerald-600' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-6 rounded-[var(--radius-xl)] shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-[var(--radius-lg)] ${stat.color}`}>
                <stat.icon size="lg" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Tendencia de Nacimientos</h3>
              <p className="text-sm text-slate-500">Histórico mensual de partos exitosos</p>
            </div>
            <select className="bg-slate-50 border-none rounded-lg text-xs font-bold p-2 focus:ring-2 focus:ring-emerald-500 outline-none">
              <option>Últimos 6 meses</option>
              <option>Año 2026</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={BIRTH_TREND_DATA}>
                <defs>
                  <linearGradient id="colorBirths" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="births" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorBirths)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frame Score Distribution */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800">Distribución Frame Score</h3>
            <p className="text-sm text-slate-500">Clasificación por tamaño estructural</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={FRAME_SCORE_DATA}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {FRAME_SCORE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {FRAME_SCORE_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-[var(--radius-full)]" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Repro Status */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
           <h3 className="text-xl font-bold text-slate-800 mb-6">Estado Reproductivo</h3>
           <div className="space-y-4">
              {REPRODUCTIVE_STATUS.map(status => (
                <div key={status.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-600">{status.name}</span>
                    <span className="font-bold text-slate-900">{status.value}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-[var(--radius-full)] h-2">
                    <div className="h-2 rounded-[var(--radius-full)] transition-all duration-1000" style={{ width: `${status.value}%`, backgroundColor: status.color }} />
                  </div>
                </div>
              ))}
           </div>
           <button className="w-full mt-8 flex items-center justify-center gap-2 text-primary font-bold text-sm hover:underline">
              Ver reporte detallado <IconChevronRight size="sm" />
           </button>
        </div>

        {/* Alerts / Tasks */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Alertas de Atención</h3>
            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-[var(--radius-full)] text-xs font-black uppercase tracking-widest">Críticas</span>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { id: 1, title: 'Chequeo de Preñez Pendiente', animal: 'HEM-1024', time: 'Hoy', priority: 'Alta' },
              { id: 2, title: 'Posible Celo Detectado (AI)', animal: 'HEM-1056', time: 'Hace 2h', priority: 'Media' },
              { id: 3, title: 'Bajo peso detectado en control', animal: 'CRIA-102-1', time: 'Ayer', priority: 'Baja' },
            ].map(alert => (
              <div key={alert.id} className="py-4 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-[var(--radius-full)] ${alert.priority === 'Alta' ? 'bg-danger-500' : alert.priority === 'Media' ? 'bg-warning-500' : 'bg-info-500'}`} />
                  <div>
                    <h4 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{alert.title}</h4>
                    <p className="text-xs text-slate-500">Animal: <span className="font-bold text-slate-700">{alert.animal}</span> • {alert.time}</p>
                  </div>
                </div>
                <IconChevronRight size="md" className="text-slate-300 group-hover:text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CattleDashboard;

