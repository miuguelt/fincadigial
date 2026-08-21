import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Scale, 
  Plus, 
  Trash2, 
  Info, 
  Save, 
  CheckCircle2, 
  Beef 
} from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/app/providers/ToastContext';
import { fieldService } from '@/entities/field/api/field.service';
import type { FieldResponse } from '@/shared/api/generated/swaggerTypes';

interface AforoCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Potrero preseleccionado si se abre desde una tarjeta específica */
  initialField?: FieldResponse | null;
  /** Lista de todos los potreros para el selector */
  fields?: FieldResponse[];
  onAforoSaved?: () => void;
}

export const AforoCalculatorModal: React.FC<AforoCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialField,
  fields: propFields,
  onAforoSaved,
}) => {
  const { showToast } = useToast();

  const { data: fetchedFields = [] } = useQuery({
    queryKey: ['aforo-calculator-fields'],
    enabled: isOpen && (!propFields || propFields.length === 0),
    queryFn: async () => {
      const resp = await fieldService.getFields({ limit: 200 });
      const raw = (resp as any)?.data ?? (resp as any)?.items ?? resp ?? [];
      return Array.isArray(raw) ? (raw as FieldResponse[]) : [];
    },
  });

  const fields = useMemo(() => {
    if (propFields && propFields.length > 0) return propFields;
    return fetchedFields;
  }, [propFields, fetchedFields]);

  const [selectedFieldId, setSelectedFieldId] = useState<number | undefined>(
    initialField?.id
  );

  useEffect(() => {
    if (initialField?.id) {
      setSelectedFieldId(initialField.id);
    } else if (fields.length > 0 && !selectedFieldId) {
      setSelectedFieldId(fields[0].id);
    }
  }, [initialField, fields, selectedFieldId]);

  const activeField = useMemo(() => {
    return fields.find((f) => f.id === selectedFieldId) || initialField || null;
  }, [fields, selectedFieldId, initialField]);

  // Área del potrero en hectáreas
  const areaHa = useMemo(() => {
    if (!activeField?.area) return 1.0;
    const num = parseFloat(String(activeField.area).replace(',', '.'));
    return Number.isFinite(num) && num > 0 ? num : 1.0;
  }, [activeField]);

  // Muestras de corte en marco de 1m x 1m (en kg)
  const [samples, setSamples] = useState<number[]>([1.2, 1.5, 1.4]);

  // Porcentaje de pérdida / desecho / pisotón (20% - 35%)
  const [wastePct, setWastePct] = useState<number>(25);

  // Parámetros del ganado para la simulación
  const [animalCount, setAnimalCount] = useState<number>(
    activeField?.animal_count && activeField.animal_count > 0 ? activeField.animal_count : 25
  );
  const [animalWeightKg, setAnimalWeightKg] = useState<number>(450); // 1 UGM estándar = 450 kg
  const [dailyIntakePct] = useState<number>(10); // 10% del peso vivo en forraje verde
  const [desiredGrazingDays, setDesiredGrazingDays] = useState<number>(2); // 2 días de estancia

  const [isSaving, setIsSaving] = useState(false);

  // Actualizar animalCount si el potrero cambia
  useEffect(() => {
    if (activeField?.animal_count && activeField.animal_count > 0) {
      setAnimalCount(activeField.animal_count);
    }
  }, [activeField]);

  // Manejadores de muestras
  const addSample = () => {
    if (samples.length < 8) {
      setSamples([...samples, 1.2]);
    }
  };

  const removeSample = (index: number) => {
    if (samples.length > 1) {
      setSamples(samples.filter((_, i) => i !== index));
    }
  };

  const updateSample = (index: number, valStr: string) => {
    const val = parseFloat(valStr.replace(',', '.'));
    const next = [...samples];
    next[index] = isNaN(val) ? 0 : Math.max(0, val);
    setSamples(next);
  };

  // ─── Cálculos Zootécnicos ──────────────────────────────────────────────────
  const calculations = useMemo(() => {
    const validSamples = samples.filter((s) => s > 0);
    const avgKgPerM2 = validSamples.length > 0 
      ? validSamples.reduce((acc, curr) => acc + curr, 0) / validSamples.length 
      : 0;

    const areaM2 = areaHa * 10000;
    const totalGreenForageKg = avgKgPerM2 * areaM2; // Forraje Verde Total
    const usableForageKg = totalGreenForageKg * (1 - wastePct / 100); // Forraje Verde Aprovechable

    // Consumo por cabeza por día (kg FV)
    const dailyIntakePerAnimalKg = (animalWeightKg * dailyIntakePct) / 100;
    const herdDailyIntakeKg = dailyIntakePerAnimalKg * Math.max(1, animalCount);

    // Días de pastoreo soportados con el lote actual
    const daysSupported = herdDailyIntakeKg > 0 ? usableForageKg / herdDailyIntakeKg : 0;

    // Capacidad de animales para los días deseados
    const animalsForDesiredDays = desiredGrazingDays > 0 && dailyIntakePerAnimalKg > 0
      ? Math.floor(usableForageKg / (dailyIntakePerAnimalKg * desiredGrazingDays))
      : 0;

    // Capacidad de carga en UGM / ha
    const totalUgm = (animalCount * animalWeightKg) / 450;
    const ugmPerHa = areaHa > 0 ? totalUgm / areaHa : 0;

    return {
      avgKgPerM2: Number(avgKgPerM2.toFixed(2)),
      kgPerHa: Math.round(avgKgPerM2 * 10000),
      totalGreenForageKg: Math.round(totalGreenForageKg),
      usableForageKg: Math.round(usableForageKg),
      dailyIntakePerAnimalKg: Number(dailyIntakePerAnimalKg.toFixed(1)),
      herdDailyIntakeKg: Math.round(herdDailyIntakeKg),
      daysSupported: Number(daysSupported.toFixed(1)),
      animalsForDesiredDays,
      ugmPerHa: Number(ugmPerHa.toFixed(2)),
    };
  }, [samples, areaHa, wastePct, animalWeightKg, dailyIntakePct, animalCount, desiredGrazingDays]);

  // Guardar resultado como medición en el potrero
  const handleSaveAforo = async () => {
    if (!activeField?.id) return;
    setIsSaving(true);
    try {
      const summaryNote = `Aforo ${new Date().toLocaleDateString('es-CO')}: ${calculations.avgKgPerM2} kg/m² (${calculations.kgPerHa.toLocaleString('es-CO')} kg/ha). Disp: ${calculations.usableForageKg.toLocaleString('es-CO')} kg FV. Soporta ${calculations.daysSupported} días para ${animalCount} cabezas.`;
      
      const payload: Partial<FieldResponse> = {
        gauges: summaryNote,
      };

      await fieldService.updateField(String(activeField.id), payload as any);
      showToast('Aforo registrado y guardado en el potrero con éxito', 'success');
      onAforoSaved?.();
      onClose();
    } catch (err) {
      console.error('[AforoCalculator] Error saving aforo:', err);
      showToast('No se pudo guardar el aforo en el potrero', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Calculadora de Aforo y Carga de Pastos"
      subtitle="Planificación zootécnica de forraje y rotación de ganado"
      description="Ingresa las muestras tomadas con el marco de 1m² para calcular la oferta forrajera y los días de pastoreo garantizados."
      size="xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full border-t border-border/50 bg-card/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>1 UGM = 450 kg de peso vivo (consumo ~10% PV en forraje verde).</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAforo}
              loading={isSaving}
              disabled={isSaving || !activeField || calculations.avgKgPerM2 <= 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              Guardar Aforo en Potrero
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Selector de potrero y resumen del área */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Potrero a Aforar
              </Label>
              {fields.length > 0 ? (
                <select
                  value={selectedFieldId || ''}
                  onChange={(e) => setSelectedFieldId(Number(e.target.value))}
                  className="w-full sm:w-72 bg-background border border-input rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.area || '1 ha'}) — {f.state || 'Disponible'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-black text-foreground">
                  {activeField?.name || 'Potrero Seleccionado'}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-background/80 rounded-xl px-3.5 py-2 border border-border/60 text-right">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Área Total</span>
                <span className="text-sm font-black text-foreground tabular-nums">
                  {areaHa.toLocaleString('es-CO')} ha <span className="text-xs text-muted-foreground font-normal">({(areaHa * 10000).toLocaleString('es-CO')} m²)</span>
                </span>
              </div>
              <div className="bg-background/80 rounded-xl px-3.5 py-2 border border-border/60 text-right">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">Ganado Actual</span>
                <span className="text-sm font-black text-foreground tabular-nums">
                  {activeField?.animal_count ?? 0} cabezas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 1: Muestras de Corte (Marco 1m x 1m) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                1. Muestras de Corte (Marco de 1m x 1m)
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSample}
              disabled={samples.length >= 8}
              className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Muestra
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {samples.map((sample, idx) => (
              <div key={idx} className="relative p-3 rounded-xl bg-card border border-border/70 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>Muestra #{idx + 1}</span>
                  {samples.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSample(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Eliminar muestra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10"
                    value={sample || ''}
                    onChange={(e) => updateSample(idx, e.target.value)}
                    className="h-9 font-mono font-bold text-sm"
                  />
                  <span className="text-xs font-bold text-muted-foreground">kg/m²</span>
                </div>
              </div>
            ))}
          </div>

          {/* Slider de Desperdicio */}
          <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase text-foreground">
                  Desperdicio / Merma Estimada (Pisotón y bosta)
                </span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {wastePct}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Forraje no consumido por pisoteo, orina o tallos leñosos (típico 20% a 30%).
              </p>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={wastePct}
              onChange={(e) => setWastePct(Number(e.target.value))}
              className="w-full sm:w-48 accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Sección 2: Oferta Forrajera Neta (Resultados del Aforo) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Producción Promedio
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                {calculations.avgKgPerM2}
              </span>
              <span className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70">kg/m²</span>
            </div>
            <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-semibold">
              ≈ {calculations.kgPerHa.toLocaleString('es-CO')} kg/ha
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Forraje Verde Total
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground tabular-nums">
                {calculations.totalGreenForageKg.toLocaleString('es-CO')}
              </span>
              <span className="text-xs font-bold text-muted-foreground">kg</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1">
              En {areaHa} hectáreas
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Forraje Aprovechable
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-700 dark:text-blue-300 tabular-nums">
                {calculations.usableForageKg.toLocaleString('es-CO')}
              </span>
              <span className="text-xs font-bold text-blue-600/70 dark:text-blue-400/70">kg</span>
            </div>
            <span className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-1 font-semibold">
              Descontando {wastePct}% de merma
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
              Consumo Diario Lote
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-700 dark:text-purple-300 tabular-nums">
                {calculations.herdDailyIntakeKg.toLocaleString('es-CO')}
              </span>
              <span className="text-xs font-bold text-purple-600/70 dark:text-purple-400/70">kg/día</span>
            </div>
            <span className="text-[11px] text-purple-600/70 dark:text-purple-400/70 mt-1 font-semibold">
              {animalCount} cabezas @ {calculations.dailyIntakePerAnimalKg} kg/cabeza
            </span>
          </div>
        </div>

        {/* Sección 3: Simulador de Capacidad de Carga y Rotación */}
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Beef className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              2. Simulación de Carga y Rotación
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Cabezas en el Lote
              </Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={animalCount}
                onChange={(e) => setAnimalCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Peso Promedio Animal (kg)
              </Label>
              <Input
                type="number"
                min="100"
                max="900"
                step="25"
                value={animalWeightKg}
                onChange={(e) => setAnimalWeightKg(Math.max(50, parseInt(e.target.value) || 450))}
                className="h-10 font-bold"
              />
              <span className="text-[10px] text-muted-foreground block">
                Consumo: {dailyIntakePct}% PV = {calculations.dailyIntakePerAnimalKg} kg FV/día
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Días de Permanencia Deseados
              </Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={desiredGrazingDays}
                onChange={(e) => setDesiredGrazingDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 font-bold"
              />
              <span className="text-[10px] text-muted-foreground block">
                Recomendado en pastoreo rotacional: 1 a 3 días
              </span>
            </div>
          </div>

          {/* Veredicto / Conclusión Zootécnica para el Campesino */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-black text-sm text-foreground">
                Veredicto Técnico para {activeField?.name || 'este Potrero'}
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Con una oferta de <strong className="text-foreground">{calculations.usableForageKg.toLocaleString('es-CO')} kg de forraje aprovechable</strong>, 
                tu lote actual de <strong className="text-foreground">{animalCount} animales</strong> puede pastorear durante{' '}
                <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-black underline decoration-emerald-500">
                  {calculations.daysSupported} días
                </strong>{' '}
                sin provocar sobrepastoreo.
              </p>
              <p className="text-muted-foreground leading-relaxed pt-1">
                Si deseas una rotación estricta de <strong className="text-foreground">{desiredGrazingDays} días</strong>, 
                el potrero soporta un lote de hasta{' '}
                <strong className="text-primary font-black">{calculations.animalsForDesiredDays} cabezas</strong>{' '}
                (Carga: {calculations.ugmPerHa} UGM/ha).
              </p>
            </div>
          </div>
        </div>
      </div>
    </GenericModal>
  );
};

export default AforoCalculatorModal;
