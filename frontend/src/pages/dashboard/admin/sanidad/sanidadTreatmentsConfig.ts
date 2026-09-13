import type { TreatmentResponse, TreatmentInput } from '@/shared/api/generated/swaggerTypes';
import type { CRUDFieldType, CRUDFormSection } from '@/shared/types/crud';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { LookupOption } from './sanidadCasesConfig';

export type TreatmentRow = TreatmentResponse & { [k: string]: any };

/** Opción de episodio enriquecida para filtrar por la res elegida. */
export type EpisodeLookupOption = LookupOption & { animal_id?: number };

/** Tiempo relativo en español (ej: "hace 2 días", "hoy"). */
export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `en ${Math.abs(diffDays)} d`;
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `hace ${diffDays} d`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `hace ${weeks} sem`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `hace ${months} m`;
  }
  const years = Math.floor(diffDays / 365);
  return `hace ${years} a`;
}

export const CASE_STATUS_DOT: Record<string, string> = {
  Activo: 'bg-red-500 animate-pulse',
  'En tratamiento': 'bg-sky-500',
  'En Tratamiento': 'bg-sky-500',
  Observación: 'bg-amber-500',
  Recuperado: 'bg-emerald-500',
  Tratado: 'bg-emerald-500',
};

export interface TreatmentsFormOptions {
  animalOptions: LookupOption[];
  userOptions: LookupOption[];
  episodeOptions: EpisodeLookupOption[];
}

export function buildTreatmentsFormSections({
  animalOptions,
  userOptions,
  episodeOptions,
}: TreatmentsFormOptions): CRUDFormSection<any>[] {
  return [
    {
      title: '1. Res atendida y motivo',
      gridCols: 2,
      fields: [
        {
          name: 'animal_id' as any,
          label: 'Res atendida (Chapa / Arete)',
          type: 'searchable-select' as CRUDFieldType,
          required: true,
          options: animalOptions,
          placeholder: 'Buscar por número de chapa o arete...',
          helperText: 'Res a la que se le aplicó el tratamiento',
          colSpan: 2,
        },
        {
          name: 'treatment_date' as any,
          label: '¿Cuándo se aplicó?',
          type: 'date' as CRUDFieldType,
          required: true,
          helperText: 'Fecha de la aplicación (por defecto hoy)',
        },
        {
          name: 'performed_by' as any,
          label: '¿Quién lo aplicó?',
          type: 'searchable-select' as CRUDFieldType,
          options: userOptions,
          placeholder: 'Seleccionar responsable o veterinario...',
          helperText: 'Persona encargada de la aplicación',
        },
        {
          name: 'diagnosis' as any,
          label: 'Motivo o diagnóstico',
          type: 'text' as CRUDFieldType,
          required: true,
          placeholder: 'Ej: Mastitis, Desparasitación, Fiebre, Cojera...',
          helperText: 'Toca una opción frecuente o escribe el motivo',
          suggestions: [
            'Mastitis',
            'Purgado / Desparasitación',
            'Fiebre / Tristeza',
            'Cojera / Casco',
            'Vitamina / Calcio',
            'Herida / Cura',
            'Diarrea',
          ],
          colSpan: 2,
        },
      ],
    },
    {
      title: '2. Dosis, frecuencia y retiro sanitario',
      gridCols: 2,
      fields: [
        {
          name: 'dosis' as any,
          label: 'Dosis suministrada',
          type: 'text' as CRUDFieldType,
          required: true,
          placeholder: 'Ej: 10 cc, 20 cc, 1 ampolla...',
          helperText: 'Cantidad administrada',
          suggestions: ['5 cc', '10 cc', '20 cc', '50 cc', 'Dosis única'],
        },
        {
          name: 'frequency' as any,
          label: 'Frecuencia de aplicación',
          type: 'text' as CRUDFieldType,
          required: true,
          placeholder: 'Ej: Dosis única, Cada 24 horas...',
          helperText: 'Intervalo de tiempo entre dosis',
          suggestions: ['Dosis única', 'Cada 24 horas', 'Cada 12 horas', 'Por 3 días'],
        },
        {
          name: 'withdrawal_days' as any,
          label: 'Días de retiro (leche / carne)',
          type: 'number' as CRUDFieldType,
          placeholder: 'Ej: 0',
          helperText: 'Días de espera ICA sin comercializar leche ni carne',
          suggestions: [
            { label: '0 días (Sin retiro)', value: 0 },
            { label: '3 días', value: 3 },
            { label: '5 días', value: 5 },
            { label: '7 días', value: 7 },
          ],
        },
        {
          name: 'cost' as any,
          label: 'Costo directo (COP)',
          type: 'number' as CRUDFieldType,
          placeholder: 'Ej: 35000',
          helperText: 'Valor del tratamiento en pesos colombianos',
        },
      ],
    },
    {
      title: '3. Seguimiento y notas (Opcional)',
      gridCols: 1,
      fields: [
        {
          name: 'animal_disease_id' as any,
          label: 'Vincular a caso clínico (opcional)',
          type: 'searchable-select' as CRUDFieldType,
          options: episodeOptions,
          placeholder: 'Vincular a caso clínico existente (opcional)...',
          emptyMessage: 'Esta res no tiene casos clínicos activos registrados. Puedes guardar sin asociar ninguno.',
          helperText: 'Opcional. Solo si hace parte de un caso clínico abierto. Si es de rutina, déjalo vacío.',
          dependsOn: 'animal_id',
          optionsFilter: (animalId: any, options) => {
            if (!animalId) return [];
            return options.filter((option) => Number((option as EpisodeLookupOption).animal_id) === Number(animalId));
          },
        },
        {
          name: 'description' as any,
          label: 'Medicamento / Protocolo aplicado',
          type: 'textarea' as CRUDFieldType,
          placeholder: 'Nombre comercial del fármaco, principio activo o detalles del procedimiento...',
        },
        {
          name: 'observations' as any,
          label: 'Observaciones y evolución',
          type: 'textarea' as CRUDFieldType,
          placeholder: 'Notas de seguimiento, mejoría observada o advertencias para el ordeño...',
        },
      ],
    },
  ];
}

/** Mapeo de respuesta a formulario. */
export const mapResponseToForm = (item: TreatmentRow): TreatmentInput & { [k: string]: any } => ({
  animal_id: item.animal_id ?? (item as any)?.animal?.id ?? (item as any)?.animals?.id,
  treatment_date: (item as any).treatment_date || (item as any).date || getTodayColombia(),
  diagnosis: (item as any).diagnosis ?? (item as any).description ?? '',
  description: (item as any).description ?? (item as any).diagnosis ?? '',
  dosis: (item as any).dosis ?? (item as any).dose ?? '',
  frequency: (item as any).frequency ?? (item as any).frecuencia ?? '',
  withdrawal_days: item.withdrawal_days !== undefined && item.withdrawal_days !== null ? Number(item.withdrawal_days) : 0,
  cost: item.cost !== undefined && item.cost !== null ? Number(item.cost) : undefined,
  performed_by: item.performed_by ?? (item as any).veterinarian ?? (item as any).performer?.id ?? undefined,
  animal_disease_id: item.animal_disease_id ?? (item as any).animal_disease?.id ?? undefined,
  observations: (item as any).observations ?? (item as any).notes ?? '',
});

/** Validación de formulario. */
export const validateForm = (formData: TreatmentInput & { [k: string]: any }): string | null => {
  if (!formData.animal_id || Number(formData.animal_id) <= 0) {
    return 'Debe seleccionar un animal para el tratamiento.';
  }
  if (!formData.treatment_date) {
    return 'La fecha del tratamiento es obligatoria.';
  }
  if (!formData.diagnosis?.trim() && !formData.description?.trim()) {
    return 'El diagnóstico o motivo del tratamiento es obligatorio.';
  }
  if (!formData.dosis?.trim()) {
    return 'La dosis es obligatoria (ej: 10 ml, 1 ampolla, etc.).';
  }
  if (!formData.frequency?.trim()) {
    return 'La frecuencia es obligatoria (ej: Dosis única, Cada 12 horas, etc.).';
  }
  if (formData.withdrawal_days !== undefined && formData.withdrawal_days !== null && Number(formData.withdrawal_days) < 0) {
    return 'Los días de retiro no pueden ser un valor negativo.';
  }
  if (formData.cost !== undefined && formData.cost !== null && Number(formData.cost) < 0) {
    return 'El costo del tratamiento no puede ser negativo.';
  }
  return null;
};

/** Datos iniciales. */
export const buildInitialFormData = (defaultUserId?: number): TreatmentInput & { [k: string]: any } => ({
  animal_id: undefined as any,
  treatment_date: getTodayColombia(),
  diagnosis: '',
  description: '',
  dosis: '',
  frequency: 'Dosis única',
  withdrawal_days: 0,
  cost: undefined,
  performed_by: defaultUserId ?? undefined,
  animal_disease_id: undefined as any,
  observations: '',
});

export type TreatmentQuickFilter = 'todos' | 'retiro' | 'recientes' | 'con_costo';

/**
 * Filtro en memoria de la vista: retiro activo, últimos 30 días o con costo.
 * Antes estos filtros eran solo decorativos; ahora filtran la tabla de verdad.
 */
export function buildTreatmentFilterItems(activeFilterTab: TreatmentQuickFilter) {
  return (items: TreatmentRow[]): TreatmentRow[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const matches = (item: TreatmentRow): boolean => {
      const days = Number(item.withdrawal_days) || 0;
      const endDateStr = item.withdrawal_end_date;
      if (activeFilterTab === 'retiro') {
        if (days <= 0 && !endDateStr) return false;
        let endDate: Date;
        if (endDateStr) {
          endDate = new Date(String(endDateStr));
        } else if (item.treatment_date) {
          endDate = new Date(String(item.treatment_date));
          endDate.setDate(endDate.getDate() + days);
        } else {
          return false;
        }
        endDate.setHours(0, 0, 0, 0);
        return endDate.getTime() >= today.getTime();
      }
      if (activeFilterTab === 'recientes') {
        if (!item.treatment_date) return false;
        return new Date(String(item.treatment_date)) >= thirtyDaysAgo;
      }
      if (activeFilterTab === 'con_costo') {
        return item.cost !== undefined && item.cost !== null && Number(item.cost) > 0;
      }
      return true;
    };
    return items.filter(matches);
  };
}
