import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { AlertTriangle, ArrowLeft, Save, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { animalsService } from '@/entities/animal/api/animal.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export default function QuickDisease() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('quick');
    setSearchParams(newParams, { replace: true });
  };
  
  const [animalId, setAnimalId] = useState<number | null>(null);
  const [diseaseId, setDiseaseId] = useState<number | null>(null);
  const [status, setStatus] = useState('Activo');
  const [date, setDate] = useState(getTodayColombia());
  const [loading, setLoading] = useState(false);
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<{ value: number; label: string }[]>([]);

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

  // Cargar enfermedades
  React.useEffect(() => {
    async function loadDiseases() {
      try {
        const response = await diseaseService.getDiseases({ limit: 100 });
        const diseases = Array.isArray(response) ? response : (response as any).data || [];
        const options = diseases.map((d: any) => ({
          value: d.id,
          label: d.name || `Enfermedad ${d.id}`
        }));
        setDiseaseOptions(options);
      } catch (error) {
        console.error('Error loading diseases:', error);
        showToast('Error al cargar enfermedades', 'error');
      }
    }
    loadDiseases();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId || !diseaseId) {
      showToast('Por favor seleccione animal y enfermedad', 'error');
      return;
    }

    setLoading(true);
    const payload = {
      animal_id: animalId,
      disease_id: diseaseId,
      diagnosis_date: date,
      status,
      instructor_id: user?.id || 0 // instructor_id requerido por el backend
    };

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await offlineQueue.enqueue('POST', 'animal-diseases', payload);
        showToast('Enfermedad guardada localmente. Se sincronizará cuando haya conexión.', 'success');
      } else {
        // Online: enviar directamente
        await animalDiseasesService.createAnimalDisease(payload);
        showToast('Enfermedad registrada exitosamente', 'success');
      }
      handleClose();
    } catch (error) {
      console.error('Error creating disease:', error);
      showToast('Error al registrar enfermedad', 'error');
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
            <AlertTriangle className="h-5 w-5 text-danger" />
            Registrar Enfermedad
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
              <Label htmlFor="disease">Enfermedad *</Label>
              <Select value={diseaseId?.toString()} onValueChange={(v) => setDiseaseId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar enfermedad" />
                </SelectTrigger>
                <SelectContent>
                  {diseaseOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de diagnóstico *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Recuperado">Recuperado</SelectItem>
                  <SelectItem value="Crónico">Crónico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Enfermedad'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
