import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, DollarSign, Skull, AlertOctagon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from '@/widgets/registro-operativo/modals/ModalWrapper';
import { AnimalSelect } from '@/widgets/registro-operativo/components/AnimalSelect';
import { animalsService } from '@/entities/animal/api/animal.service';
import { financialService } from '@/entities/financial/api/financial.service';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export type ExitType = 'sale' | 'death' | 'discard';

interface AnimalExitModalProps {
  open: boolean;
  onClose: () => void;
  animal?: any;
  animals?: any[];
  onSuccess?: () => void;
}

const SALE_PRESETS = [7500, 8000, 8500, 9000, 9500, 10000];

const DEATH_CAUSES = [
  'Enfermedad infecciosa (Carbón / Neumonía / Anaplasmosis)',
  'Timpanismo / Meteorismo ruminal',
  'Mordedura de serpiente / Envenenamiento',
  'Accidente en potrero / Cañada / Alambrado',
  'Parto distócico / Complicación reproductiva',
  'Muerte súbita / Causa desconocida',
  'Paro cardiorrespiratorio',
];

const DISCARD_REASONS = [
  'Problemas reproductivos / Vaca horra',
  'Mastitis crónica / Pérdida de cuarto mamario',
  'Problemas de aplomos / Pezuñas / Claudicación',
  'Vejez productiva / Desgaste dental',
  'Baja ganancia de peso / Conversión deficiente',
  'Temperamento agresivo / Inmanejable',
];

export const AnimalExitModal: React.FC<AnimalExitModalProps> = ({
  open,
  onClose,
  animal: initialAnimal,
  animals = [],
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>(initialAnimal?.id ? String(initialAnimal.id) : '');
  const [exitType, setExitType] = useState<ExitType>('sale');
  const [date, setDate] = useState<string>(getTodayColombia());
  const [saving, setSaving] = useState<boolean>(false);

  // Venta fields
  const [saleMode, setSaleMode] = useState<'weight' | 'head'>('weight');
  const [weightKg, setWeightKg] = useState<string>('');
  const [pricePerKg, setPricePerKg] = useState<string>('8500');
  const [totalPriceHead, setTotalPriceHead] = useState<string>('3500000');
  const [buyer, setBuyer] = useState<string>('');
  const [createFinancial, setCreateFinancial] = useState<boolean>(true);

  // Muerte fields
  const [deathCause, setDeathCause] = useState<string>(DEATH_CAUSES[0]);
  const [necropsy, setNecropsy] = useState<boolean>(false);
  const [disposalMethod, setDisposalMethod] = useState<string>('Entierro profundo con cal');
  const [deathNotes, setDeathNotes] = useState<string>('');

  // Descarte fields
  const [discardReason, setDiscardReason] = useState<string>(DISCARD_REASONS[0]);
  const [discardDestination, setDiscardDestination] = useState<string>('Venta de descarte / Frigorífico');
  const [discardPrice, setDiscardPrice] = useState<string>('2000000');

  // Animal actual seleccionado
  const currentAnimal = useMemo(() => {
    if (initialAnimal) return initialAnimal;
    if (!selectedAnimalId) return null;
    return animals.find((a) => String(a.id) === String(selectedAnimalId)) || null;
  }, [initialAnimal, selectedAnimalId, animals]);

  // Precargar peso del animal al seleccionarlo
  useEffect(() => {
    if (currentAnimal?.weight) {
      setWeightKg(String(Math.round(currentAnimal.weight)));
    }
  }, [currentAnimal]);

  // Calcular precio total de venta
  const calculatedSaleTotal = useMemo(() => {
    if (saleMode === 'weight') {
      const kg = Number(weightKg) || 0;
      const price = Number(pricePerKg) || 0;
      return Math.round(kg * price);
    }
    return Number(totalPriceHead) || 0;
  }, [saleMode, weightKg, pricePerKg, totalPriceHead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnimal) {
      showToast('Seleccione un animal para registrar la salida', 'error');
      return;
    }

    setSaving(true);
    try {
      let exitReason = '';
      let statusToSet: 'Vendido' | 'Muerto' = 'Vendido';
      let financialAmount = 0;
      let financialDesc = '';

      if (exitType === 'sale') {
        statusToSet = 'Vendido';
        financialAmount = calculatedSaleTotal;
        exitReason = `Venta comercial: ${saleMode === 'weight' ? `${weightKg} kg a $${pricePerKg}/kg` : 'Por cabeza'} ($${calculatedSaleTotal.toLocaleString('es-CO')} COP)${buyer ? ` - Comprador: ${buyer}` : ''}`;
        financialDesc = `Venta animal ${currentAnimal.record || currentAnimal.id} (${saleMode === 'weight' ? `${weightKg} kg` : 'Por cabeza'})${buyer ? ` - ${buyer}` : ''}`;
      } else if (exitType === 'death') {
        statusToSet = 'Muerto';
        exitReason = `Muerte en predio: ${deathCause}. Necropsia: ${necropsy ? 'Sí' : 'No'}. Disposición: ${disposalMethod}.${deathNotes ? ` Obs: ${deathNotes}` : ''}`;
      } else if (exitType === 'discard') {
        statusToSet = 'Vendido';
        financialAmount = Number(discardPrice) || 0;
        exitReason = `Descarte zootécnico: ${discardReason}. Destino: ${discardDestination}`;
        financialDesc = `Venta de descarte animal ${currentAnimal.record || currentAnimal.id} - ${discardReason}`;
      }

      // 1. Actualizar el estado del animal en DB
      await animalsService.update(currentAnimal.id, {
        status: statusToSet,
        exit_date: date,
        sale_date: statusToSet === 'Vendido' ? date : undefined,
        exit_reason: exitReason,
      });

      // 2. Si es venta y se solicitó registrar ingreso financiero
      if (statusToSet === 'Vendido' && createFinancial && financialAmount > 0) {
        await financialService.create({
          transaction_type: 'Ingreso',
          category: 'Venta de Animal',
          amount: financialAmount,
          animal_id: currentAnimal.id,
          date: date,
          description: financialDesc,
        });
      }

      showToast(
        exitType === 'sale'
          ? `🎉 Venta registrada: ${currentAnimal.record || currentAnimal.id} por $${calculatedSaleTotal.toLocaleString('es-CO')} COP`
          : exitType === 'death'
          ? `🕊️ Muerte registrada: ${currentAnimal.record || currentAnimal.id} (${deathCause})`
          : `⚠️ Descarte registrado: ${currentAnimal.record || currentAnimal.id}`,
        'success'
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error al registrar salida de ganado:', err);
      showToast('Error al registrar la salida del animal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="📤 Registrar Salida de Ganado">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de animal si no viene precargado */}
        {!initialAnimal && (
          <AnimalSelect
            animals={animals}
            value={selectedAnimalId}
            onChange={(v) => setSelectedAnimalId(v)}
            label="¿Qué animal sale del hato?"
            required
            ringClass="focus:ring-rose-500/30"
          />
        )}

        {/* Ficha rápida del animal seleccionado */}
        {currentAnimal && (
          <div className="p-3 rounded-2xl bg-muted/60 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Animal a Dar de Baja:</p>
              <h4 className="text-lg font-black text-foreground">
                {currentAnimal.record || `Animal #${currentAnimal.id}`}
              </h4>
              <p className="text-xs text-muted-foreground">
                {currentAnimal.breed?.name || currentAnimal.breed_name || 'Sin raza'} · {currentAnimal.sex || 'Sin sexo'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-muted-foreground">Último Peso:</span>
              <p className="text-base font-black text-foreground">
                {currentAnimal.weight ? `${currentAnimal.weight} kg` : 'Sin pesaje'}
              </p>
            </div>
          </div>
        )}

        {/* Selector de tipo de salida */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setExitType('sale')}
            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
              exitType === 'sale'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-background border-border text-foreground hover:bg-muted/40'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>💵 Venta Comercial</span>
          </button>

          <button
            type="button"
            onClick={() => setExitType('death')}
            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
              exitType === 'death'
                ? 'bg-zinc-800 text-white border-zinc-800 shadow-md shadow-zinc-800/20'
                : 'bg-background border-border text-foreground hover:bg-muted/40'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span>🪦 Muerte en Predio</span>
          </button>

          <button
            type="button"
            onClick={() => setExitType('discard')}
            className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
              exitType === 'discard'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                : 'bg-background border-border text-foreground hover:bg-muted/40'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>⚠️ Descarte</span>
          </button>
        </div>

        {/* 💵 Formulario de Venta Comercial */}
        {exitType === 'sale' && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Modalidad de Venta:</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSaleMode('weight')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    saleMode === 'weight'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Kilo en Pie (Báscula)
                </button>
                <button
                  type="button"
                  onClick={() => setSaleMode('head')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    saleMode === 'head'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Por Cabeza (Al Bulto)
                </button>
              </div>
            </div>

            {saleMode === 'weight' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Peso en Báscula (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-black"
                      placeholder="Ej: 450"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Precio / Kilo ($ COP)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={pricePerKg}
                      onChange={(e) => setPricePerKg(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-black"
                      placeholder="Ej: 8500"
                      required
                    />
                  </div>
                </div>

                {/* Precios rápidos por kilo comunes en Colombia */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">Sugerido:</span>
                  {SALE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPricePerKg(String(p))}
                      className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold whitespace-nowrap hover:bg-emerald-200"
                    >
                      ${p.toLocaleString('es-CO')}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Valor Total por Cabeza ($ COP)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={totalPriceHead}
                  onChange={(e) => setTotalPriceHead(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-black"
                  placeholder="Ej: 3500000"
                  required
                />
              </div>
            )}

            {/* Total Liquidado Destacado */}
            <div className="p-3 bg-white dark:bg-black/50 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-emerald-800 dark:text-emerald-300">
                💰 Total Liquidado:
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                ${calculatedSaleTotal.toLocaleString('es-CO')} COP
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Comprador / Destino</label>
              <input
                type="text"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder="Ej: Frigorífico Guadalupe, Subasta San Pedro, Don Carlos"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={createFinancial}
                onChange={(e) => setCreateFinancial(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span className="text-xs font-bold text-foreground">
                Registrar ingreso financiero en el balance de la finca
              </span>
            </label>
          </div>
        )}

        {/* 🪦 Formulario de Muerte en Predio */}
        {exitType === 'death' && (
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/40 border-2 border-zinc-300 dark:border-zinc-800 space-y-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Causa de Muerte</label>
              <select
                value={deathCause}
                onChange={(e) => setDeathCause(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-bold"
              >
                {DEATH_CAUSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Disposición del Cadáver</label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold"
                >
                  <option value="Entierro profundo con cal">Entierro con cal</option>
                  <option value="Incineración">Incineración</option>
                  <option value="Fosa sanitaria">Fosa sanitaria</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={necropsy}
                    onChange={(e) => setNecropsy(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-800"
                  />
                  <span className="text-xs font-bold text-foreground">¿Necropsia realizada?</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Observaciones / Síntomas Previos</label>
              <textarea
                rows={2}
                value={deathNotes}
                onChange={(e) => setDeathNotes(e.target.value)}
                placeholder="Ej: Se encontró postrado en la cañada del potrero 3..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs resize-none"
              />
            </div>
          </div>
        )}

        {/* ⚠️ Formulario de Descarte Zootécnico */}
        {exitType === 'discard' && (
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 space-y-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Motivo Zootécnico de Descarte</label>
              <select
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-bold"
              >
                {DISCARD_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Destino</label>
                <select
                  value={discardDestination}
                  onChange={(e) => setDiscardDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold"
                >
                  <option value="Venta de descarte / Frigorífico">Venta en subasta / Frigorífico</option>
                  <option value="Consumo interno de la finca">Consumo interno de la finca</option>
                  <option value="Planta de beneficio local">Planta de beneficio local</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Valor Obtenido ($ COP)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={discardPrice}
                  onChange={(e) => setDiscardPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-black"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={createFinancial}
                onChange={(e) => setCreateFinancial(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600"
              />
              <span className="text-xs font-bold text-foreground">
                Registrar ingreso de descarte en finanzas
              </span>
            </label>
          </div>
        )}

        {/* Fecha de salida */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-1">📅 Fecha del Egreso</label>
          <input
            type="date"
            max={getTodayColombia()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-bold"
            required
          />
        </div>

        {/* Botón de envío */}
        <Button
          type="submit"
          disabled={saving || !currentAnimal}
          className={`w-full rounded-2xl py-3.5 text-base font-black text-white shadow-md ${
            exitType === 'sale'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              : exitType === 'death'
              ? 'bg-zinc-800 hover:bg-zinc-900 shadow-zinc-800/20'
              : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Procesando Salida...
            </>
          ) : exitType === 'sale' ? (
            '✅ Confirmar Venta y Liquidación'
          ) : exitType === 'death' ? (
            '✅ Registrar Muerte del Animal'
          ) : (
            '✅ Registrar Descarte'
          )}
        </Button>
      </form>
    </ModalWrapper>
  );
};
