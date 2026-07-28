import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
// importaciones removidas para cumplir con TS estricto
import {
  IconClipboardList,
} from '@/shared/ui/icons';
import {
  CloudAlert,
  Headset,
  Wifi,
  WifiOff,
  Plus,
  Sprout,
  ChevronRight,
  Leaf,
  Droplet,
  ShoppingBag,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckSquare,
  Search,
  X,
  Sun,
} from 'lucide-react';

import {
  IconMilk,
  IconRoute as IconRouteCattle,
  IconHealthAlert,
  IconHealthCheck,
  IconTag,
} from '@/shared/icons/cattle';

import { MiJornadaSection } from './components/MiJornadaSection';

const OFFLINE_STORAGE_KEY = 'campesino:pending_sync';

// Acciones rápidas — lo que el campesino hace TODOS LOS DÍAS
const QUICK_ACTIONS = [
  {
    id: 'new-labor',
    label: 'Registrar Labor',
    sublabel: 'Agricultura y ganadería',
    icon: IconClipboardList,
    path: '/campesino/registro-operativo',
    color: 'from-emerald-500 to-green-600',
    glow: 'shadow-emerald-200 dark:shadow-emerald-900',
    requiresOnline: false,
  },
  {
    id: 'new-milk',
    label: 'Registrar Ordeño',
    sublabel: 'Producción diaria',
    icon: IconMilk,
    path: '/campesino/registro-operativo?modal=milk',
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-200 dark:shadow-amber-900',
    requiresOnline: false,
  },
  {
    id: 'health-alert',
    label: 'Enfermedad',
    sublabel: 'Reportar síntomas',
    icon: IconHealthAlert,
    path: '/campesino/registro-operativo?modal=disease',
    color: 'from-rose-500 to-red-600',
    glow: 'shadow-rose-200 dark:shadow-rose-900',
    requiresOnline: false,
  },
];

// Herramientas del módulo campesino organizadas por dominio
const TOOL_GROUPS = [
  {
    title: ' Registro Operativo',
    color: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    tools: [
      { id: 'registro', title: 'Registro Unificado', description: 'Agricultura, ganadería y más', icon: IconClipboardList, path: '/campesino/registro-operativo', bg: 'bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700', emoji: '📋', requiresOnline: false },
      { id: 'milk', title: 'Registrar Ordeño', description: 'Producción diaria de leche', icon: IconMilk, path: '/campesino/registro-operativo?modal=milk', bg: 'bg-gradient-to-br from-amber-50/70 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700', emoji: '', requiresOnline: false },
      { id: 'transfer', title: 'Trasladar Ganado', description: 'Mover animales entre potreros', icon: IconRouteCattle, path: '/campesino/registro-operativo?modal=transfer', bg: 'bg-gradient-to-br from-orange-50/70 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/60 dark:border-orange-800/40 hover:border-orange-300 dark:hover:border-orange-700', emoji: '️', requiresOnline: false },
      { id: 'disease', title: 'Reportar Enfermedad', description: 'Avisar sobre animales enfermos', icon: IconHealthAlert, path: '/campesino/registro-operativo?modal=disease', bg: 'bg-gradient-to-br from-rose-50/70 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10 border-rose-200/60 dark:border-rose-800/40 hover:border-rose-300 dark:hover:border-rose-700', emoji: '', requiresOnline: false },
      { id: 'treatment', title: 'Aplicar Tratamiento', description: 'Registrar medicinas y vacunas', icon: IconHealthCheck, path: '/campesino/registro-operativo?modal=treatment', bg: 'bg-gradient-to-br from-purple-50/70 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/60 dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-700', emoji: '', requiresOnline: false },
    ]
  },
  {
    title: '🌱 Gestión de Cultivos',
    color: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800/40',
    tools: [
      { id: 'plots', title: 'Parcelas y Cultivos', description: 'Manejar lotes de cultivo', icon: Sprout, path: '/campesino/crop-plots', bg: 'bg-gradient-to-br from-green-50/70 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700', emoji: '', requiresOnline: false },
      { id: 'crop-activities', title: 'Labores de Cultivo', description: 'Siembra, riego, cosecha y plagas', icon: Leaf, path: '/campesino/crop-activities', bg: 'bg-gradient-to-br from-lime-50/70 to-lime-100/30 dark:from-lime-950/20 dark:to-lime-900/10 border-lime-200/60 dark:border-lime-800/40 hover:border-lime-300 dark:hover:border-lime-700', emoji: '', requiresOnline: false },
      { id: 'water', title: 'Fuentes de Agua', description: 'Quebradas, pozos, reservorios', icon: Droplet, path: '/campesino/water-sources', bg: 'bg-gradient-to-br from-cyan-50/70 to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10 border-cyan-200/60 dark:border-cyan-800/40 hover:border-cyan-300 dark:hover:border-cyan-700', emoji: '💧', requiresOnline: false },
    ]
  },
  {
    title: '⚙️ Servicios y Apoyo',
    color: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/40',
    tools: [
      { id: 'scanner', title: 'Escanear Chapeta', description: 'Identificar animal por orejera', icon: IconTag, path: '/scanner', bg: 'bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700', emoji: '🏷️', requiresOnline: false },
      { id: 'tasks', title: 'Agenda de Tareas', description: 'Ver qué tengo asignado hoy', icon: CheckSquare, path: '/operario/tasks', bg: 'bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/20 dark:to-sky-900/10 border-sky-200/60 dark:border-sky-800/40 hover:border-sky-300 dark:hover:border-sky-700', emoji: '📅', requiresOnline: false },
      { id: 'alerts', title: 'Alertas de Clima', description: 'Heladas, sequías y avisos', icon: CloudAlert, path: '/campesino/climate-alerts', bg: 'bg-gradient-to-br from-slate-50/70 to-slate-100/30 dark:from-slate-900/20 dark:to-slate-850/10 border-slate-200/60 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-750', emoji: '⛈️', requiresOnline: true },
      { id: 'market', title: 'Mercado Campesino', description: 'Vender o comprar productos', icon: ShoppingBag, path: '/campesino/market-offers', bg: 'bg-gradient-to-br from-fuchsia-50/70 to-fuchsia-100/30 dark:from-fuchsia-950/20 dark:to-fuchsia-900/10 border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:border-fuchsia-300 dark:hover:border-fuchsia-700', emoji: '🏪', requiresOnline: true },
      { id: 'assistance', title: 'Ayuda Técnica', description: 'Solicitar asesoría', icon: Headset, path: '/campesino/technical-assistance', bg: 'bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700', emoji: '‍🌾', requiresOnline: true },
    ]
  }
];

// Tips se cargan desde GET /intelligence/tips
const TIPS_FALLBACK = [
  { icon: '📱', text: 'Usa la app sin internet. Los datos se sincronizan cuando vuelva la señal.' },
  { icon: '🌱', text: 'Registra tus labores diarias para llevar trazabilidad de tu finca.' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '¡Buenos días!';
  if (hour < 18) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

function getTodayStr(): string {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

const CampesinoDashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [tips, setTips] = useState<any[]>(TIPS_FALLBACK);
  const [tipIdx, setTipIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    fetch('/api/v1/intelligence/tips')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) { setTips(data); setTipIdx(Math.floor(Math.random() * data.length)); } })
      .catch(() => {});
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        setPendingCount(Array.isArray(items) ? items.length : 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Filtrado de herramientas por término de búsqueda en tiempo real
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return TOOL_GROUPS;
    const term = searchTerm.toLowerCase().trim();
    return TOOL_GROUPS.map(group => {
      const matchingTools = group.tools.filter(tool => 
        tool.title.toLowerCase().includes(term) || 
        tool.description.toLowerCase().includes(term) ||
        (tool.emoji && tool.emoji.includes(term))
      );
      return { ...group, tools: matchingTools };
    }).filter(group => group.tools.length > 0);
  }, [searchTerm]);

  const tip = tips.length > 0 ? tips[tipIdx % tips.length] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-background to-emerald-50/30 dark:from-green-950/20 dark:via-background dark:to-emerald-950/10 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        {/* ── HEADER: Bienvenida + estado ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 via-green-600 to-lime-500 p-8 md:p-12 text-white shadow-2xl shadow-green-200/50 dark:shadow-green-950/50 flex flex-col md:flex-row md:items-center justify-between gap-8 border border-white/10"
        >
          {/* Decoración de fondo animada */}
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-32 pointer-events-none" />
          <div className="absolute right-32 bottom-0 w-64 h-64 bg-lime-400/20 rounded-full blur-3xl translate-y-20 pointer-events-none" />
          <Leaf className="absolute right-12 bottom-8 w-48 h-48 text-white/10 rotate-12 pointer-events-none mix-blend-overlay" />

          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md shadow-inner">
                <Sun className="w-4 h-4 text-lime-100" />
              </span>
              <p className="text-emerald-50 text-sm font-bold uppercase tracking-widest">{getTodayStr()}</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-md">
              {getGreeting()} 👋
            </h1>
            <p className="text-emerald-50 text-base md:text-lg lg:text-xl font-medium leading-relaxed max-w-xl opacity-95">
              Bienvenido a tu Módulo Campesino. El panel central diseñado para que lleves el control de tu finca de la forma más sencilla y rápida.
            </p>
          </div>

          <div className="relative z-10 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-5 shrink-0 bg-black/10 backdrop-blur-xl p-6 rounded-xl border border-white/10 shadow-inner w-full md:w-auto">
            <div className="flex flex-col gap-1.5 items-start md:items-end w-full">
              <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1 hidden md:block">Estado de Conexión</p>
              {isOnline ? (
                <span className="flex items-center gap-2.5 text-sm bg-white/20 px-5 py-2.5 rounded-lg font-bold backdrop-blur-md shadow-sm w-full md:w-auto justify-center md:justify-start">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400"></span>
                  </span>
                  Sistema en línea
                </span>
              ) : (
                <span className="flex items-center gap-2.5 text-sm bg-red-500/40 px-5 py-2.5 rounded-lg font-bold backdrop-blur-md border border-red-500/30 shadow-sm text-red-50 w-full md:w-auto justify-center md:justify-start">
                  <WifiOff className="w-4 h-4" /> Sin señal
                </span>
              )}
            </div>
            
            <div className="flex flex-col gap-2 items-end w-full">
              {isOnline && pendingCount > 0 && (
                <span className="flex items-center gap-2 text-xs bg-amber-400/30 px-4 py-2 rounded-xl font-semibold border border-amber-400/20 shadow-sm text-amber-50 w-full md:w-auto justify-center md:justify-start">
                  <Clock className="w-4 h-4" /> {pendingCount} registros por sincronizar
                </span>
              )}
              {isOnline && pendingCount === 0 && (
                <span className="flex items-center gap-2 text-xs bg-white/10 px-4 py-2 rounded-xl font-semibold border border-white/5 shadow-sm text-emerald-100 w-full md:w-auto justify-center md:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Datos al día
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── AVISO OFFLINE ───────────────────────────────────── */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm"
            >
              <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-bold text-amber-900 dark:text-amber-300 text-base mb-1">Trabajando sin conexión a internet</p>
                <p className="text-amber-800/80 dark:text-amber-400/80 text-sm md:text-base">
                  No te preocupes. Puedes seguir registrando todas tus labores con tranquilidad. Todo se guarda automáticamente en tu dispositivo y se enviará al servidor en cuanto recuperes la señal. 📶
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BUSCADOR DE HERRAMIENTAS ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative max-w-3xl mx-auto"
        >
          <div className="relative flex items-center w-full bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/50 rounded-full shadow-lg hover:shadow-xl transition-all duration-500 px-6 py-4 group">
            <Search className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300 mr-4 shrink-0" />
            <input
              type="text"
              placeholder="¿Qué labor vas a realizar hoy? (ej. ordeño, registrar, parcela...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-base md:text-lg text-foreground placeholder:text-muted-foreground/60 focus:ring-0 p-0 font-medium"
              aria-label="Buscar herramienta o labor"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/20 ml-2"
                title="Limpiar búsqueda"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* ── MI JORNADA: alertas críticas y altas del día ── */}
        {searchTerm.trim() === '' && <MiJornadaSection />}

        {/* ── ACCIONES RÁPIDAS (Solo se muestran si no hay búsqueda activa) ── */}
        {searchTerm.trim() === '' && (
          <section className="pt-4">
            <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="bg-muted-foreground/10 p-1.5 rounded-lg"><Plus className="w-4 h-4" /></span> 
              Acciones Rápidas Diarias
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4, type: 'spring', stiffness: 100 }}
                    whileHover={{ scale: 1.02, translateY: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(action.path)}
                    className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${action.color} p-6 md:p-8 text-white shadow-xl ${action.glow} flex items-center text-left gap-6 transition-all cursor-pointer border-0 group`}
                  >
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Icon className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold leading-tight mb-1">{action.label}</h3>
                      <p className="text-sm md:text-base text-white/80 font-medium">{action.sublabel}</p>
                    </div>
                    {/* Flecha indicadora */}
                    <div className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                      <ChevronRight className="w-6 h-6 text-white/50" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── TODAS LAS HERRAMIENTAS POR DOMINIO ──────────────────────────── */}
        <section className="space-y-12 pt-4">
          {filteredGroups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-card/40 backdrop-blur-sm border-2 border-dashed border-border/60 rounded-[2rem] px-6 shadow-sm"
            >
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg md:text-xl font-bold text-foreground mb-2">No encontramos herramientas para tu búsqueda</p>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">Prueba con palabras como "ordeño", "parcela", "enfermedad" o "clima".</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
              >
                Ver todas las herramientas
              </button>
            </motion.div>
          ) : (
            filteredGroups.map((group, groupIdx) => (
              <div key={group.title} className="space-y-6">
                <h2 className={`text-lg md:text-xl font-extrabold uppercase tracking-wider flex items-center gap-3 ${group.color} border-b ${group.border} pb-4`}>
                  {group.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {group.tools.map((tool, i) => {
                    const ToolIcon = tool.icon;
                    return (
                      <motion.button
                        key={tool.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + (groupIdx * 0.1) + (i * 0.05), duration: 0.4 }}
                        whileHover={{ scale: 1.03, translateY: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(tool.path)}
                        className={`w-full flex flex-col p-6 rounded-[2rem] border-2 ${tool.bg} text-left transition-all duration-300 hover:shadow-xl hover:shadow-${group.color.split('-')[1]}-500/10 cursor-pointer relative overflow-hidden group bg-card/50 backdrop-blur-md`}
                      >
                        <div className="flex items-start justify-between w-full mb-5">
                          {/* Icono Temático */}
                          <div className="w-14 h-14 rounded-lg bg-white/80 dark:bg-black/20 flex items-center justify-center text-3xl shadow-sm relative transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-5deg]">
                            {tool.emoji}
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-background rounded-full p-1 shadow-sm border border-border/20">
                               <ToolIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                          </div>
                          
                          {/* Badge Inteligente de Señal */}
                          {tool.requiresOnline ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 shadow-sm">
                              <Wifi className="w-3 h-3" /> Con red
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm">
                              <WifiOff className="w-3 h-3" /> Sin red OK
                            </span>
                          )}
                        </div>

                        {/* Textos */}
                        <div className="flex-1 mt-auto">
                          <p className={`font-extrabold text-base md:text-lg mb-1 ${group.color} transition-colors duration-300`}>{tool.title}</p>
                          <p className="text-sm text-muted-foreground/90 font-medium leading-relaxed">{tool.description}</p>
                        </div>
                        
                        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 bg-white/50 dark:bg-black/20 p-2 rounded-full">
                          <ChevronRight className={`w-5 h-5 ${group.color}`} />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── CONSEJO DEL DÍA ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="rounded-[2.5rem] bg-gradient-to-r from-lime-500/10 via-green-500/10 to-emerald-500/10 dark:from-lime-500/20 dark:via-green-500/20 dark:to-emerald-500/20 backdrop-blur-xl border-2 border-green-500/20 dark:border-green-800/40 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 mt-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="bg-white/50 dark:bg-black/20 w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-sm relative">
              <span className="text-4xl animate-bounce" style={{ animationDuration: '3s' }}>{tip?.icon || '💡'}</span>
            </div>
            <div className="text-center md:text-left flex-1">
              <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Consejo Útil del Día
              </p>
              <p className="text-base md:text-lg text-green-900 dark:text-green-100 leading-relaxed font-semibold max-w-4xl">{tip?.text || 'Usa la app sin internet. Los datos se sincronizan cuando vuelva la señal.'}</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default CampesinoDashboard;

