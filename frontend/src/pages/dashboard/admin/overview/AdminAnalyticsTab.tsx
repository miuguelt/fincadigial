import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Map, FileText } from 'lucide-react';

interface AnalyticsCardItem {
  title: string;
  description: string;
  icon: typeof BarChart3;
  path: string;
  color: string;
  hoverColor: string;
  stats: { primary: string; secondary: string } | null;
}

interface AdminAnalyticsTabProps {
  dashboardStats: any;
  isLoading: boolean;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ dashboardStats, isLoading }) => {
  const navigate = useNavigate();

  const analyticsCards: AnalyticsCardItem[] = [
    {
      title: 'Dashboard Ejecutivo',
      description: 'Vista completa de métricas, KPIs, gráficos y alertas del sistema',
      icon: BarChart3,
      path: '/admin/analytics/executive',
      color: 'bg-gradient-to-br from-info to-indigo-700 shadow-info-500/10',
      hoverColor: 'hover:shadow-info/30',
      stats: dashboardStats ? {
        primary: `${dashboardStats.animales_registrados?.valor || 0} Animales`,
        secondary: `${dashboardStats.alertas_sistema?.valor || 0} Alertas`
      } : null
    },
    {
      title: 'Análisis de Potreros',
      description: 'Ocupación, capacidad y distribución de animales en potreros',
      icon: Map,
      path: '/admin/analytics/fields',
      color: 'bg-gradient-to-br from-success to-teal-700 shadow-success-500/10',
      hoverColor: 'hover:shadow-success/30',
      stats: dashboardStats ? {
        primary: `${dashboardStats.campos_registrados?.valor || 0} Potreros`,
        secondary: 'Ver distribución'
      } : null
    },
    {
      title: 'Reportes',
      description: 'Centraliza y genera todos los reportes de tu finca desde un solo lugar',
      icon: FileText,
      path: '/admin/reports',
      color: 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/10',
      hoverColor: 'hover:shadow-purple/30',
      stats: null
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary flex items-center">
        <div className="w-1.5 h-5 bg-primary rounded-full mr-2" />
        Módulos de Inteligencia de Negocio
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {analyticsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(card.path)}
              className={`group relative overflow-hidden h-56 sm:h-64 ${card.color} text-white rounded-xl p-6 sm:p-8 text-left transition-all duration-300 shadow-lg hover:shadow-2xl ${card.hoverColor} hover:scale-[1.02] hover:-translate-y-1 active:scale-95 border border-white/10`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/10">
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  {card.stats && !isLoading && (
                    <div className="text-right px-3 py-1.5 sm:px-4 sm:py-2 bg-black/15 backdrop-blur-md rounded-lg border border-white/10">
                      <p className="text-xs sm:text-sm font-bold">{card.stats.primary}</p>
                      <p className="text-[11px] sm:text-[11px] uppercase tracking-widest opacity-70">{card.stats.secondary}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black mb-1 sm:mb-2 leading-tight tracking-tight">{card.title}</h3>
                  <p className="text-xs sm:text-sm opacity-85 line-clamp-2 mb-3 sm:mb-4">{card.description}</p>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-widest">
                    <span>Explorar</span>
                    <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
