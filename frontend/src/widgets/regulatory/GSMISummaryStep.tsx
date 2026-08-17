import React from 'react';
import { ArrowLeft, Copy, Download } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { GSMIAnimalCategories } from './gsmI.types';

interface GSMISummaryStepProps {
  selectedAnimals: any[];
  totalSelectedWeight: number;
  categories: GSMIAnimalCategories;
  onCopy: () => void;
  onGeneratePdf: () => void;
  onBack: () => void;
}

export const GSMISummaryStep: React.FC<GSMISummaryStepProps> = ({
  selectedAnimals,
  totalSelectedWeight,
  categories,
  onCopy,
  onGeneratePdf,
  onBack,
}) => (
  <div className="space-y-4">
    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 space-y-3">
      <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/80 pb-2">
        <div>
          <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300">Resumen del Lote GSMI</span>
          <h3 className="text-xl font-black text-foreground">{selectedAnimals.length} Cabezas de Ganado</h3>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-muted-foreground">Peso Total en Báscula</span>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
            {totalSelectedWeight.toLocaleString('es-CO')} kg
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(categories).map(([category, data]) => {
          if (data.count === 0) return null;
          return (
            <div key={category} className="p-2 rounded-xl bg-card border border-border/70 text-xs space-y-0.5">
              <span className="text-[11px] font-bold text-muted-foreground block break-words">{category}</span>
              <p className="text-sm font-black text-foreground">
                {data.count} <small className="text-[11px] font-normal">({data.weightSum} kg)</small>
              </p>
            </div>
          );
        })}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCopy}
        className="rounded-2xl py-3 text-xs font-black flex items-center justify-center gap-2"
      >
        <Copy className="w-4 h-4 text-emerald-600" />
        Copiar {selectedAnimals.length} Chapetas (SIGMA)
      </Button>

      <Button
        type="button"
        onClick={onGeneratePdf}
        className="rounded-2xl py-3 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        Descargar Borrador GSMI (PDF)
      </Button>
    </div>

    <div className="flex justify-start">
      <Button type="button" variant="ghost" size="sm" onClick={onBack} className="text-xs font-bold">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Modificar Selección de Ganado
      </Button>
    </div>
  </div>
);
