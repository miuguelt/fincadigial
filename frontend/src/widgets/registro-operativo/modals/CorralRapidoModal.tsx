import { useState, useMemo } from 'react';
import { Loader2, Scale, Zap, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { controlService } from '@/entities/control/api/control.service';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';

interface CorralRapidoModalProps {
  open: boolean;
  onClose: () => void;
  animals: any[];
  fields?: any[];
  onSuccess?: () => void;
}

export function CorralRapidoModal({
  open,
  onClose,
  animals,
  fields = [],
  onSuccess,
}: CorralRapidoModalProps) {
  const { showToast } = useToast();
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [weight, setWeight] = useState<string>('350');
  const [healthStatus, setHealthStatus] = useState<'Excelente' | 'Bueno' | 'Regular' | 'Malo'>('Bueno');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);

  // Filtrar animales por potrero si se seleccionó uno
  const queueAnimals = useMemo(() => {
    if (!selectedFieldId) return animals;
    return animals.filter((a) => String(a.current_field_id || a.field_id) === String(selectedFieldId));
  }, [animals, selectedFieldId]);

  const currentAnimal = queueAnimals[currentIndex] || queueAnimals[0];

  const handleAdjustWeight = (delta: number) => {
    const curr = Number(weight) || 0;
    const next = Math.max(20, curr + delta);
    setWeight(String(next));
  };

  const handleSaveAndNext = async () => {
    if (!currentAnimal) {
      showToast('Seleccione un animal para registrar', 'error');
      return;
    }
    const numWeight = Number(weight);
    if (!numWeight || numWeight <= 0) {
      showToast('Ingrese un peso válido', 'error');
      return;
    }

    setSaving(true);
    try {
      await controlService.create({
        animal_id: currentAnimal.id,
        weight: numWeight,
        health_status: healthStatus,
        checkup_date: getTodayColombia(),
        description: notes || `Control rápido en manga: ${healthStatus}`,
      });

      showToast(`✅ ${currentAnimal.record || `Animal ${currentAnimal.id}`} registrado (${numWeight} kg)`, 'success');
      setProcessedCount((prev) => prev + 1);
      setNotes('');

      // Avanzar al siguiente animal de la lista si hay más
      if (currentIndex < queueAnimals.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        // Si el siguiente animal ya tiene un peso anterior, precargar un valor cercano
        const nextAnimal = queueAnimals[currentIndex + 1];
        if (nextAnimal?.weight) {
          setWeight(String(Math.round(nextAnimal.weight)));
        }
      } else {
        showToast('🎉 ¡Ha completado el lote de la manga!', 'success');
      }

      onSuccess?.();
    } catch {
      showToast('Error al guardar control en manga', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="⚡ Modo Manga / Corral Rápido">
      <div className="space-y-4">
        {/* Potrero / Lote filter */}
        {fields.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Potrero / Lote:</label>
            <select
              value={selectedFieldId}
              onChange={(e) => {
                setSelectedFieldId(e.target.value);
                setCurrentIndex(0);
              }}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-border bg-background"
            >
              <option value="">— Todo el Ganado (${animals.length}) —</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Current Animal Card */}
        {currentAnimal ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Animal en Manga ({currentIndex + 1} de {queueAnimals.length})
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                  {currentAnimal.record || `Animal ${currentAnimal.id}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentAnimal.breed?.name || 'Sin Raza'} · {currentAnimal.sex || 'Sin sexo'}
                </p>
              </div>

              {/* Selector de animal rápido */}
              <select
                value={currentAnimal.id}
                onChange={(e) => {
                  const idx = queueAnimals.findIndex((a) => String(a.id) === e.target.value);
                  if (idx !== -1) setCurrentIndex(idx);
                }}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-emerald-300 bg-background max-w-[140px]"
              >
                {queueAnimals.map((a, i) => (
                  <option key={a.id} value={a.id}>
                    {i + 1}. {a.record || a.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Weight Input & Fast Adjust Buttons */}
            <div className="p-3 bg-white/90 dark:bg-black/40 rounded-xl border border-emerald-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>Kilos en Báscula:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-24 text-center font-black text-xl px-2 py-1 rounded-lg border border-emerald-300 bg-background"
                  />
                  <span className="text-xs font-bold text-muted-foreground">kg</span>
                </div>
              </div>

              {/* Quick Delta Buttons for 1-hand operation */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(-10)}
                  className="py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80 active:scale-95"
                >
                  -10 kg
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(-5)}
                  className="py-1.5 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80 active:scale-95"
                >
                  -5 kg
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(+5)}
                  className="py-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 active:scale-95"
                >
                  +5 kg
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustWeight(+10)}
                  className="py-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 active:scale-95"
                >
                  +10 kg
                </button>
              </div>
            </div>

            {/* 1-Touch Health Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Estado Sanitario:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setHealthStatus('Bueno')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    healthStatus === 'Bueno'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
                      : 'bg-background border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sano (Bueno)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHealthStatus('Regular')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    healthStatus === 'Regular'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm scale-[1.02]'
                      : 'bg-background border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Regular</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHealthStatus('Malo')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    healthStatus === 'Malo'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm scale-[1.02]'
                      : 'bg-background border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Enfermo</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No hay animales disponibles en este lote.
          </div>
        )}

        {/* Action button */}
        <Button
          type="button"
          disabled={saving || !currentAnimal}
          onClick={handleSaveAndNext}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-4 text-base font-black shadow-lg shadow-emerald-600/20"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Guardando en Manga...
            </>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 fill-current" />
              Guardar y Siguiente Animal
              <ArrowRight className="w-5 h-5 ml-1" />
            </span>
          )}
        </Button>

        {processedCount > 0 && (
          <p className="text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
            ✅ {processedCount} animales registrados en esta sesión de manga
          </p>
        )}
      </div>
    </ModalWrapper>
  );
}
