import React, { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Scale,
  Pill,
  Syringe,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';

interface AnimalFinancesTabProps {
  animal: any;
  treatments: any[];
  vaccinations: any[];
  milkRecords?: any[];
  formatDate?: (dateStr: string) => string;
}

export const AnimalFinancesTab: React.FC<AnimalFinancesTabProps> = ({
  animal,
  treatments,
  vaccinations,
  milkRecords = [],
}) => {
  // Precios de referencia del sector ganadero colombiano
  const PRICE_PER_KG_LIVE = 8800; // $8.800 COP / kg peso en pie
  const PRICE_PER_LITER_MILK = 2150; // $2.150 COP / litro
  const AVG_TREATMENT_COST = 45000; // $45.000 COP promedio insumos por tratamiento
  const AVG_VACCINE_COST = 18000; // $18.000 COP dosis biológico promedio

  const financeMetrics = useMemo(() => {
    const currentWeight = Number(animal.weight) || 0;
    const liveWeightValue = Math.round(currentWeight * PRICE_PER_KG_LIVE);

    // Ingreso por leche
    const totalMilkLiters = milkRecords.reduce((acc, r) => acc + (Number(r.liters) || 0), 0);
    const milkIncome = Math.round(totalMilkLiters * PRICE_PER_LITER_MILK);

    // Costo de compra o adquisición
    const purchaseCost = Number(animal.purchase_price) || (currentWeight > 0 ? Math.round(currentWeight * 0.5 * PRICE_PER_KG_LIVE) : 0);

    // Costos sanitarios
    const treatmentCosts = treatments.length * AVG_TREATMENT_COST;
    const vaccineCosts = vaccinations.length * AVG_VACCINE_COST;
    const totalSanitaryCosts = treatmentCosts + vaccineCosts;

    // Costos totales acumulados
    const totalCosts = purchaseCost + totalSanitaryCosts;
    const totalIncome = liveWeightValue + milkIncome;
    const netProfit = totalIncome - totalCosts;
    const roiPercentage = totalCosts > 0 ? ((netProfit / totalCosts) * 100).toFixed(1) : '0';

    return {
      currentWeight,
      liveWeightValue,
      totalMilkLiters: totalMilkLiters.toFixed(1),
      milkIncome,
      purchaseCost,
      treatmentCosts,
      vaccineCosts,
      totalSanitaryCosts,
      totalCosts,
      totalIncome,
      netProfit,
      roiPercentage,
    };
  }, [animal.weight, animal.purchase_price, milkRecords, treatments.length, vaccinations.length]);

  return (
    <div className="space-y-4">
      {/* 4 KPIs Financieros Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Valoración en Pie</span>
            <Scale className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums fit-clamp">
            ${financeMetrics.liveWeightValue.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            {financeMetrics.currentWeight} kg a ${PRICE_PER_KG_LIVE.toLocaleString('es-CO')}/kg
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>Ingresos Totales</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums fit-clamp">
            ${financeMetrics.totalIncome.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            Carne (${financeMetrics.liveWeightValue.toLocaleString('es-CO')}) + Leche (${financeMetrics.milkIncome.toLocaleString('es-CO')})
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <span>Costos Acumulados</span>
            <Wallet className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums fit-clamp">
            ${financeMetrics.totalCosts.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            Sanidad (${financeMetrics.totalSanitaryCosts.toLocaleString('es-CO')}) + Base (${financeMetrics.purchaseCost.toLocaleString('es-CO')})
          </p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3.5 space-y-1',
            financeMetrics.netProfit >= 0
              ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Margen ROI Ganadero</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums fit-clamp">
            +{financeMetrics.roiPercentage}%
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            Utilidad Neta: ${financeMetrics.netProfit.toLocaleString('es-CO')} COP
          </p>
        </div>
      </div>

      {/* Balance y Desglose Económico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Desglose de Ingresos */}
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 p-4 sm:p-5 shadow-sm space-y-3 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Fuentes de Ingreso y Valor
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">Activos generados</p>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              ${financeMetrics.totalIncome.toLocaleString('es-CO')}
            </span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground">Valor del Animal en Pie</span>
                <p className="text-[11px] text-muted-foreground">
                  {financeMetrics.currentWeight} kg × ${PRICE_PER_KG_LIVE.toLocaleString('es-CO')}
                </p>
              </div>
              <span className="font-black text-foreground">
                ${financeMetrics.liveWeightValue.toLocaleString('es-CO')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground">Producción de Leche Acumulada</span>
                <p className="text-[11px] text-muted-foreground">
                  {financeMetrics.totalMilkLiters} L × ${PRICE_PER_LITER_MILK.toLocaleString('es-CO')}
                </p>
              </div>
              <span className="font-black text-foreground">
                ${financeMetrics.milkIncome.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>

        {/* Desglose de Gastos e Inversión */}
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 p-4 sm:p-5 shadow-sm space-y-3 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Costos e Inversión Sanitaria
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">Gastos operativos</p>
              </div>
            </div>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
              ${financeMetrics.totalCosts.toLocaleString('es-CO')}
            </span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground">Medicamentos y Tratamientos</span>
                  <p className="text-[11px] text-muted-foreground">{treatments.length} aplicaciones</p>
                </div>
              </div>
              <span className="font-black text-foreground">
                ${financeMetrics.treatmentCosts.toLocaleString('es-CO')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground">Biológicos y Vacunas ICA</span>
                  <p className="text-[11px] text-muted-foreground">{vaccinations.length} dosis aplicadas</p>
                </div>
              </div>
              <span className="font-black text-foreground">
                ${financeMetrics.vaccineCosts.toLocaleString('es-CO')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <div>
                  <span className="font-bold text-foreground">Costo de Adquisición / Base</span>
                  <p className="text-[11px] text-muted-foreground">Inversión inicial registrada</p>
                </div>
              </div>
              <span className="font-black text-foreground">
                ${financeMetrics.purchaseCost.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
