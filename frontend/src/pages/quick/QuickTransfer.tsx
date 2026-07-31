import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { MapPin, ArrowLeft, Save, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';

export default function QuickTransfer() {
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
  const [fieldId, setFieldId] = useState<number | null>(null);
  const [date, setDate] = useState(getTodayColombia());
  const [loading, setLoading] = useState(false);
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [fieldOptions, setFieldOptions] = useState<{ value: number; label: string }[]>([]);

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

  // Cargar campos
  React.useEffect(() => {
    async function loadFields() {
      try {
        const response = await fieldService.getFields({ limit: 100 });
        const fields = Array.isArray(response) ? response : (response as any).data || [];
        const options = fields.map((f: any) => ({
          value: f.id,
          label: f.name || `Campo ${f.id}`
        }));
        setFieldOptions(options);
      } catch (error) {
        console.error('Error loading fields:', error);
        showToast('Error al cargar campos', 'error');
      }
    }
    loadFields();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !fieldId) {
      showToast('Por favor seleccione animal y campo', 'error');
      return;
    }

    setLoading(true);
    const payload = {
      animal_id: animalId,
      field_id: fieldId,
      assignment_date: date
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue('POST', 'animal-fields', payload);
        showToast('Traslado guardado localmente. Se sincronizará cuando haya conexión.', 'success');
      } else {
        // Online: enviar directamente
        await animalFieldsService.createAnimalField(payload);
        showToast('Traslado registrado exitosamente', 'success');
      }
      emitDataRefresh('animal-fields');
      handleClose();
    } catch (error) {
      console.error('Error creating transfer:', error);
      showToast('Error al registrar traslado', 'error');
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
            <MapPin className="h-5 w-5 text-success" />
            Trasladar Animal
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
              <Label htmlFor="field">Campo de destino *</Label>
              <Select value={fieldId?.toString()} onValueChange={(v) => setFieldId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar campo" />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de traslado *</Label>
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
              {loading ? 'Guardando...' : 'Guardar Traslado'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
