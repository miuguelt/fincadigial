import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HeartPulse, 
  ShieldAlert, 
  Activity, 
  Pill, 
  Syringe, 
  Layers, 
  Calendar,
  TrendingUp,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface TabGroup {
  title: string;
  items: TabItem[];
}

export const SANIDAD_TAB_GROUPS: Record<string, TabGroup> = {
  cases: {
    title: "Casos Clínicos y Diagnósticos",
    items: [
      { id: 'disease-animals', label: 'Animales Enfermos', path: '/admin/disease-animals', icon: <ShieldAlert className="w-4 h-4" /> },
      { id: 'diseases', label: 'Catálogo de Enfermedades', path: '/admin/diseases', icon: <HeartPulse className="w-4 h-4" /> },
    ]
  },
  treatments: {
    title: "Registro de Tratamientos",
    items: [
      { id: 'analytics', label: 'Estadísticas y Reportes', path: '/admin/treatments/analytics', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'treatments', label: 'Tratamientos Generales', path: '/admin/treatments', icon: <Activity className="w-4 h-4" /> },
      { id: 'treatment-medications', label: 'Tratamiento (Medicamentos)', path: '/admin/treatment_medications', icon: <Pill className="w-4 h-4" /> },
      { id: 'treatment-vaccines', label: 'Tratamiento (Vacunas)', path: '/admin/treatment_vaccines', icon: <Syringe className="w-4 h-4" /> },
      { id: 'vaccinations', label: 'Vacunaciones Registradas', path: '/admin/vaccinations', icon: <Calendar className="w-4 h-4" /> },
    ]
  },
  supplies: {
    title: "Medicamentos e Insumos",
    items: [
      { id: 'medications', label: 'Medicamentos', path: '/admin/medications', icon: <Pill className="w-4 h-4" /> },
      { id: 'vaccines', label: 'Vacunas', path: '/admin/vaccines', icon: <Syringe className="w-4 h-4" /> },
      { id: 'inventory', label: 'Inventario de Insumos', path: '/admin/inventory', icon: <Layers className="w-4 h-4" /> },
    ]
  }
};

export const SanidadTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine which group is active
  let activeGroupId = 'cases';
  let activeTabId = '';

  for (const [groupId, group] of Object.entries(SANIDAD_TAB_GROUPS)) {
    const found = group.items.find(item => currentPath.startsWith(item.path));
    if (found) {
      activeGroupId = groupId;
      activeTabId = found.id;
      break;
    }
  }

  const activeGroup = SANIDAD_TAB_GROUPS[activeGroupId];

  return (
    <div className="space-y-4 mb-5">
      {/* Selector Principal de Secciones - Estilo Premium Glassmorphic */}
      <div className="flex flex-wrap gap-3 pb-3 border-b border-white/5 dark:border-white/5">
        {Object.entries(SANIDAD_TAB_GROUPS).map(([groupId, group]) => {
          const isActiveGroup = activeGroupId === groupId;
          const firstItemPath = group.items[0].path;

          return (
            <button
              key={groupId}
              onClick={() => navigate(firstItemPath)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm border transform hover:scale-[1.02] hover:-translate-y-[1px] active:scale-[0.97] ${
                isActiveGroup
                  ? 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 text-white border-emerald-500/30 shadow-[0_4px_12px_rgba(16,185,129,0.25)] font-extrabold'
                  : 'bg-card/45 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-card/85 border-border/30 hover:border-border/60 hover:shadow-md'
              }`}
            >
              {groupId === 'cases' && <ShieldAlert className={`w-4 h-4 transition-transform duration-300 ${isActiveGroup ? 'scale-110 text-emerald-100' : 'text-emerald-500'}`} />}
              {groupId === 'treatments' && <Activity className={`w-4 h-4 transition-transform duration-300 ${isActiveGroup ? 'scale-110 text-emerald-100' : 'text-emerald-500'}`} />}
              {groupId === 'supplies' && <Layers className={`w-4 h-4 transition-transform duration-300 ${isActiveGroup ? 'scale-110 text-emerald-100' : 'text-emerald-500'}`} />}
              <span>{groupId === 'cases' ? 'Casos Clínicos' : groupId === 'treatments' ? 'Tratamientos' : 'Insumos y Catálogos'}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tabs con cristal translúcido, bordes luminosos y micro-animaciones */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-lg bg-card/25 backdrop-blur-md border border-border/25 shadow-inner">
        {activeGroup.items.map((tab) => {
          const isActive = activeTabId === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 transform active:scale-[0.97] ${
                isActive
                  ? 'bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02] border border-border/50 bg-gradient-to-b from-white to-slate-50/80 dark:from-slate-800 dark:to-slate-900/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/45 hover:scale-[1.01]'
              }`}
            >
              <span className={`transition-transform duration-300 ${isActive ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'opacity-70 text-emerald-600/70 dark:text-emerald-400/70'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
