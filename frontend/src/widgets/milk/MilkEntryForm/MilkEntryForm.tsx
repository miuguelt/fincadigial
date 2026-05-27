import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { milkService } from '@/entities/milk/api/milk.service';
import { useToast } from '@/app/providers/ToastContext';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

const milkEntrySchema = z.object({
  animal_id: z.number().min(1, 'Selecciona un animal'),
  liters: z.number().min(0.1, 'Mínimo 0.1 litros').max(80, 'Máximo 80 litros'),
  milking_session: z.enum(['AM', 'PM', 'Extra']),
  date: z.string(),
  fat_percentage: z.number().min(0).max(100).optional().or(z.literal('')),
  protein_percentage: z.number().min(0).max(100).optional().or(z.literal('')),
  somatic_cells: z.number().min(0).max(1000000).optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

type MilkEntryForm = z.infer<typeof milkEntrySchema>;

interface MilkEntryFormWidgetProps {
  onSuccess?: () => void;
  defaultDate?: string;
  onCancel?: () => void;
}

export function MilkEntryFormWidget({ onSuccess, defaultDate, onCancel }: MilkEntryFormWidgetProps) {
  const { showToast } = useToast();
  const { animals, loading: loadingAnimals } = useAnimals({
    limit: 200,
    sex: 'Hembra',
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
  } = useForm<MilkEntryForm>({
    resolver: zodResolver(milkEntrySchema),
    defaultValues: {
      date: defaultDate || getTodayColombia(),
      milking_session: 'AM',
    },
  });

  const selectedAnimalId = watch('animal_id');

  const onSubmit = async (data: MilkEntryForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        animal_id: data.animal_id,
        liters: data.liters,
        milking_session: data.milking_session,
        date: data.date,
        fat_percentage: data.fat_percentage || undefined,
        protein_percentage: data.protein_percentage || undefined,
        somatic_cells: data.somatic_cells || undefined,
        notes: data.notes || undefined,
      };

      await milkService.create(payload);
      showToast('Producción de leche registrada correctamente', 'success');
      reset({
        date: data.date,
        milking_session: data.milking_session === 'AM' ? 'PM' : 'AM',
      });
      onSuccess?.();
    } catch (error: any) {
      showToast(error.message || 'Error al registrar producción', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Animal Selector */}
        <div className="space-y-2">
          <Label htmlFor="animal_id" className="text-sm font-semibold text-gray-700">Animal</Label>
          <Select
            value={selectedAnimalId?.toString()}
            onValueChange={(value) => setValue('animal_id', parseInt(value))}
          >
            <SelectTrigger className="h-11 md:h-12 text-base md:text-sm rounded-xl border-gray-200">
              <SelectValue placeholder={loadingAnimals ? 'Cargando...' : 'Seleccionar animal'} />
            </SelectTrigger>
            <SelectContent>
              {animals?.map((animal: any) => (
                <SelectItem key={animal.id} value={animal.id.toString()}>
                  {animal.record} - {animal.alias || animal.breed?.name || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.animal_id && (
            <p className="text-xs text-red-500 font-medium mt-0.5">{errors.animal_id.message}</p>
          )}
        </div>

        {/* Litros Input */}
        <div className="space-y-2">
          <Label htmlFor="liters" className="text-sm font-semibold text-gray-700">Cantidad (Litros)</Label>
          <Input
            id="liters"
            type="number"
            step="0.1"
            min="0.1"
            max="80"
            {...register('liters', { valueAsNumber: true })}
            placeholder="Ej: 8.5"
            className="h-11 md:h-12 text-base md:text-sm rounded-xl border-gray-200"
          />
          {errors.liters && (
            <p className="text-xs text-red-500 font-medium mt-0.5">{errors.liters.message}</p>
          )}
        </div>

        {/* Sesión de Ordeño Segmented Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Sesión de Ordeño</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'AM', label: 'Mañana (AM)' },
              { value: 'PM', label: 'Tarde (PM)' },
              { value: 'Extra', label: 'Extra' },
            ].map((session) => (
              <button
                key={session.value}
                type="button"
                onClick={() => setValue('milking_session', session.value as any)}
                className={cn(
                  "py-3 px-2 rounded-xl text-xs md:text-sm font-bold border-2 transition-all duration-200 active:scale-95 select-none outline-none",
                  watch('milking_session') === session.value
                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                )}
              >
                {session.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha Input */}
        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-semibold text-gray-700">Fecha de Registro</Label>
          <Input 
            id="date" 
            type="date" 
            {...register('date')} 
            className="h-11 md:h-12 text-base md:text-sm rounded-xl border-gray-200"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 my-4 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Parámetros de Calidad (Opcional)</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fat_percentage" className="text-xs font-semibold text-gray-600">% Grasa</Label>
            <Input
              id="fat_percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register('fat_percentage', { valueAsNumber: true })}
              placeholder="Ej: 3.5"
              className="h-11 text-base md:text-sm rounded-xl border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protein_percentage" className="text-xs font-semibold text-gray-600">% Proteína</Label>
            <Input
              id="protein_percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register('protein_percentage', { valueAsNumber: true })}
              placeholder="Ej: 3.2"
              className="h-11 text-base md:text-sm rounded-xl border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="somatic_cells" className="text-xs font-semibold text-gray-600">Cel. Somáticas</Label>
            <Input
              id="somatic_cells"
              type="number"
              min="0"
              max="1000000"
              {...register('somatic_cells', { valueAsNumber: true })}
              placeholder="Ej: 200000"
              className="h-11 text-base md:text-sm rounded-xl border-gray-200"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Observaciones</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Notas adicionales sobre la salud del animal o del ordeño..."
          maxLength={500}
          className="rounded-xl border-gray-200 min-h-[80px]"
        />
      </div>

      <div className="flex gap-3 pt-3">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            className="w-1/3 h-12 rounded-xl text-gray-600 active:scale-95 transition-transform" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl active:scale-95 transition-transform font-semibold text-base"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            'Registrar Producción'
          )}
        </Button>
      </div>
    </form>
  );
}
