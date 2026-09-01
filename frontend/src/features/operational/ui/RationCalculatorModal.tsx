import React, { useState } from 'react';
import { Minus, Plus, TrendingUp } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/ui/cn';

interface RationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RationCalculatorModal: React.FC<RationCalculatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [animalCount, setAnimalCount] = useState<number>(20);
  const [avgWeight, setAvgWeight] = useState<number>(450);
  const [percentage, setPercentage] = useState<number>(2.0);
  const [dailyGrams, setDailyGrams] = useState<number>(100);
  const [calcType, setMode] = useState<'concentrate' | 'salt'>('concentrate');

  const totalLiveWeight = animalCount * avgWeight;
  const resultDailyKg =
    calcType === 'concentrate'
      ? totalLiveWeight * (percentage / 100)
      : (animalCount * dailyGrams) / 1000;
  const monthlyKg = resultDailyKg * 30;
  const bagsCountMonthly = Math.ceil(monthlyKg / 40);

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Calculadora Zootécnica de Raciones"
      subtitle="Optimización de Concentrados y Sales Mineralizadas"
      description="Calcula el requerimiento diario y mensual de suplementación según peso vivo y tamaño del lote."
      size="lg"
    >
      <div className="space-y-4 py-1">
        <div className="flex gap-2 p-1 bg-muted/60 rounded-xl border border-border/50">
          <button
            type="button"
            onClick={() => setMode('concentrate')}
            className={cn(
              'flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
              calcType === 'concentrate'
                ? 'bg-card shadow-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>🥣</span>
            <span>Concentrados y Balanceados</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('salt')}
            className={cn(
              'flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
              calcType === 'salt'
                ? 'bg-card shadow-xs text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>🧂</span>
            <span>Sales Mineralizadas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-card rounded-xl border border-border/50 space-y-2">
            <Label className="text-xs font-bold text-foreground">Número de Animales</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
                onClick={() => setAnimalCount(Math.max(1, animalCount - 5))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="number"
                min="1"
                value={animalCount}
                onChange={(e) => setAnimalCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 text-center text-sm font-bold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
                onClick={() => setAnimalCount(animalCount + 5)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="p-3 bg-card rounded-xl border border-border/50 space-y-2">
            <Label className="text-xs font-bold text-foreground">Peso Promedio por Bovino (kg)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
                onClick={() => setAvgWeight(Math.max(50, avgWeight - 25))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="number"
                min="50"
                step="10"
                value={avgWeight}
                onChange={(e) => setAvgWeight(Math.max(50, parseInt(e.target.value) || 450))}
                className="h-8 text-center text-sm font-bold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
                onClick={() => setAvgWeight(avgWeight + 25)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-muted/30 rounded-xl border border-border/40 space-y-2">
          {calcType === 'concentrate' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Tasa de Suministro (% del Peso Vivo):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {percentage}% PV ({((avgWeight * percentage) / 100).toFixed(2)} kg/vaca/día)
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-muted-foreground">
                Recomendación: 1% para suplementación moderada, 2-3% para lechería de alta producción o ceba intensiva.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Consumo Esperado de Sal Mineralizada:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  {dailyGrams} g / animal / día
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="200"
                step="5"
                value={dailyGrams}
                onChange={(e) => setDailyGrams(parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-muted-foreground">
                Estándar colombiano: 80 - 100 g/día en ganado adulto; 120 - 150 g/día en vacas de alta producción lechera.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-2xl border border-emerald-500/20 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Resultados del Requerimiento Nutricional
          </h4>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-background/80 rounded-xl border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Diario Total</span>
              <p className="text-lg font-black text-foreground">{resultDailyKg.toFixed(1)} kg</p>
              <span className="text-[10px] text-muted-foreground">Por día</span>
            </div>

            <div className="p-2.5 bg-background/80 rounded-xl border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Mensual Total</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{monthlyKg.toFixed(0)} kg</p>
              <span className="text-[10px] text-muted-foreground">30 días</span>
            </div>

            <div className="p-2.5 bg-background/80 rounded-xl border border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Bultos (40kg)</span>
              <p className="text-lg font-black text-foreground">{bagsCountMonthly} bultos</p>
              <span className="text-[10px] text-muted-foreground">Sugeridos/mes</span>
            </div>
          </div>
        </div>
      </div>
    </GenericModal>
  );
};
export default RationCalculatorModal;