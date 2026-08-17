import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Pill, ArrowLeft, Save, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalsService } from '@/entities/animal/api/animal.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';

export default function QuickTreatment() {
  useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('quick');
    setSearchParams(newParams, { replace: true });
  };

  const [animalId, setAnimalId] = useState<number | null>(null);
  const [medicationId, setMedicationId] = useState<number | null>(null);
  const [dose, setDose] = useState<string>('');
  const [date, setDate] = useState(getTodayColombia());
  const [loading, setLoading] = useState(false);
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<{ value: number; label: string }[]>([]);

  // Cargar animales activos
  React.useEffect(() => {
    async function loadAnimals() {
      try {
        const response = await animalsService.getAnimals({ limit: 100, status: 'Vivo' });
        const animals = Array.isArray(response) ? response : (response as any).data || [];
        const options = animals.map((a: any) => ({
          value: a.id,
          label: `${a.record} - ${a.breed?.name || 'Sin raza'}`
        }));
        setAnimalOptions(options);
      } catch (error) {
        console.error('Error loading animals:', error);
        showToast('Error al cargar animales', 'error');
      }
    }
    loadAnimals();
  }, [showToast]);

  // Cargar medicamentos
  React.useEffect(() => {
    async function loadMedications() {
      try {
        const response = await medicationsService.getMedications({ limit: 100 });
        const medications = Array.isArray(response) ? response : (response as any).data || [];
        const options = medications.map((m: any) => ({
          value: m.id,
          label: m.name || `Medicamento ${m.id}`
        }));
        setMedicationOptions(options);
      } catch (error) {
        console.error('Error loading medications:', error);
        showToast('Error al cargar medicamentos', 'error');
      }
    }
    loadMedications();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !medicationId || !dose) {
      showToast('Por favor complete todos los campos requeridos', 'error');
      return;
    }

    setLoading(true);
    const payload = {
      animal_id: animalId,
      medication_id: medicationId,
      dosis: dose,
      frequency: 'Dosis única',
      treatment_date: date,
      description: 'Tratamiento rápido',
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue('POST', 'treatments', payload);
        showToast('Tratamiento guardado localmente. Se sincronizará cuando haya conexión.', 'success');
      } else {
        // Online: enviar directamente
        await treatmentsService.createTreatment(payload);
        showToast('Tratamiento registrado exitosamente', 'success');
      }
      if (isOnline) emitDataRefresh('treatments');
      handleClose();
    } catch (error) {
      console.error('Error creating treatment:', error);
      showToast('Error al registrar tratamiento', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Button
        variant="ghost"
        onClick={handleClose}
        className="mb-4 text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Pill className="h-5 w-5 text-success" />
            Registrar Tratamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isOnline && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning-foreground font-bold">
                <WifiOff className="h-4 w-4 text-warning" />
                Modo sin conexión - El registro se guardará localmente
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="animal">Animal *</Label>
              <Select value={animalId?.toString()} onValueChange={(v) => setAnimalId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar animal" />
                </SelectTrigger>
                <SelectContent>
                  {animalOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medication">Medicamento *</Label>
              <Select value={medicationId?.toString()} onValueChange={(v) => setMedicationId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar medicamento" />
                </SelectTrigger>
                <SelectContent>
                  {medicationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dose">Dosis *</Label>
              <Input
                id="dose"
                type="text"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="Ej: 500mg cada 8 horas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de tratamiento *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Tratamiento'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
