import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Baby, ArrowRight, Sparkles, Sprout, HeartCrack } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from '@/widgets/registro-operativo/modals/ModalWrapper';
import { AnimalSelect } from '@/widgets/registro-operativo/components/AnimalSelect';
import { controlService } from '@/entities/control/api/control.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';

interface WeaningModalProps {
  open: boolean;
  onClose: () => void;
  animal?: any;
  animals?: any[];
  fields?: any[];
  onSuccess?: () => void;
}

const WEANING_WEIGHT_PRESETS = [140, 160, 180, 200, 220, 240];

export const WeaningModal: React.FC<WeaningModalProps> = ({
  open,
  onClose,
  animal: initialAnimal,
  animals = [],
  fields = [],
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedCalfId, setSelectedCalfId] = useState<string>(initialAnimal?.id ? String(initialAnimal.id) : '');
  const [weaningDate, setWeaningDate] = useState<string>(getTodayColombia());
  const [birthWeight, setBirthWeight] = useState<string>('35');
  const [weaningWeight, setWeaningWeight] = useState<string>('180');
  const [destinationFieldId, setDestinationFieldId] = useState<string>('');
  const [dryOffMother, setDryOffMother] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Ternero seleccionado
  const currentCalf = useMemo(() => {
    if (initialAnimal) return initialAnimal;
    if (!selectedCalfId) return null;
    return animals.find((a) => String(a.id) === String(selectedCalfId)) || null;
  }, [initialAnimal, selectedCalfId, animals]);

  // Precargar peso y datos del ternero al seleccionarlo
  useEffect(() => {
    if (currentCalf?.weight) {
      setWeaningWeight(String(Math.round(currentCalf.weight)));
    }
  }, [currentCalf]);

  // Buscar información de la madre si existe
  const motherAnimal = useMemo(() => {
    if (!currentCalf) return null;
    const motherId = currentCalf.idMother || currentCalf.mother_id || currentCalf.mother?.id;
    if (!motherId) return null;
    return animals.find((a) => String(a.id) === String(motherId)) || currentCalf.mother || null;
  }, [currentCalf, animals]);

  // Cálculos Zootécnicos Predestete
  const zootecnia = useMemo(() => {
    if (!currentCalf?.birth_date) {
      return {
        daysOfAge: 210,
        monthsOfAge: 7,
        totalGainKg: (Number(weaningWeight) || 180) - (Number(birthWeight) || 35),
        adgGrams: 690,
        adjustedWeight205: 176.5,
        status: 'optimal' as const,
        statusLabel: '🟢 Excelente (+650 g/día)',
      };
    }

    const birthMs = new Date(currentCalf.birth_date).getTime();
    const weanMs = new Date(weaningDate).getTime();
    const diffDays = Math.max(1, Math.round((weanMs - birthMs) / (1000 * 60 * 60 * 24)));
    const monthsOfAge = Math.round((diffDays / 30.41) * 10) / 10;

    const bWeight = Number(birthWeight) || 35;
    const wWeight = Number(weaningWeight) || 0;
    const totalGain = Math.max(0, wWeight - bWeight);

    const adg = Math.round((totalGain / diffDays) * 1000);

    // BIF Formula: ((Weaning Weight - Birth Weight) / Age in Days * 205) + Birth Weight
    const adjusted205 = Math.round(((totalGain / diffDays) * 205 + bWeight) * 10) / 10;

    let status: 'optimal' | 'moderate' | 'slow' = 'optimal';
    let statusLabel = '🟢 Excelente (+650 g/día)';
    if (adg < 450) {
      status = 'slow';
      statusLabel = '🔴 Bajo (<450 g/día)';
    } else if (adg < 650) {
      status = 'moderate';
      statusLabel = '🟡 Normal (450-650 g/día)';
    }

    return {
      daysOfAge: diffDays,
      monthsOfAge,
      totalGainKg: Math.round(totalGain * 10) / 10,
      adgGrams: adg,
      adjustedWeight205: adjusted205,
      status,
      statusLabel,
    };
  }, [currentCalf, weaningDate, birthWeight, weaningWeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCalf) {
      showToast('Seleccione el ternero a destetar', 'error');
      return;
    }

    const numWeight = Number(weaningWeight);
    if (!numWeight || numWeight <= 0) {
      showToast('Ingrese un peso de destete válido', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Registrar control oficial de pesaje con metadata zootécnica
      await controlService.create({
        animal_id: currentCalf.id,
        weight: numWeight,
        health_status: 'Excelente',
        checkup_date: weaningDate,
        description: `Pesaje oficial de Destete (${zootecnia.daysOfAge} días). GMD Predestete: ${zootecnia.adgGrams} g/día. Peso Ajustado 205d: ${zootecnia.adjustedWeight205} kg.${notes ? ` Obs: ${notes}` : ''}`,
      });

      // 2. Si se seleccionó potrero de levante, trasladar al ternero
      if (destinationFieldId) {
        await animalFieldsService.create({
          animal_id: currentCalf.id,
          field_id: Number(destinationFieldId),
          assignment_date: weaningDate,
        });
      }

      // 3. Si la madre está identificada y se activó secar vaca
      if (motherAnimal && dryOffMother) {
        try {
          await animalsService.update(motherAnimal.id, {
            is_lactating: false,
          });
        } catch (mErr) {
          console.warn('No se pudo actualizar estado de lactancia de la madre:', mErr);
        }
      }

      showToast(
        `🎉 ¡Destete exitoso! Ternero ${currentCalf.record || currentCalf.id} destetado con ${numWeight} kg (${zootecnia.adgGrams} g/día)`,
        'success'
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error al registrar destete:', err);
      showToast('Error al registrar el destete del ternero', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="🍼 Registrar Destete de Ternero">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de ternero si no viene precargado */}
        {!initialAnimal && (
          <AnimalSelect
            animals={animals}
            value={selectedCalfId}
            onChange={(v) => setSelectedCalfId(v)}
            label="¿Qué ternero o cría se va a destetar?"
            required
            ringClass="focus:ring-indigo-500/30"
          />
        )}

        {/* Ficha rápida del ternero y madre */}
        {currentCalf && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/20 border-2 border-indigo-200 dark:border-indigo-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-indigo-700 dark:text-indigo-300">
                <Baby className="w-3.5 h-3.5" />
                <span>Ternero a Destetar</span>
              </div>
              <h4 className="text-xl font-black text-foreground">
                {currentCalf.record || `Animal #${currentCalf.id}`}
              </h4>
              <p className="text-xs text-muted-foreground">
                {currentCalf.breed?.name || currentCalf.breed_name || 'Sin raza'} · {currentCalf.sex || 'Sin sexo'}
              </p>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[11px] font-bold text-muted-foreground">Edad estimada:</span>
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                {zootecnia.daysOfAge} días (~{zootecnia.monthsOfAge} m)
              </p>
              {motherAnimal && (
                <p className="text-[11px] font-medium text-muted-foreground">
                  Madre: {motherAnimal.record || `#${motherAnimal.id}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Datos de Pesaje */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Peso Nacimiento (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={birthWeight}
                onChange={(e) => setBirthWeight(e.target.value)}
                placeholder="35"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-black"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                ⚖️ Peso al Destete (kg) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={weaningWeight}
                onChange={(e) => setWeaningWeight(e.target.value)}
                placeholder="180"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-indigo-400 dark:border-indigo-600 bg-background text-base font-black text-indigo-900 dark:text-indigo-200"
                required
              />
            </div>
          </div>

          {/* Botones de pesos rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">Rango Común:</span>
            {WEANING_WEIGHT_PRESETS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeaningWeight(String(w))}
                className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 text-xs font-bold whitespace-nowrap hover:bg-indigo-200"
              >
                {w} kg
              </button>
            ))}
          </div>
        </div>

        {/* 📊 Indicadores Zootécnicos Calculados */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Rendimiento Predestete
            </span>
            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
              {zootecnia.statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-white/80 dark:bg-black/40 border border-emerald-200/50">
              <span className="text-[10px] font-bold text-muted-foreground block">Ganancia Total</span>
              <p className="text-base font-black text-foreground">
                +{zootecnia.totalGainKg} <small className="text-xs font-normal">kg</small>
              </p>
            </div>

            <div className="p-2 rounded-xl bg-white/80 dark:bg-black/40 border border-emerald-200/50">
              <span className="text-[10px] font-bold text-muted-foreground block">GMD Predestete</span>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-400">
                +{zootecnia.adgGrams} <small className="text-xs font-normal">g/d</small>
              </p>
            </div>

            <div className="p-2 rounded-xl bg-white/80 dark:bg-black/40 border border-emerald-200/50">
              <span className="text-[10px] font-bold text-muted-foreground block">Ajustado 205d</span>
              <p className="text-base font-black text-foreground">
                {zootecnia.adjustedWeight205} <small className="text-xs font-normal">kg</small>
              </p>
            </div>
          </div>
        </div>

        {/* Separación de Praderas y Madre */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
          {fields.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                <span>Potrero de Levante / Destetos (Separar de la madre):</span>
              </label>
              <select
                value={destinationFieldId}
                onChange={(e) => setDestinationFieldId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-bold"
              >
                <option value="">— Dejar en potrero actual —</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {motherAnimal && (
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={dryOffMother}
                onChange={(e) => setDryOffMother(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span className="text-xs font-bold text-foreground flex items-center gap-1">
                <HeartCrack className="w-3.5 h-3.5 text-rose-500" />
                <span>Marcar a la madre ({motherAnimal.record || `#${motherAnimal.id}`}) como Vaca Seca (Fin de lactancia)</span>
              </span>
            </label>
          )}

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">📅 Fecha del Destete</label>
            <input
              type="date"
              max={getTodayColombia()}
              value={weaningDate}
              onChange={(e) => setWeaningDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Notas / Observaciones</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Ternero vigoroso, buen lomo y desarrollo muscular"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
            />
          </div>
        </div>

        {/* Botón de Guardar */}
        <Button
          type="submit"
          disabled={saving || !currentCalf}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-3.5 text-base font-black shadow-lg shadow-indigo-600/20"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Registrando Destete...
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Baby className="w-5 h-5" />
              Confirmar Destete Oficial
              <ArrowRight className="w-5 h-5 ml-1" />
            </span>
          )}
        </Button>
      </form>
    </ModalWrapper>
  );
};
