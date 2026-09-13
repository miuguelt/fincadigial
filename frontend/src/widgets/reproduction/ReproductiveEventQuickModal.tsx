import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Flame,
  Syringe,
  CheckCircle2,
  Baby,
  Milk,
  HeartHandshake,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { animalService } from '@/entities/animal/api/animal.service';
import { useToast } from '@/app/providers/ToastContext';
import type { ReproductiveEventInput } from '@/shared/api/generated/swaggerTypes';

export type EventTypeOption = 'Celo' | 'Inseminacion' | 'Diagnostico' | 'Parto' | 'Secado';

interface AnimalOption {
  id: number;
  record: string;
  breedName?: string;
  category?: string;
}

interface ReproductiveEventQuickModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAnimalId?: number | null;
  defaultAnimalRecord?: string | null;
  defaultEventType?: EventTypeOption;
  onSuccess?: () => void;
}

const EVENT_TYPES: Array<{
  type: EventTypeOption;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  description: string;
}> = [
  {
    type: 'Celo',
    label: 'Celo Detectado',
    shortLabel: 'Celo',
    icon: Flame,
    color: 'text-amber-600 dark:text-amber-400',
    activeBg: 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200',
    description: 'Vaca inquieta, se deja montar o monta a otras en el potrero.',
  },
  {
    type: 'Inseminacion',
    label: 'Monta / Inseminación',
    shortLabel: 'Servicio',
    icon: Syringe,
    color: 'text-purple-600 dark:text-purple-400',
    activeBg: 'border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200',
    description: 'Servicio con toro reproductor o pajilla de inseminación artificial.',
  },
  {
    type: 'Diagnostico',
    label: 'Palpación / Diagnóstico',
    shortLabel: 'Tacto',
    icon: CheckCircle2,
    color: 'text-blue-600 dark:text-blue-400',
    activeBg: 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-200',
    description: 'Tacto rectal o ecografía veterinaria (35 - 60 días post-servicio).',
  },
  {
    type: 'Parto',
    label: 'Parto & Nacimiento',
    shortLabel: 'Parto',
    icon: Baby,
    color: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
    description: 'Nacimiento de cría, culminación exitosa de gestación.',
  },
  {
    type: 'Secado',
    label: 'Secado de Ubre',
    shortLabel: 'Secado',
    icon: Milk,
    color: 'text-cyan-600 dark:text-cyan-400',
    activeBg: 'border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200',
    description: 'Cierre del ordeño para descanso mamario ~60 días antes del parto.',
  },
];

export function ReproductiveEventQuickModal({
  isOpen,
  onOpenChange,
  defaultAnimalId,
  defaultAnimalRecord,
  defaultEventType = 'Celo',
  onSuccess,
}: ReproductiveEventQuickModalProps) {
  const { showToast } = useToast();
  const [eventType, setEventType] = useState<EventTypeOption>(defaultEventType);
  const [animalId, setAnimalId] = useState<number | null>(defaultAnimalId || null);
  const [eventDate, setEventDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Campos Inseminación
  const [technique, setTechnique] = useState<'Natural' | 'Artificial' | 'Transferencia_Embrionaria'>('Artificial');
  const [sireId, setSireId] = useState<number | null>(null);

  // Campos Palpación
  const [diagnosisResult, setDiagnosisResult] = useState<'Positivo' | 'Negativo' | 'Pendiente'>('Positivo');

  // Campos Parto
  const [aliveCount, setAliveCount] = useState<number>(1);
  const [deadCount, setDeadCount] = useState<number>(0);
  const [complications, setComplications] = useState<boolean>(false);

  // Notas
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Catálogos
  const [females, setFemales] = useState<AnimalOption[]>([]);
  const [sires, setSires] = useState<AnimalOption[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (defaultAnimalId) setAnimalId(defaultAnimalId);
      if (defaultEventType) setEventType(defaultEventType);
      setEventDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSubmitting(false);
    }
  }, [isOpen, defaultAnimalId, defaultEventType]);

  // Cargar hembras si no hay animal preseleccionado, y cargar toros para servicios
  const loadOptions = useCallback(async () => {
    setLoadingAnimals(true);
    try {
      const [femalesRes, malesRes] = await Promise.all([
        !defaultAnimalId ? animalService.getAll({ sex: 'Hembra' }) : Promise.resolve([]),
        animalService.getAll({ sex: 'Macho' }),
      ]);

      if (!defaultAnimalId && Array.isArray(femalesRes)) {
        setFemales(
          femalesRes.map((a: any) => ({
            id: a.id,
            record: a.record,
            breedName: a.breed?.name || a.breed_name,
            category: a.category,
          }))
        );
      }

      if (Array.isArray(malesRes)) {
        setSires(
          malesRes.map((a: any) => ({
            id: a.id,
            record: a.record,
            breedName: a.breed?.name || a.breed_name,
            category: a.category,
          }))
        );
      }
    } catch (err) {
      console.error('Error cargando animales para modal reproductivo:', err);
    } finally {
      setLoadingAnimals(false);
    }
  }, [defaultAnimalId]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen, loadOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!animalId) {
      showToast('Seleccione la hembra (vaca o novilla)', 'error');
      return;
    }

    if (!eventDate) {
      showToast('Indique la fecha de la novedad', 'error');
      return;
    }

    if (eventType === 'Parto' && aliveCount + deadCount <= 0) {
      showToast('Para registrar un parto indique al menos 1 cría viva o muerta', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ReproductiveEventInput = {
        animal_id: animalId,
        event_type: eventType,
        event_date: eventDate,
        notes: notes.trim() || undefined,
      };

      if (eventType === 'Inseminacion') {
        payload.technique = technique;
        if (sireId) payload.sire_id = sireId;
      } else if (eventType === 'Diagnostico') {
        payload.diagnosis_result = diagnosisResult;
      } else if (eventType === 'Parto') {
        payload.alive_count = aliveCount;
        payload.dead_count = deadCount;
        payload.complications = complications;
      }

      await reproductionService.create(payload);

      showToast(`Novedad registrada con éxito: ${eventType}`, 'success');
      window.dispatchEvent(new CustomEvent('crud:refetch'));
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar la novedad reproductiva';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEventConfig = EVENT_TYPES.find((e) => e.type === eventType) || EVENT_TYPES[0];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Registrar Novedad Reproductiva
                </DialogTitle>
                <DialogDescription className="text-xs text-purple-100 font-medium">
                  Captura ágil en corral y potrero · Fincas Campesinas
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* 1. Selector de Tipo de Novedad (Botones Táctiles Grandes) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              1. Seleccione el Tipo de Novedad
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {EVENT_TYPES.map((et) => {
                const IconComponent = et.icon;
                const isSelected = eventType === et.type;
                return (
                  <button
                    key={et.type}
                    type="button"
                    onClick={() => setEventType(et.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? `${et.activeBg} font-black shadow-sm ring-2 ring-primary/40`
                        : 'border-border/70 bg-card hover:bg-muted/60 text-muted-foreground font-semibold'
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 mb-1 ${isSelected ? et.color : 'text-muted-foreground'}`} />
                    <span className="text-xs leading-tight">{et.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic px-1">
              {selectedEventConfig.description}
            </p>
          </div>

          {/* 2. Animal y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Vaca / Novilla */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Hembra (Vaca o Novilla) *
              </Label>
              {defaultAnimalId ? (
                <div className="h-10 px-3.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between">
                  <span className="font-black text-sm text-foreground">
                    {defaultAnimalRecord || `Arete #${defaultAnimalId}`}
                  </span>
                  <Badge variant="outline" className="text-[11px] font-bold bg-primary/10 text-primary border-primary/20">
                    Preseleccionada
                  </Badge>
                </div>
              ) : (
                <Select
                  value={animalId ? String(animalId) : ''}
                  onValueChange={(val) => setAnimalId(Number(val))}
                  disabled={loadingAnimals}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder={loadingAnimals ? 'Cargando hembras...' : 'Seleccione una hembra...'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {females.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                        <span className="font-bold">{f.record}</span>
                        {f.breedName ? ` · ${f.breedName}` : ''}
                        {f.category ? ` (${f.category})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Fecha del Evento *
              </Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-10 rounded-xl text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* 3. Campos específicos según EventType */}

          {/* Celo: Recomendación Mañana-Tarde */}
          {eventType === 'Celo' && (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                Regla Mañana-Tarde de Inseminación
              </div>
              <p className="text-muted-foreground text-[11px]">
                Si el celo inició en la <strong>mañana</strong>, servir en la <strong>tarde</strong> (4-6 PM). Si inició en la <strong>tarde</strong>, servir a primera hora de la <strong>mañana siguiente</strong> (6-8 AM).
              </p>
            </div>
          )}

          {/* Inseminación / Monta */}
          {eventType === 'Inseminacion' && (
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Detalles del Servicio Reproductivo
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Técnica Empleada</Label>
                  <Select
                    value={technique}
                    onValueChange={(val: any) => setTechnique(val)}
                  >
                    <SelectTrigger className="h-9.5 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Artificial">Inseminación Artificial (Pajilla)</SelectItem>
                      <SelectItem value="Natural">Monta Natural (Toro en Lote)</SelectItem>
                      <SelectItem value="Transferencia_Embrionaria">Transferencia de Embrión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Toro Reproductor (Padre)</Label>
                  <Select
                    value={sireId ? String(sireId) : 'none'}
                    onValueChange={(val) => setSireId(val === 'none' ? null : Number(val))}
                  >
                    <SelectTrigger className="h-9.5 rounded-xl text-xs">
                      <SelectValue placeholder="Seleccionar toro..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none">-- Sin toro asignado / Pajilla externa --</SelectItem>
                      {sires.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          <span className="font-bold">Toro {s.record}</span>
                          {s.breedName ? ` · ${s.breedName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                El sistema calculará automáticamente la Fecha Probable de Parto (FPP a 283 días) y programará la alerta de palpación a los 35-45 días.
              </p>
            </div>
          )}

          {/* Diagnóstico / Palpación */}
          {eventType === 'Diagnostico' && (
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Resultado de Palpación / Ecografía
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Diagnóstico Veterinario</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Positivo', label: 'Positivo (Preñada)', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
                    { val: 'Negativo', label: 'Negativo (Vacía)', color: 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300' },
                    { val: 'Pendiente', label: 'Repetir en 15d', color: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
                  ].map((diag) => (
                    <button
                      key={diag.val}
                      type="button"
                      onClick={() => setDiagnosisResult(diag.val as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        diagnosisResult === diag.val
                          ? `${diag.color} ring-2 ring-blue-500/40 font-black`
                          : 'border-border/60 bg-card hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {diag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Parto */}
          {eventType === 'Parto' && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Detalles del Parto y Crías
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    Crías Nacidas Vivas *
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    value={aliveCount}
                    onChange={(e) => setAliveCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9.5 rounded-xl font-black text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    Crías Nacidas Muertas
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    value={deadCount}
                    onChange={(e) => setDeadCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9.5 rounded-xl font-black text-center"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-complications"
                  checked={complications}
                  onChange={(e) => setComplications(e.target.checked)}
                  className="rounded border-border text-primary h-4 w-4"
                />
                <Label htmlFor="modal-complications" className="text-xs font-semibold cursor-pointer">
                  ¿Hubo distocia, retención de placenta o parto asistido complejo?
                </Label>
              </div>
            </div>
          )}

          {/* Secado */}
          {eventType === 'Secado' && (
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-900 dark:text-cyan-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                <Milk className="h-4 w-4" />
                Cierre de Campaña Lechera
              </div>
              <p className="text-muted-foreground text-[11px]">
                Registra el cese de ordeño para permitir que la glándula mamaria se regenere antes del próximo parto.
              </p>
            </div>
          )}

          {/* Observaciones de Campo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Observaciones de Campo (Opcional)
            </Label>
            <Textarea
              rows={2}
              placeholder="Ej: Presentó celo marcado a las 7:00 AM, buena condición corporal, servida con pajilla Brahman gris..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl text-xs resize-none"
            />
          </div>

          <DialogFooter className="p-0 pt-3 border-t border-border flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto rounded-xl font-bold"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20"
            >
              {submitting ? 'Guardando...' : `Registrar ${selectedEventConfig.shortLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
