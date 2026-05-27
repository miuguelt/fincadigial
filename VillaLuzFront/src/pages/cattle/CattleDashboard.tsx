import React, { useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  IconActivity, IconUsers, IconCalendar, IconTrendingUp, IconChevronRight, IconDownload, 
  IconPlus, IconAward
} from '@/shared/ui/icons';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';

const FRAME_SCORE_DATA = [
  { name: 'Pequeño', value: 15, color: '#10b981' },
  { name: 'Mediano', value: 45, color: '#3b82f6' },
  { name: 'Grande', value: 40, color: '#8b5cf6' },
];
const BIRTH_TREND_DATA = [
  { month: 'Ene', births: 12 },
  { month: 'Feb', births: 19 },
  { month: 'Mar', births: 15 },
  { month: 'Abr', births: 22 },
  { month: 'May', births: 30 },
  { month: 'Jun', births: 25 },
];
const REPRODUCTIVE_STATUS = [
  { name: 'Gestantes', value: 65, color: '#10b981' },
  { name: 'Vacias', value: 25, color: '#f59e0b' },
  { name: 'En Celo', value: 10, color: '#ef4444' },
];

const CattleDashboard: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 bg-secondary/30 min-h-screen font-sans text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 px-2">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
            Panel de Control Ganadero
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
            <IconCalendar size="sm" className="text-primary" /> Mayo 6, 2026 • <span className="text-foreground/80">Finca Villa Luz</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-card/50 backdrop-blur-md border border-white/10 px-6 py-3 rounded-lg text-sm font-bold shadow-xl hover:bg-card/80 transition-all hover:scale-105 active:scale-95">
            <IconDownload size="sm" /> Exportar
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-black shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
            <IconPlus size="sm" /> Nuevo Animal
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-8">
        {[
          { id: 'hatos', label: 'Total Hato', value: '1,240', sub: '+12 este mes', icon: IconUsers, color: 'text-primary' },
          { id: 'preñez', label: 'Preñez Promedio', value: '84%', sub: 'Meta: 85%', icon: IconActivity, color: 'text-rose-500' },
          { id: 'frame', label: 'Frame Score', value: '5.2', sub: 'Estado: Óptimo', icon: IconAward, color: 'text-amber-500' },
          { id: 'eficiencia', label: 'Eficiencia', value: '92%', sub: 'Ranking A+', icon: IconTrendingUp, color: 'text-emerald-500' },
        ].map((stat) => (
          <Card 
            key={stat.id}
            selected={selectedCard === stat.id}
            onClick={() => setSelectedCard(selectedCard === stat.id ? null : stat.id)}
            className="cursor-pointer group"
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-lg bg-white/5 border border-white/10 ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size="lg" />
                </div>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-70">{stat.label}</span>
              </div>
              <div>
                <h3 className="text-4xl font-black text-foreground tracking-tighter">{stat.value}</h3>
                <p className="text-sm font-bold text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {stat.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 mb-10">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 overflow-visible" selected={selectedCard === 'trend'} onClick={() => setSelectedCard(selectedCard === 'trend' ? null : 'trend')}>
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-2">
            <div>
              <CardTitle className="text-2xl font-black">Tendencia de Nacimientos</CardTitle>
              <p className="text-sm text-muted-foreground font-bold">Histórico mensual de partos</p>
            </div>
            <select className="bg-white/5 border border-white/10 rounded-xl text-xs font-black p-3 outline-none focus:ring-2 focus:ring-primary">
              <option>Últimos 6 meses</option>
              <option>Año 2026</option>
            </select>
          </CardHeader>
          <CardContent className="p-8 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={BIRTH_TREND_DATA}>
                <defs>
                  <linearGradient id="colorBirths" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)' }}
                  itemStyle={{ fontWeight: 'black', color: '#10b981' }}
                />
                <Area type="monotone" dataKey="births" stroke="#10b981" strokeWidth={5} fillOpacity={1} fill="url(#colorBirths)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Frame Score Distribution */}
        <Card className="flex flex-col" selected={selectedCard === 'frame-dist'} onClick={() => setSelectedCard(selectedCard === 'frame-dist' ? null : 'frame-dist')}>
          <CardHeader className="p-8 pb-0">
            <CardTitle className="text-2xl font-black">Frame Score</CardTitle>
            <p className="text-sm text-muted-foreground font-bold">Distribución estructural</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-8 pt-4">
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={FRAME_SCORE_DATA}
                    innerRadius={75}
                    outerRadius={95}
                    paddingAngle={10}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {FRAME_SCORE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-6">
              {FRAME_SCORE_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}44` }} />
                    <span className="text-sm font-bold text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Repro Status */}
        <Card selected={selectedCard === 'repro'} onClick={() => setSelectedCard(selectedCard === 'repro' ? null : 'repro')}>
           <CardHeader className="p-8">
             <CardTitle className="text-2xl font-black mb-1">Estado Reproductivo</CardTitle>
             <p className="text-sm text-muted-foreground font-bold">Resumen de fertilidad hato</p>
           </CardHeader>
           <CardContent className="p-8 pt-0 space-y-6">
              {REPRODUCTIVE_STATUS.map(status => (
                <div key={status.name} className="group cursor-pointer">
                  <div className="flex justify-between text-sm mb-2 px-1">
                    <span className="font-bold text-muted-foreground group-hover:text-foreground transition-colors">{status.name}</span>
                    <span className="font-black text-foreground">{status.value}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${status.value}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full shadow-lg" 
                      style={{ backgroundColor: status.color, boxShadow: `0 0 15px ${status.color}33` }} 
                    />
                  </div>
                </div>
              ))}
              <button className="w-full mt-4 flex items-center justify-center gap-2 text-primary font-black text-sm py-4 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all group">
                Ver Reporte Completo <IconChevronRight size="sm" className="group-hover:translate-x-1 transition-transform" />
              </button>
           </CardContent>
        </Card>

        {/* Alerts / Tasks */}
        <Card className="lg:col-span-2" selected={selectedCard === 'alerts'} onClick={() => setSelectedCard(selectedCard === 'alerts' ? null : 'alerts')}>
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <div>
              <CardTitle className="text-2xl font-black">Alertas de Atención</CardTitle>
              <p className="text-sm text-muted-foreground font-bold">Eventos críticos detectados</p>
            </div>
            <span className="bg-destructive/10 text-destructive px-4 py-1.5 rounded-full text-xs font-black ring-1 ring-destructive/20 animate-pulse">CRÍTICAS</span>
          </CardHeader>
          <CardContent className="p-8 pt-0 divide-y divide-white/5">
            {[
              { id: 1, title: 'Chequeo de Preñez Pendiente', animal: 'HEM-1024', time: 'Hoy', priority: 'Alta', color: 'bg-rose-500' },
              { id: 2, title: 'Posible Celo Detectado (AI)', animal: 'HEM-1056', time: 'Hace 2h', priority: 'Media', color: 'bg-amber-500' },
              { id: 3, title: 'Bajo peso detectado en control', animal: 'CRIA-102-1', time: 'Ayer', priority: 'Baja', color: 'bg-blue-500' },
            ].map(alert => (
              <motion.div 
                whileHover={{ x: 10 }}
                key={alert.id} 
                className="py-5 flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-3 h-3 rounded-full ${alert.color} shadow-lg ring-4 ring-white/5`} />
                  <div>
                    <h4 className="font-black text-lg text-foreground group-hover:text-primary transition-colors">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      Animal: <span className="text-foreground font-black">{alert.animal}</span> • <span className="opacity-70">{alert.time}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md bg-white/5 border border-white/10 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity`}>Prioridad {alert.priority}</span>
                  <IconChevronRight size="md" className="text-muted-foreground/30 group-hover:text-primary transition-all" />
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CattleDashboard;

