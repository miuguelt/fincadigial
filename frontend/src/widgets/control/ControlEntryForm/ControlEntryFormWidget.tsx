import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { controlService } from '@/entities/control/api/control.service';
import { useToast } from '@/app/providers/ToastContext';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ControlEntryCommonFields } from './ControlEntryCommonFields';
import { ControlEntryModeFields } from './ControlEntryModeFields';
import {
  MODE_COPY,
  buildControlEntryPayload,
  getControlEntryDefaults,
  getControlEntrySchema,
} from './controlEntryForm.model';
import type {
  ControlEntryFormValues,
  ControlEntryFormWidgetProps,
} from './ControlEntryForm.types';

/**
 * Formulario de control. El `mode` decide qué campos se piden: 'weight' pesa y
 * pregunta cómo se veía el animal, 'health' registra la novedad, 'full' es el
 * control completo. Los campos viven en ControlEntryCommonFields /
 * ControlEntryModeFields y las reglas en controlEntryForm.model.
 */
export function ControlEntryFormWidget({
  onSuccess,
  defaultDate,
  onCancel,
  mode = 'full',
}: ControlEntryFormWidgetProps) {
  const { showToast } = useToast();
  const { animals, loading: loadingAnimals } = useAnimals({
    limit: 500,
    status: 'Vivo',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = MODE_COPY[mode];
  const checkupDate = defaultDate || getTodayColombia();
  const submitColor = mode === 'weight'
    ? 'bg-amber-600 text-white hover:bg-amber-700'
    : 'bg-emerald-700 text-white hover:bg-emerald-800';

  const form = useForm<ControlEntryFormValues>({
    resolver: zodResolver(getControlEntrySchema(mode)),
    defaultValues: getControlEntryDefaults(mode, checkupDate),
  });

  const onSubmit = async (data: ControlEntryFormValues) => {
    setIsSubmitting(true);
    try {
      await controlService.create(buildControlEntryPayload(data, mode));
      showToast(copy.successMessage, 'success');
      form.reset(getControlEntryDefaults(mode, data.checkup_date));
      onSuccess?.();
    } catch (error: any) {
      showToast(error?.message || copy.errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-col gap-5"
      aria-busy={isSubmitting}
    >
      <div className="space-y-5">
        <ControlEntryCommonFields
          form={form}
          animals={animals ?? []}
          loadingAnimals={loadingAnimals}
        />

        <ControlEntryModeFields form={form} mode={mode} />
      </div>

      <div className="sticky bottom-0 z-10 mt-auto grid grid-cols-2 gap-2 border-t border-border bg-card px-3 py-3 -mx-3 sm:-mx-5 sm:px-5">
        {onCancel && (
          <Button type="button" variant="outline" className="min-h-12 w-full font-bold" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || loadingAnimals}
          className={`min-h-12 w-full font-bold ${onCancel ? '' : 'col-span-2'} ${submitColor}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : (
            copy.submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
