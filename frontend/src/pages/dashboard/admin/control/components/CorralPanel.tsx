import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { animalService } from '@/entities/animal/api/animal.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';

// Definición de tipos
type CorralSessionPayload = {
  animal_id: number;
  finca_id: number;
  weight?: number;
  health_status: string;
  milk_liters?: number;
  milking_session?: string;
  reproduction_event?: string;
  treatment_description?: string;
  treatment_dosis?: string;
  treatment_frequency?: string;
};

export const CorralPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { user } = useAuth() as any;
  const { toast } = useToast();

  const [animals, setAnimals] = useState<{label: string, value: number, sex: string}[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);

  const [animalId, setAnimalId] = useState<number | ''>('');
  const [healthStatus, setHealthStatus] = useState<string>('Sano');
  const [weight, setWeight] = useState<string>('');
  const [milkLiters, setMilkLiters] = useState<string>('');

  // Extra options
  const [showRepro, setShowRepro] = useState(false);
  const [reproEvent, setReproEvent] = useState<string>('');

  const [showTreatment, setShowTreatment] = useState(false);
  const [treatmentDesc, setTreatmentDesc] = useState<string>('');
  const [treatmentDosis, setTreatmentDosis] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadAnimals = async () => {
      try {
        const data = await animalService.getAll({ page: 1, page_size: 1000 } as any);
        const raw: any = data;
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? raw?.results ?? []);

        setAnimals(arr.map((a: any) => ({
          label: (a.record || a.registro) ? `${a.record || a.registro} - ${a.name || a.nombre || ''}` : `Animal #${a.id}`,
          value: a.id,
          sex: a.sex || 'Hembra'
        })));
      } catch (error) {
        console.error('Error loading animals:', error);
        toast({ title: 'Error', description: 'No se pudieron cargar los animales.', variant: 'destructive' });
      } finally {
        setLoadingAnimals(false);
      }
    };
    loadAnimals();
  }, [toast]);

  const selectedAnimal = animals.find(a => a.value === animalId);
  const isFemale = selectedAnimal?.sex === 'Hembra';

  // Mostrar automáticamente tratamiento si se marca como enfermo
  useEffect(() => {
    if (healthStatus === 'Malo' || healthStatus === 'Regular') {
      setShowTreatment(true);
    } else {
      setShowTreatment(false);
      setTreatmentDesc('');
      setTreatmentDosis('');
    }
  }, [healthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) {
      toast({ title: 'Atención', description: 'Debe seleccionar un animal.', variant: 'warning' });
      return;
    }

    setIsSubmitting(true);

    const payload: CorralSessionPayload = {
      animal_id: animalId,
      finca_id: user?.finca_id,
      health_status: healthStatus,
    };

    if (weight) payload.weight = parseFloat(weight);
    if (milkLiters && parseFloat(milkLiters) > 0) {
      payload.milk_liters = parseFloat(milkLiters);
      payload.milking_session = new Date().getHours() < 12 ? 'AM' : 'PM';
    }

    if (showRepro && reproEvent) {
      payload.reproduction_event = reproEvent;
    }

    if (showTreatment && treatmentDesc) {
      payload.treatment_description = treatmentDesc;
      payload.treatment_dosis = treatmentDosis || 'Aplicado';
      payload.treatment_frequency = 'Dosis única';
    }

    try {
      // Guardar a través de la cola offline para robustez
      await offlineQueue.enqueue('POST', '/api/v1/corral/session', payload);

      toast({ title: '¡Guardado!', description: 'Registro guardado correctamente.', variant: 'success' });

      if (onClose) {
        onClose();
      } else {
        setAnimalId('');
        setHealthStatus('Sano');
        setWeight('');
        setMilkLiters('');
        setShowRepro(false);
        setReproEvent('');
        setShowTreatment(false);
        setTreatmentDesc('');
        setTreatmentDosis('');
      }

    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo guardar la sesión.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Paso 1: Animal */}
      <div className="bg-blue-50/50 dark:bg-blue-950/30 p-5 rounded-lg border border-blue-100 dark:border-blue-900 shadow-sm">
        <Label className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
          <span>1.</span> 🐄 ¿A qué animal vamos a registrar?
        </Label>
        <Select
          value={animalId ? animalId.toString() : ''}
          onValueChange={(val) => setAnimalId(parseInt(val))}
          disabled={loadingAnimals}
        >
          <SelectTrigger className="h-16 text-xl bg-card shadow-sm border-2 border-blue-200 dark:border-blue-800 rounded-xl w-full">
            <SelectValue placeholder={loadingAnimals ? "Cargando lista..." : "Toque aquí para elegir animal"} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {animals.map((a) => (
              <SelectItem key={a.value} value={a.value.toString()} className="text-xl p-4 border-b border-border/60 last:border-0 cursor-pointer">
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {animalId && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Paso 2: Producción y Peso */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-5 rounded-lg border border-emerald-100 dark:border-emerald-900 shadow-sm">
            <Label className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mb-4 flex items-center gap-2">
              <span>2.</span> 📊 Datos de hoy
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Leche - Solo si es hembra */}
              <div className={`space-y-2 p-5 rounded-xl bg-card border-2 transition-all ${isFemale ? 'border-emerald-200 dark:border-emerald-800 shadow-sm' : 'border-border opacity-40 grayscale pointer-events-none'}`}>
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  🥛 ¿Cuántos litros dio?
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    className="h-16 text-3xl text-center font-bold rounded-xl pr-12 border-input focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="0,0"
                    value={milkLiters}
                    onChange={(e) => setMilkLiters(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">L</span>
                </div>
                {!isFemale && <p className="text-sm text-muted-foreground text-center mt-2">No aplica (Macho)</p>}
              </div>

              {/* Peso */}
              <div className="space-y-2 p-5 rounded-xl bg-card border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  ⚖️ ¿Cuánto pesa hoy?
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    className="h-16 text-3xl text-center font-bold rounded-xl pr-14 border-input focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">Kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 3: Salud */}
          <div className="bg-amber-50/50 dark:bg-amber-950/30 p-5 rounded-lg border border-amber-100 dark:border-amber-900 shadow-sm">
            <Label className="text-xl font-bold text-amber-900 dark:text-amber-200 mb-4 flex items-center gap-2">
              <span>3.</span> 🩺 ¿Cómo lo ve de salud?
            </Label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'Excelente', label: 'Muy Bien', icon: '🌟', color: 'bg-green-100 dark:bg-green-950/60 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200 ring-green-400' },
                { id: 'Sano', label: 'Normal', icon: '✅', color: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 ring-emerald-400' },
                { id: 'Regular', label: 'Decaído', icon: '⚠️', color: 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 ring-yellow-400' },
                { id: 'Malo', label: 'Enfermo', icon: '🚨', color: 'bg-red-100 dark:bg-red-950/60 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200 ring-red-400' }
              ].map((status) => {
                const isSelected = healthStatus === status.id;
                return (
                  <div
                    key={status.id}
                    onClick={() => setHealthStatus(status.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${isSelected ? `${status.color} shadow-md scale-105 font-bold ring-2 ring-offset-2 ring-offset-background` : 'border-border bg-card hover:bg-muted text-muted-foreground'}`}
                  >
                    <span className="text-3xl">{status.icon}</span>
                    <span className="text-lg">{status.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Tratamiento si está enfermo */}
            {showTreatment && (
              <div className="mt-5 p-5 bg-red-50 dark:bg-red-950/40 rounded-xl border-2 border-red-200 dark:border-red-900 animate-in fade-in slide-in-from-top-2">
                <Label className="text-lg font-bold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                  💊 Tratamiento (Opcional)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-foreground">¿Qué remedio le aplicó?</Label>
                    <Input
                      placeholder="Ej: Vitamina, Antibiótico..."
                      value={treatmentDesc}
                      onChange={(e) => setTreatmentDesc(e.target.value)}
                      className="h-14 text-lg bg-card border-red-100 dark:border-red-900 focus:border-red-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-foreground">¿Qué cantidad (Dosis)?</Label>
                    <Input
                      placeholder="Ej: 10 ml, 1 pastilla..."
                      value={treatmentDosis}
                      onChange={(e) => setTreatmentDosis(e.target.value)}
                      className="h-14 text-lg bg-card border-red-100 dark:border-red-900 focus:border-red-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paso 4: Novedad Reproductiva */}
          {isFemale && (
            <div className="bg-purple-50/50 dark:bg-purple-950/30 p-5 rounded-lg border border-purple-100 dark:border-purple-900 shadow-sm">
              <div className="flex justify-between items-center gap-3 mb-4">
                <Label className="text-xl font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 cursor-pointer" onClick={() => setShowRepro(!showRepro)}>
                  <span>4.</span> 💕 Novedad de Cría o Celo
                </Label>
                <Button
                  type="button"
                  variant={showRepro ? "primary" : "outline"}
                  onClick={() => {
                    setShowRepro(!showRepro);
                    if (showRepro) setReproEvent('');
                  }}
                  className={`rounded-full px-4 shrink-0 ${showRepro ? 'bg-purple-600 hover:bg-purple-700' : 'text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 bg-card'}`}
                >
                  {showRepro ? 'Quitar' : '+ Añadir'}
                </Button>
              </div>

              {showRepro && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                  {[
                    { id: 'Celo', icon: '🔥' },
                    { id: 'Inseminacion', label: 'Inseminación', icon: '💉' },
                    { id: 'Diagnostico', label: 'Diagnóstico', icon: '👨‍⚕️' },
                    { id: 'Parto', icon: '🍼' }
                  ].map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setReproEvent(evt.id)}
                      className={`cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-1 transition-all ${reproEvent === evt.id ? 'border-purple-500 bg-purple-100 dark:bg-purple-950/60 font-bold text-purple-900 dark:text-purple-100 shadow-sm' : 'border-purple-200 dark:border-purple-800 bg-card hover:bg-purple-50 dark:hover:bg-purple-950/40 text-muted-foreground'}`}
                    >
                      <span className="text-2xl">{evt.icon}</span>
                      <span className="text-md">{evt.label || evt.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit / Cancel Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4 border-t border-border">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-1/3 h-16 text-xl rounded-lg border-2 border-border text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !animalId}
              className={`${onClose ? 'w-full sm:w-2/3' : 'w-full'} h-16 text-2xl font-bold rounded-lg shadow-lg bg-emerald-600 hover:bg-emerald-700 hover:shadow-xl transition-all`}
            >
              {isSubmitting ? 'Guardando...' : '💾 Guardar Registro'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );

  if (onClose) {
    return (
      <div className="p-2 sm:p-6 bg-card rounded-xl">
        <h2 className="text-3xl font-extrabold text-foreground mb-6 text-center tracking-tight">Registro de Corral</h2>
        {formContent}
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-xl border-0 rounded-xl overflow-hidden bg-card">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8">
        <CardTitle className="text-3xl font-extrabold text-center text-white drop-shadow-sm">
          Registro de Corral
        </CardTitle>
        <p className="text-emerald-100 text-center mt-2 text-lg">Complete los datos de sus animales fácilmente</p>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 bg-muted/30">
        {formContent}
      </CardContent>
    </Card>
  );
};
