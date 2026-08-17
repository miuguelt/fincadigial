import React, { useCallback, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModalWrapper } from '@/widgets/registro-operativo/modals/ModalWrapper';
import { milkService } from '@/entities/milk/api/milk.service';
import { financialService } from '@/entities/financial/api/financial.service';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { MilkQualityParameters, UfcGrade } from './MilkQualityParameters';
import { MilkSettlement, MilkSettlementSummary } from './MilkSettlementSummary';

interface LiquidacionLecheModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LiquidacionLecheModal: React.FC<LiquidacionLecheModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [periodType, setPeriodType] = useState<'q1' | 'q2' | 'month'>('q1');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [liters, setLiters] = useState('3000');
  const [loadingLiters, setLoadingLiters] = useState(false);
  const [buyer, setBuyer] = useState('Alquería / Quesería Local');
  const [basePrice, setBasePrice] = useState('1850');
  const [solidsBonus, setSolidsBonus] = useState('50');
  const [ufcGrade, setUfcGrade] = useState<UfcGrade>('high');
  const [certifiedHerd, setCertifiedHerd] = useState(true);
  const [coldTank, setColdTank] = useState(true);
  const [freightDeduction, setFreightDeduction] = useState('80');
  const [applyFomento, setApplyFomento] = useState(true);
  const [createFinancial, setCreateFinancial] = useState(true);
  const [saving, setSaving] = useState(false);

  const dateRange = useMemo(() => {
    const pad = (value: number) => String(value).padStart(2, '0');
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const monthName = getMonthName(month);

    if (periodType === 'q1') {
      return {
        from: `${year}-${pad(month)}-01`,
        to: `${year}-${pad(month)}-15`,
        label: `1ra Quincena de ${monthName} ${year}`,
      };
    }
    if (periodType === 'q2') {
      return {
        from: `${year}-${pad(month)}-16`,
        to: `${year}-${pad(month)}-${lastDayOfMonth}`,
        label: `2da Quincena de ${monthName} ${year}`,
      };
    }
    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${lastDayOfMonth}`,
      label: `Mes Completo de ${monthName} ${year}`,
    };
  }, [periodType, month, year]);

  const loadPeriodLiters = useCallback(async () => {
    setLoadingLiters(true);
    try {
      const response = await milkService.getAll({
        date_from: dateRange.from,
        date_to: dateRange.to,
        limit: 1000,
      });
      const items = (response as any)?.data ?? (response as any)?.items ?? response ?? [];
      if (Array.isArray(items) && items.length > 0) {
        const totalLiters = items.reduce((sum: number, row: any) => sum + (Number(row.liters) || 0), 0);
        setLiters(String(Math.round(totalLiters)));
        showToast(`Cargados ${totalLiters.toFixed(1)} L del periodo`, 'info');
      } else {
        showToast('No se encontraron registros de ordeño en ese periodo', 'warning');
      }
    } catch (error) {
      console.warn('No se pudieron cargar litros automáticamente:', error);
    } finally {
      setLoadingLiters(false);
    }
  }, [dateRange, showToast]);

  const settlement = useMemo<MilkSettlement>(() => {
    const numLiters = Number(liters) || 0;
    const numBasePrice = Number(basePrice) || 0;
    const numSolids = Number(solidsBonus) || 0;
    const ufcBonus = ufcGrade === 'high' ? 35 : ufcGrade === 'low' ? -40 : 0;
    const sanitaryBonus = certifiedHerd ? 30 : 0;
    const tankBonus = coldTank ? 25 : 0;
    const freight = Number(freightDeduction) || 0;
    const pricePerLiterGross = Math.max(0, numBasePrice + numSolids + ufcBonus + sanitaryBonus + tankBonus);
    const pricePerLiterNetPreTax = Math.max(0, pricePerLiterGross - freight);
    const grossAmount = Math.round(numLiters * pricePerLiterGross);
    const freightTotal = Math.round(numLiters * freight);
    const fomentoAmount = applyFomento ? Math.round(grossAmount * 0.0075) : 0;
    const netAmount = Math.max(0, grossAmount - freightTotal - fomentoAmount);
    const finalPricePerLiter = numLiters > 0 ? Math.round((netAmount / numLiters) * 10) / 10 : 0;

    return {
      numLiters,
      pricePerLiterGross,
      pricePerLiterNetPreTax,
      grossAmount,
      freightTotal,
      fomentoAmount,
      netAmount,
      finalPricePerLiter,
      totalBonusesPerLiter: numSolids + ufcBonus + sanitaryBonus + tankBonus,
    };
  }, [
    liters,
    basePrice,
    solidsBonus,
    ufcGrade,
    certifiedHerd,
    coldTank,
    freightDeduction,
    applyFomento,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (settlement.numLiters <= 0) {
      showToast('Ingrese un volumen de litros válido', 'error');
      return;
    }

    setSaving(true);
    try {
      if (createFinancial && settlement.netAmount > 0) {
        await financialService.create({
          transaction_type: 'Ingreso',
          category: 'Venta de Leche',
          amount: settlement.netAmount,
          date: getTodayColombia(),
          description: `Liquidación Leche ${dateRange.label} (${settlement.numLiters.toLocaleString('es-CO')} L a $${settlement.finalPricePerLiter}/L neto) - ${buyer}`,
        });
      }
      showToast(
        `🎉 ¡Liquidación guardada! ${settlement.numLiters.toLocaleString('es-CO')} L por $${settlement.netAmount.toLocaleString('es-CO')} COP`,
        'success',
      );
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error al guardar liquidación de leche:', error);
      showToast('Error al procesar la liquidación de leche', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="🥛 Liquidación Quincenal de Leche">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-muted/60 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-foreground">Periodo de Entrega:</label>
            <div className="flex items-center gap-1">
              {[
                { value: 'q1' as const, label: '1ra Quincena (1-15)' },
                { value: 'q2' as const, label: '2da Quincena (16-fin)' },
                { value: 'month' as const, label: 'Mes' },
              ].map((period) => (
                <button
                  key={period.value}
                  type="button"
                  onClick={() => setPeriodType(period.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    periodType === period.value ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-card text-muted-foreground'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="block text-[11px] font-bold text-muted-foreground mb-1">Mes</span>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>{getMonthName(value)}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-[11px] font-bold text-muted-foreground mb-1">Año</span>
              <input
                type="number"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold"
              />
            </label>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border-2 border-cyan-200 dark:border-cyan-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-cyan-900 dark:text-cyan-200 uppercase">Volumen Entregado (Litros)</label>
            <button
              type="button"
              onClick={loadPeriodLiters}
              disabled={loadingLiters}
              className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 hover:underline flex items-center gap-1"
            >
              {loadingLiters ? <Loader2 className="w-3 h-3 animate-spin" /> : '⚡ Cargar Litros del Ordeño'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              value={liters}
              onChange={(event) => setLiters(event.target.value)}
              placeholder="Ej: 3500"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-cyan-300 dark:border-cyan-700 bg-background text-xl font-black text-foreground"
              required
            />
            <span className="text-sm font-black text-cyan-900 dark:text-cyan-300">Litros</span>
          </div>
          <label>
            <span className="block text-[11px] font-bold text-muted-foreground mb-1">Empresa / Comprador</span>
            <input
              type="text"
              value={buyer}
              onChange={(event) => setBuyer(event.target.value)}
              placeholder="Ej: Alquería, Colanta, Parmalat, Quesería Don Pedro"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
            />
          </label>
        </div>

        <MilkQualityParameters
          basePrice={basePrice}
          solidsBonus={solidsBonus}
          ufcGrade={ufcGrade}
          certifiedHerd={certifiedHerd}
          coldTank={coldTank}
          freightDeduction={freightDeduction}
          applyFomento={applyFomento}
          onBasePriceChange={setBasePrice}
          onSolidsBonusChange={setSolidsBonus}
          onUfcGradeChange={setUfcGrade}
          onCertifiedHerdChange={setCertifiedHerd}
          onColdTankChange={setColdTank}
          onFreightDeductionChange={setFreightDeduction}
          onApplyFomentoChange={setApplyFomento}
        />

        <MilkSettlementSummary
          settlement={settlement}
          createFinancial={createFinancial}
          saving={saving}
          onCreateFinancialChange={setCreateFinancial}
        />
      </form>
    </ModalWrapper>
  );
};

function getMonthName(month: number) {
  const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return names[month - 1] || 'Mes';
}
