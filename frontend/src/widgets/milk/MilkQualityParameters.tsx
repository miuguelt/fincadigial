import React from 'react';
import { ShieldCheck, Snowflake, Truck } from 'lucide-react';

type UfcGrade = 'high' | 'medium' | 'low';

interface MilkQualityParametersProps {
  basePrice: string;
  solidsBonus: string;
  ufcGrade: UfcGrade;
  certifiedHerd: boolean;
  coldTank: boolean;
  freightDeduction: string;
  applyFomento: boolean;
  onBasePriceChange: (value: string) => void;
  onSolidsBonusChange: (value: string) => void;
  onUfcGradeChange: (value: UfcGrade) => void;
  onCertifiedHerdChange: (value: boolean) => void;
  onColdTankChange: (value: boolean) => void;
  onFreightDeductionChange: (value: string) => void;
  onApplyFomentoChange: (value: boolean) => void;
}

const PRESET_BASE_PRICES = [1750, 1850, 1950, 2050, 2150];
const inputClassName = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-black';

export const MilkQualityParameters: React.FC<MilkQualityParametersProps> = ({
  basePrice,
  solidsBonus,
  ufcGrade,
  certifiedHerd,
  coldTank,
  freightDeduction,
  applyFomento,
  onBasePriceChange,
  onSolidsBonusChange,
  onUfcGradeChange,
  onCertifiedHerdChange,
  onColdTankChange,
  onFreightDeductionChange,
  onApplyFomentoChange,
}) => (
  <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Parámetros de Pago por Calidad ($ COP/L)</h4>

    <div className="grid grid-cols-2 gap-3">
      <label>
        <span className="block text-[11px] font-bold text-foreground mb-1">Precio Base ($/L)</span>
        <input
          type="number"
          value={basePrice}
          onChange={(event) => onBasePriceChange(event.target.value)}
          className={inputClassName}
          required
        />
      </label>
      <label>
        <span className="block text-[11px] font-bold text-foreground mb-1">Bonif. Sólidos/Grasa ($/L)</span>
        <input
          type="number"
          value={solidsBonus}
          onChange={(event) => onSolidsBonusChange(event.target.value)}
          className={inputClassName}
        />
      </label>
    </div>

    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Base común:</span>
      {PRESET_BASE_PRICES.map((price) => (
        <button
          key={price}
          type="button"
          onClick={() => onBasePriceChange(String(price))}
          className="px-2 py-0.5 rounded-md bg-muted text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          ${price}
        </button>
      ))}
    </div>

    <div>
      <label className="block text-[11px] font-bold text-foreground mb-1">Calidad Higiénica (UFC/ml):</label>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { value: 'high' as const, label: '< 100k UFC', detail: '+$35/L (Excelente)', active: 'bg-emerald-600' },
          { value: 'medium' as const, label: '100k-300k', detail: '$0/L (Normal)', active: 'bg-amber-600' },
          { value: 'low' as const, label: '> 300k UFC', detail: '-$40/L (Castigo)', active: 'bg-rose-600' },
        ].map((grade) => (
          <button
            key={grade.value}
            type="button"
            onClick={() => onUfcGradeChange(grade.value)}
            className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center ${
              ufcGrade === grade.value ? `${grade.active} text-white border-transparent` : 'bg-card border-border'
            }`}
          >
            <span>{grade.label}</span>
            <span className="text-[11px] opacity-90">{grade.detail}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-2 pt-1">
      <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border cursor-pointer">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Ganado libre de brucelosis y tuberculosis (+ $30/L)
        </span>
        <input
          type="checkbox"
          checked={certifiedHerd}
          onChange={(event) => onCertifiedHerdChange(event.target.checked)}
          className="w-4 h-4 rounded text-emerald-600"
        />
      </label>

      <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border cursor-pointer">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Snowflake className="w-4 h-4 text-cyan-600" />
          Bonificación por Tanque de Frío (+ $25/L)
        </span>
        <input
          type="checkbox"
          checked={coldTank}
          onChange={(event) => onColdTankChange(event.target.checked)}
          className="w-4 h-4 rounded text-cyan-600"
        />
      </label>

      <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-amber-600" />
          Deducción de Flete / Recolección ($/L):
        </span>
        <input
          type="number"
          value={freightDeduction}
          onChange={(event) => onFreightDeductionChange(event.target.value)}
          placeholder="80"
          className="w-20 px-2 py-1 rounded-lg border border-border bg-background text-xs font-bold text-right"
        />
      </div>

      <label className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border cursor-pointer">
        <span className="text-xs font-bold text-foreground">Deducir Cuota de Fomento Lechero (0.75% Fedegán/FNG)</span>
        <input
          type="checkbox"
          checked={applyFomento}
          onChange={(event) => onApplyFomentoChange(event.target.checked)}
          className="w-4 h-4 rounded text-primary"
        />
      </label>
    </div>
  </div>
);

export type { UfcGrade };
