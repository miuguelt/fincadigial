import { Activity, AlertCircle, AlertTriangle, Calendar, CheckCircle2, ChevronRight, Ruler, Scale } from 'lucide-react';
import { controlService } from '@/entities/control/api/control.service';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig, CRUDFormSection } from '@/shared/types/crud';
import { AnimalLink, AnimalGrowthLink } from '@/entities/animal/ui';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ControlDetailExpanded } from './components/ControlDetailExpanded';
import { formatAnimalHeight, parseDateOnlyLocal } from './controlPage.utils';

/** Fila de la tabla de controles (respuesta cruda del API). */
export type ControlRow = ControlResponse;

/** Acceso del usuario al CRUD: true cuando es campesino (permisos reducidos). */
export type ControlCrudAccess = boolean;

export type ControlForm = {
  animal_id: number;
  checkup_date: string;
  weight?: number;
  height?: number;
  health_status?: string;
  description?: string;
};

const STATUS_OPTIONS = [
  { value: 'Excelente', label: 'Excelente' }, { value: 'Bueno', label: 'Bueno' },
  { value: 'Regular', label: 'Regular' }, { value: 'Malo', label: 'Malo' }, { value: 'Sano', label: 'Sano' },
];

function getStatusBadgeStyles(status: string): string {
  if (['Excelente', 'Bueno', 'Sano'].includes(status)) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (status === 'Regular') {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }
  if (['Malo', 'Enfermo', 'Crítico'].includes(status)) {
    return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
  }
  return 'bg-muted text-muted-foreground border-border';
}

function getStatusIcon(status: string) {
  if (['Excelente', 'Bueno', 'Sano'].includes(status)) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  }
  if (status === 'Regular') {
    return <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  }
  if (['Malo', 'Enfermo', 'Crítico'].includes(status)) {
    return <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />;
  }
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />;
}

function renderControlCard(animalOptions: { value: number; label: string }[]) {
  return (item: ControlResponse & { [k: string]: any }, openDetail?: (target: any) => void) => {
    const label = animalOptions.find(o => o.value === item.animal_id)?.label || `Animal #${item.animal_id}`;
    const date = (item as any)?.checkup_date ?? (item as any)?.control_date;
    const status = (item as any)?.health_status ?? (item as any)?.healt_status ?? '-';
    const desc = (item as any)?.description ?? (item as any)?.observations;
    const critical = ['Malo', 'Enfermo', 'Crítico'].includes(status);
    const parsedDate = date ? parseDateOnlyLocal(String(date)) : null;
    const formattedHeight = formatAnimalHeight(item.height);

    return (
      <div
        className={`group/control-card flex h-full flex-col justify-between p-4 sm:p-5 transition-colors cursor-pointer ${
          critical
            ? 'bg-red-50/40 dark:bg-red-950/20'
            : 'hover:bg-muted/30'
        }`}
        onClick={() => openDetail?.(item)}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2 pr-12">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Animal
              </div>
              <div
                className="fit-clamp text-base font-extrabold text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                {item.animal_id ? (
                  <AnimalLink id={item.animal_id} label={label} />
                ) : (
                  <span className="text-muted-foreground">Sin identificar</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide border ${getStatusBadgeStyles(status)}`}
            >
              {getStatusIcon(status)}
              <span>{status}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
              <Scale className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Peso</p>
                <p className="fit-clamp text-xs font-bold text-foreground">
                  {item.weight != null ? `${Number(item.weight).toFixed(1)} kg` : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
              <Ruler className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Alzada</p>
                <p className="fit-clamp text-xs font-bold text-foreground">
                  {formattedHeight}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {parsedDate
                ? parsedDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Fecha no disponible'}
            </span>
          </div>

          {desc && (
            <div className="rounded-lg border border-border/60 bg-background/80 p-2.5 text-xs text-foreground/90">
              <p className="line-clamp-2 leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Nota: </span>
                {desc}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-xs font-bold text-primary">
          <span className="flex items-center gap-1 group-hover/control-card:underline">
            Ver detalle
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <AnimalGrowthLink id={item.animal_id} label="" />
          </div>
        </div>
      </div>
    );
  };
}

export function buildCrudConfig(
  animalOptions: { value: number; label: string }[],
  columns: any[],
  viewMode: 'table' | 'cards',
  setViewMode: (mode: 'table' | 'cards') => void,
  isCampesino?: boolean,
): CRUDConfig<ControlResponse, ControlForm> {
  const formSections: CRUDFormSection<ControlForm>[] = [
    {
      title: 'Animal y fecha', gridCols: 2,
      fields: [
        { name: 'animal_id', label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Selecciona un animal' },
        { name: 'checkup_date', label: 'Fecha de la revisión', type: 'date', required: true },
      ],
    },
    {
      title: 'Estado del animal', gridCols: 2,
      fields: [
        { name: 'health_status', label: 'Estado de salud', type: 'select', required: true, options: STATUS_OPTIONS, placeholder: 'Selecciona el estado' },
        { name: 'weight', label: 'Peso en kg (opcional)', type: 'number', validation: { min: 0 } },
        { name: 'height', label: 'Alzada en cm (opcional)', type: 'number', validation: { min: 0 }, placeholder: 'Ej: 135' },
      ],
    },
    { title: 'Observación', fields: [{ name: 'description', label: '¿Qué observaste?', type: 'textarea', colSpan: 2, placeholder: 'Ej: no come, cojea o tiene una herida.' }] },
  ];

  return {
    title: 'Controles',
    entityName: 'Control',
    columns,
    formSections,
    searchPlaceholder: 'Buscar por animal o estado...',
    emptyStateMessage: 'Aún no hay revisiones registradas.',
    emptyStateDescription: 'Usa “Reportar salud” para guardar la primera novedad.',
    enableDetailModal: true,
    enableCreateModal: false,
    enableEditModal: !isCampesino,
    enableDelete: !isCampesino,
    enableSelection: !isCampesino,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
    viewMode,
    cardGridClassName: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20',
    renderCard: renderControlCard(animalOptions),
    customToolbar: isCampesino ? null : (
      <div className="inline-flex rounded-lg border bg-muted/60 p-0.5 shadow-sm">
        <button
          onClick={() => setViewMode('table')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Tabla
        </button>
        <button
          onClick={() => setViewMode('cards')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Tarjetas
        </button>
      </div>
    ),
    customActions: (item: any) => <AnimalGrowthLink id={item.animal_id} label="" />,
  };
}

export const serviceAdapter: typeof controlService = Object.assign(
  Object.create(controlService),
  {
    create: async (payload: ControlForm) => {
      const toServer: any = {
        animal_id: payload.animal_id,
        checkup_date: payload.checkup_date,
        weight: payload.weight,
        height: payload.height,
        description: payload.description,
        health_status: payload.health_status,
      };
      Object.keys(toServer).forEach((k) => toServer[k] === undefined && delete toServer[k]);
      return controlService.create(toServer);
    },
    update: async (id: number | string, payload: ControlForm) => {
      const toServer: any = {
        animal_id: payload.animal_id,
        checkup_date: payload.checkup_date,
        weight: payload.weight,
        height: payload.height,
        description: payload.description,
        health_status: payload.health_status,
      };
      Object.keys(toServer).forEach((k) => toServer[k] === undefined && delete toServer[k]);
      return controlService.update(id, toServer);
    },
  }
);

export function mapResponseToForm(item: ControlResponse): ControlForm {
  return {
    animal_id: item.animal_id,
    checkup_date: (item as any).checkup_date ?? (item as any).control_date ?? '',
    weight: item.weight,
    height: item.height,
    health_status: (item as any).health_status ?? (item as any).healt_status ?? '',
    description: (item as any).description ?? (item as any).observations ?? '',
  };
}

export function validateControlForm(data: ControlForm): string | null {
  const id = Number(data.animal_id);
  if (!data.animal_id || Number.isNaN(id) || id <= 0) return '⚠️ Debe seleccionar un animal válido.';
  if (!data.checkup_date) return 'La fecha de chequeo es obligatoria.';
  if (data.weight !== undefined && data.weight < 0) return 'El peso no puede ser negativo.';
  if (data.height !== undefined && data.height < 0) return 'La altura no puede ser negativa.';
  return null;
}

export const initialFormData: ControlForm = {
  animal_id: undefined as any,
  checkup_date: getTodayColombia(),
  weight: undefined,
  height: undefined,
  health_status: '',
  description: '',
};

export function makeCustomDetailContent(animalOptions: { value: number; label: string }[]) {
  return (item: ControlResponse) => {
    const map = new Map(animalOptions.map((o) => [o.value, o.label]));
    return <ControlDetailExpanded item={item} animalLabel={String(map.get(item.animal_id as any) ?? `Animal #${item.animal_id}`)} />;
  };
}
