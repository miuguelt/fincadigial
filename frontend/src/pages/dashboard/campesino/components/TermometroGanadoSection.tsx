import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Scale,
  Sprout,
  Milk,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ModuleHeading } from '@/widgets/layout/ModuleHeading';
import { useCampesinoEstadisticas } from '../estadisticas/hooks/useCampesinoEstadisticas';

export const TermometroGanadoSection: React.FC = () => {
  const navigate = useNavigate();
  const {
    isLoading,
    healthGauge,
    weightStats,
    fieldStats,
    milkStats,
  } = useCampesinoEstadisticas();

  if (isLoading) {
    return (
      <div className="h-44 rounded-2xl bg-card border border-border/70 animate-pulse p-6" />
    );
  }

  return (
    <Card className="border-border/70 shadow-sm" premium hoverable={false}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <ModuleHeading
          title="Termómetro y Rendimiento de la Finca"
          description="Semáforo de salud animal, engorde y rotación de pasturas en tiempo real"
          icon={<HeartPulse className="h-5 w-5 text-white" />}
          headingLevel="h2"
          titleClassName="text-base sm:text-lg"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/campesino/estadisticas')}
          className="gap-1 text-xs"
        >
          <span>Ver detalle</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Termómetro de Salud */}
          <button
            type="button"
            onClick={() => navigate('/campesino/estadisticas?tab=termometro')}
            className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary min-h-[120px]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Salud del ganado
              </span>
              <span className="text-lg font-black text-primary">
                {healthGauge.value !== null ? `${healthGauge.value}%` : '—'}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
              <div
                style={{ width: `${healthGauge.value ?? 0}%` }}
                className="h-full bg-primary rounded-full transition-all duration-500"
              />
            </div>
            <p className="text-xs font-semibold text-foreground fit-clamp">
              {healthGauge.statusLabel}
            </p>
          </button>

          {/* Oscilador Engorde (ADG) */}
          <button
            type="button"
            onClick={() => navigate('/campesino/estadisticas?tab=engorde_leche')}
            className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary min-h-[120px]"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Engorde (ADG)
              </span>
              <div className="p-1 rounded-md bg-muted/50 text-muted-foreground">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-foreground">
              {weightStats.adgGrams !== null ? (weightStats.adgGrams > 0 ? `+${weightStats.adgGrams}` : weightStats.adgGrams) : '—'}{' '}
              <span className="text-xs font-normal text-muted-foreground">g/día</span>
            </p>
            <p className={`text-xs font-semibold fit-clamp ${weightStats.adgStatusColor}`}>
              {weightStats.adgStatusLabel}
            </p>
          </button>

          {/* Carga de Potreros */}
          <button
            type="button"
            onClick={() => navigate('/campesino/estadisticas?tab=potreros')}
            className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary min-h-[120px]"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pastoreo y Carga
              </span>
              <div className="p-1 rounded-md bg-muted/50 text-muted-foreground">
                <Sprout className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-foreground">
              {fieldStats.utilizationPercent !== null ? `${Math.round(fieldStats.utilizationPercent)}%` : '—'}{' '}
              <span className="text-xs font-normal text-muted-foreground">ocupación</span>
            </p>
            <p className="text-xs font-semibold text-muted-foreground fit-clamp">
              {fieldStats.restingFields} potreros en descanso
            </p>
          </button>

          {/* Producción de Leche */}
          <button
            type="button"
            onClick={() => navigate('/campesino/estadisticas?tab=engorde_leche')}
            className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/60 p-4 text-left shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary min-h-[120px]"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ordeño Promedio
              </span>
              <div className="p-1 rounded-md bg-muted/50 text-muted-foreground">
                <Milk className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-foreground">
              {milkStats.avgLitersPerCow !== null ? milkStats.avgLitersPerCow : '—'}{' '}
              <span className="text-xs font-normal text-muted-foreground">L / vaca</span>
            </p>
            <p className="text-xs font-semibold text-foreground/80 fit-clamp">
              {milkStats.trendLabel}
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
