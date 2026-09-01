import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Syringe, TrendingUp, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import type { VaccinationMonthlyPoint, VaccinationSummary } from './vaccinationAnalytics';
import VaccinationCharts from './VaccinationCharts';

interface VaccinationAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: VaccinationMonthlyPoint[];
  summary: VaccinationSummary;
  loading: boolean;
  error: boolean;
}

export const VaccinationAnalyticsModal: React.FC<VaccinationAnalyticsModalProps> = ({
  isOpen,
  onClose,
  series,
  summary,
  loading,
  error,
}) => {
  const navigate = useNavigate();

  const handleNavigateToAnalytics = () => {
    onClose();
    navigate('/admin/treatments/analytics');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl w-[95vw] sm:w-[90vw] p-0 overflow-hidden bg-background border border-border/80 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header Premium con gradiente esmeralda */}
        <DialogHeader className="px-5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-900 border-b border-emerald-600/30 text-white shrink-0 relative">
          <div className="flex items-center gap-3 pr-8">
            <div className="p-2.5 rounded-xl bg-white/10 text-white backdrop-blur-md shadow-inner shrink-0">
              <Syringe className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Análisis y Tendencias de Vacunación
              </DialogTitle>
              <DialogDescription className="text-emerald-100/90 text-xs font-medium mt-0.5">
                Evolución mensual, meses de mayor actividad y control sanitario del ganado · Finca Villa Luz
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Fila de Resumen Rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/15">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Total 12 Meses
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground mt-0.5 block">
                {summary.periodTotal}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Dosis administradas
              </span>
            </div>

            <div className="p-3 bg-sky-500/5 dark:bg-sky-950/30 rounded-xl border border-sky-500/15">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Promedio Mes
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground mt-0.5 block">
                {summary.averagePerMonth}
              </span>
              <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                Dosis / mes
              </span>
            </div>

            <div className="p-3 bg-purple-500/5 dark:bg-purple-950/30 rounded-xl border border-purple-500/15">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Mes con Mayor Actividad
              </span>
              <span className="text-lg sm:text-xl font-black text-foreground mt-0.5 block fit-clamp">
                {summary.peakMonth ? `${summary.peakMonth.label} (${summary.peakMonth.count})` : '—'}
              </span>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                Pico de vacunación
              </span>
            </div>

            <div className="p-3 bg-amber-500/5 dark:bg-amber-950/30 rounded-xl border border-amber-500/15">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Meses Activos
              </span>
              <span className="text-xl sm:text-2xl font-black text-foreground mt-0.5 block">
                {summary.activeMonths} / 12
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                Con registros
              </span>
            </div>
          </div>

          {/* Gráficos Recharts */}
          <div className="rounded-xl border border-border/60 bg-card/40 p-2 sm:p-3">
            <VaccinationCharts
              series={series}
              loading={loading}
              error={error}
              peakMonth={summary.peakMonth}
            />
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-muted/40 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Cerrar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNavigateToAnalytics}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Ver Reportes Clínicos Completos</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VaccinationAnalyticsModal;
