import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Map, Milk, Scale, Users, CalendarCheck } from 'lucide-react';
import { ExecutiveIntelligence } from '@/widgets/dashboard/ExecutiveIntelligence';
import DailyFarmGuide from '@/widgets/dashboard/DailyFarmGuide';
import UpcomingEventsPanel from '@/widgets/dashboard/UpcomingEventsPanel';

export const AdminOverviewTab: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      label: 'Ganado',
      sub: 'Inventario',
      icon: Heart,
      path: '/admin/animals',
      color: 'text-primary',
      bgHover: 'hover:border-primary hover:bg-primary/5',
      iconBg: 'bg-primary/10 text-primary'
    },
    {
      label: 'Potreros',
      sub: 'Rotación',
      icon: Map,
      path: '/admin/fields',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgHover: 'hover:border-emerald-500 hover:bg-emerald-500/5',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      label: 'Ordeño',
      sub: 'Reg. Leche',
      icon: Milk,
      path: '/quick/milk',
      color: 'text-blue-600 dark:text-blue-400',
      bgHover: 'hover:border-blue-500 hover:bg-blue-500/5',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Pesaje',
      sub: 'Ganancia ADG',
      icon: Scale,
      path: '/quick/control',
      color: 'text-amber-600 dark:text-amber-400',
      bgHover: 'hover:border-amber-500 hover:bg-amber-500/5',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    },
    {
      label: 'Personal',
      sub: 'Roles & Equipo',
      icon: Users,
      path: '/admin/users',
      color: 'text-purple-600 dark:text-purple-400',
      bgHover: 'hover:border-purple-500 hover:bg-purple-500/5',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Fincas',
      sub: 'Sedes activas',
      icon: CalendarCheck,
      path: '/admin/fincas',
      color: 'text-teal-600 dark:text-teal-400',
      bgHover: 'hover:border-teal-500 hover:bg-teal-500/5',
      iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Panel de Inteligencia Ejecutiva (Salud e Índice Vital) */}
      <ExecutiveIntelligence />

      {/* Guía del Día + Próximos Eventos en Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyFarmGuide />
        <UpcomingEventsPanel />
      </div>

      {/* Accesos de Gestión y Registro Rápido */}
      <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center">
            <div className="w-1.5 h-5 bg-primary rounded-full mr-2" />
            Accesos Directos y Registro Rápido
          </h2>
          <span className="text-xs font-semibold text-text-secondary hidden sm:inline">
            Acciones operativas frecuentes
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`group p-3.5 sm:p-4 bg-background border border-border/80 rounded-xl ${action.bgHover} active:scale-95 transition-all text-center flex flex-col items-center min-h-[88px] justify-center`}
              >
                <div className={`w-10 h-10 mb-2 rounded-xl flex items-center justify-center ${action.iconBg} transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-text-primary">{action.label}</span>
                <span className="text-[11px] text-text-secondary mt-0.5">{action.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
