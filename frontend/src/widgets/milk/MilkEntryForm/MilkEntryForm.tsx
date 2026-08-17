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

const optionalNumber = (schema: z.ZodNumber) => z.preprocess(
  (value) => value === '' || Number.isNaN(value) ? undefined : value,
  schema.optional(),
);

const milkEntrySchema = z.object({
  animal_id: z.number().min(1, 'Selecciona un animal'),
  liters: z.number().min(0.1, 'Mínimo 0.1 litros').max(80, 'Máximo 80 litros'),
  milking_session: z.enum(['AM', 'PM', 'Extra']),
  date: z.string().min(1, 'Selecciona la fecha'),
  fat_percentage: optionalNumber(z.number().min(0).max(100)),
  protein_percentage: optionalNumber(z.number().min(0).max(100)),
  somatic_cells: optionalNumber(z.number().min(0).max(1000000)),
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-full flex-col gap-5" aria-busy={isSubmitting}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Animal Selector */}
        <div className="space-y-2">
          <Label htmlFor="animal_id" className="text-sm font-bold">Animal</Label>
          <Select
            value={selectedAnimalId?.toString()}
            onValueChange={(value) => setValue('animal_id', parseInt(value), { shouldValidate: true })}
            disabled={loadingAnimals}
          >
            <SelectTrigger id="animal_id" className="h-12 rounded-xl text-base sm:text-sm" aria-invalid={Boolean(errors.animal_id)}>
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
          {!loadingAnimals && (animals?.length ?? 0) === 0 && !errors.animal_id && (
            <p className="text-sm text-amber-700 dark:text-amber-300" role="status">No hay vacas vivas disponibles.</p>
          )}
        </div>

        {/* Litros Input */}
        <div className="space-y-2">
          <Label htmlFor="liters" className="text-sm font-bold">Litros ordeñados</Label>
          <Input
            id="liters"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            max="80"
            {...register('liters', { valueAsNumber: true })}
            placeholder="Ej: 8.5"
            className="h-12 rounded-xl text-base sm:text-sm"
          />
          {errors.liters && (
            <p className="text-xs text-red-500 font-medium mt-0.5">{errors.liters.message}</p>
          )}
        </div>

        {/* Sesión de Ordeño Segmented Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-bold">Turno</Label>
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
                aria-pressed={watch('milking_session') === session.value}
                className={cn(
                  'min-h-12 rounded-xl border-2 px-1.5 py-2 text-xs font-bold outline-none transition-all duration-200 active:scale-95 sm:text-sm',
                  watch('milking_session') === session.value
                    ? 'border-blue-700 bg-blue-50 text-blue-900 shadow-sm dark:bg-blue-950/50 dark:text-blue-100'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                {session.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha Input */}
        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-bold">Fecha</Label>
          <Input
            id="date"
            type="date"
            max={getTodayColombia()}
            {...register('date')}
            className="h-12 rounded-xl text-base sm:text-sm"
          />
          {errors.date && <p className="text-xs font-medium text-red-500">{errors.date.message}</p>}
        </div>
      </div>

      <details className="rounded-xl border border-border bg-muted/30 open:bg-card">
        <summary className="flex min-h-12 cursor-pointer items-center px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Agregar datos de calidad (opcional)
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t border-border p-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fat_percentage" className="text-sm font-semibold">Grasa (%)</Label>
            <Input
              id="fat_percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register('fat_percentage', { valueAsNumber: true })}
              placeholder="Ej: 3.5"
              className="h-12 rounded-xl text-base sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protein_percentage" className="text-sm font-semibold">Proteína (%)</Label>
            <Input
              id="protein_percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register('protein_percentage', { valueAsNumber: true })}
              placeholder="Ej: 3.2"
              className="h-12 rounded-xl text-base sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="somatic_cells" className="text-sm font-semibold">Células somáticas</Label>
            <Input
              id="somatic_cells"
              type="number"
              min="0"
              max="1000000"
              {...register('somatic_cells', { valueAsNumber: true })}
              placeholder="Ej: 200000"
              className="h-12 rounded-xl text-base sm:text-sm"
            />
          </div>
        </div>
      </details>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-bold">Observación (opcional)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Ej: la leche salió diferente o la vaca estaba inquieta."
          maxLength={500}
          className="min-h-20 rounded-xl text-base sm:text-sm"
        />
      </div>

      <div className="sticky bottom-0 z-10 mt-auto grid grid-cols-2 gap-2 border-t border-border bg-card px-3 py-3 -mx-3 sm:-mx-5 sm:px-5">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full rounded-xl font-bold active:scale-95"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || loadingAnimals}
          className={`min-h-12 w-full rounded-xl bg-blue-700 text-base font-bold text-white hover:bg-blue-800 active:scale-95 ${onCancel ? '' : 'col-span-2'}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar ordeño'
          )}
        </Button>
      </div>
    </form>
  );
}
