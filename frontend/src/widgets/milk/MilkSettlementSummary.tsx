import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export interface MilkSettlement {
  numLiters: number;
  pricePerLiterGross: number;
  pricePerLiterNetPreTax: number;
  grossAmount: number;
  freightTotal: number;
  fomentoAmount: number;
  netAmount: number;
  finalPricePerLiter: number;
  totalBonusesPerLiter: number;
}

interface MilkSettlementSummaryProps {
  settlement: MilkSettlement;
  createFinancial: boolean;
  saving: boolean;
  onCreateFinancialChange: (value: boolean) => void;
}

export const MilkSettlementSummary: React.FC<MilkSettlementSummaryProps> = ({
  settlement,
  createFinancial,
  saving,
  onCreateFinancialChange,
}) => (
  <>
    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white space-y-3 shadow-lg shadow-emerald-600/20">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider opacity-90">Precio Liquidado / Litro</span>
          <h3 className="text-2xl font-black">${settlement.finalPricePerLiter.toLocaleString('es-CO')} COP/L</h3>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase font-extrabold tracking-wider opacity-90">Volumen Total</span>
          <p className="text-xl font-black">{settlement.numLiters.toLocaleString('es-CO')} L</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-b border-white/20 pb-2">
        <div>
          <span className="opacity-80 block text-[11px]">Valor Bruto</span>
          <span className="font-bold">${settlement.grossAmount.toLocaleString('es-CO')}</span>
        </div>
        <div>
          <span className="opacity-80 block text-[11px]">Flete Total</span>
          <span className="font-bold">-${settlement.freightTotal.toLocaleString('es-CO')}</span>
        </div>
        <div>
          <span className="opacity-80 block text-[11px]">Fomento (0.75%)</span>
          <span className="font-bold">-${settlement.fomentoAmount.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-black uppercase tracking-wider">💰 Total Neto a Recibir:</span>
        <span className="text-2xl sm:text-3xl font-black">${settlement.netAmount.toLocaleString('es-CO')} COP</span>
      </div>
    </div>

    <label className="flex items-center gap-2 cursor-pointer pt-1">
      <input
        type="checkbox"
        checked={createFinancial}
        onChange={(event) => onCreateFinancialChange(event.target.checked)}
        className="w-4 h-4 rounded text-emerald-600"
      />
      <span className="text-xs font-bold text-foreground">Registrar automáticamente como ingreso en el módulo financiero de la finca</span>
    </label>

    <Button
      type="submit"
      disabled={saving || settlement.numLiters <= 0}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3.5 text-base font-black shadow-lg shadow-emerald-600/20"
    >
      {saving ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Procesando Liquidación...
        </>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Aprobar y Registrar Liquidación
        </span>
      )}
    </Button>
  </>
);
