import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { controlService } from '@/entities/control/api/control.service';
import { useToast } from '@/app/providers/ToastContext';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { Loader2 } from 'lucide-react';

const controlEntrySchema = z.object({
  animal_id: z.number().min(1, 'Selecciona un animal'),
  checkup_date: z.string(),
  weight: z.number().min(1, 'El peso debe ser mayor a 0').optional().or(z.literal('')),
  height: z.number().min(0.1, 'La altura debe ser mayor a 0').optional().or(z.literal('')),
  health_status: z.string().min(1, 'Selecciona un estado de salud'),
  description: z.string().max(500).optional(),
});

type ControlEntryForm = z.infer<typeof controlEntrySchema>;

interface ControlEntryFormWidgetProps {
  onSuccess?: () => void;
  defaultDate?: string;
  onCancel?: () => void;
}

export function ControlEntryFormWidget({ onSuccess, defaultDate, onCancel }: ControlEntryFormWidgetProps) {
  const { showToast } = useToast();
  const { animals, loading: loadingAnimals } = useAnimals({
    limit: 500,
    status: 'Vivo',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ControlEntryForm>({
    resolver: zodResolver(controlEntrySchema),
    defaultValues: {
      checkup_date: defaultDate || getTodayColombia(),
      health_status: 'Sano',
    },
  });

  const selectedAnimalId = watch('animal_id');

  const onSubmit = async (data: ControlEntryForm) => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        animal_id: data.animal_id,
        checkup_date: data.checkup_date,
        health_status: data.health_status,
      };

      if (data.weight) payload.weight = data.weight;
      if (data.height) payload.height = data.height;
      if (data.description) payload.description = data.description;

      await controlService.create(payload);
      showToast('Control registrado correctamente', 'success');
      reset({
        checkup_date: data.checkup_date,
        health_status: 'Sano',
      });
      onSuccess?.();
    } catch (error: any) {
      showToast(error.message || 'Error al registrar control', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="animal_id">Animal</Label>
              <Select
                value={selectedAnimalId?.toString()}
                onValueChange={(value) => setValue('animal_id', parseInt(value))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={loadingAnimals ? 'Cargando...' : 'Seleccionar animal'} />
                </SelectTrigger>
                <SelectContent>
                  {animals?.map((animal: any) => (
                    <SelectItem key={animal.id} value={animal.id.toString()}>
                      {animal.record || animal.registro} - {animal.alias || animal.name || animal.nombre || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.animal_id && (
                <p className="text-sm text-red-500">{errors.animal_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkup_date">Fecha de Control</Label>
              <Input id="checkup_date" type="date" className="h-12" {...register('checkup_date')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_status">Estado de Salud</Label>
              <Select
                value={watch('health_status')}
                onValueChange={(value) => setValue('health_status', value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Seleccione el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excelente">Excelente (Muy bien)</SelectItem>
                  <SelectItem value="Sano">Sano (Normal)</SelectItem>
                  <SelectItem value="Regular">Regular (Decaído)</SelectItem>
                  <SelectItem value="Malo">Malo (Enfermo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (Kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="1"
                  min="0"
                  className="h-12"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="Ej: 450"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Altura (m)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-12"
                  {...register('height', { valueAsNumber: true })}
                  placeholder="Ej: 1.5"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tratamientos u Observaciones</Label>
            <Textarea
              id="description"
              className="resize-none"
              rows={3}
              {...register('description')}
              placeholder="Describa síntomas, medicamentos aplicados, dosis, etc."
              maxLength={500}
            />
          </div>

          <div className="flex gap-4 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" className="w-1/3 h-12" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Registrar Control'
              )}
            </Button>
          </div>
    </form>
  );
}
