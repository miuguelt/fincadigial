import { controlService } from '@/entities/control/api/control.service';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig, CRUDFormSection } from '@/shared/types/crud';
import { AnimalLink, AnimalGrowthLink } from '@/entities/animal/ui';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ControlDetailExpanded } from './components/ControlDetailExpanded';
import { parseDateOnlyLocal } from './controlPage.utils';

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

function getStatusColor(status: string): string {
  if (['Excelente', 'Bueno', 'Sano'].includes(status)) return 'bg-success-100 text-success-800';
  if (status === 'Regular') return 'bg-warning-100 text-warning-800';
  if (['Malo', 'Enfermo', 'Crítico'].includes(status)) return 'bg-danger-100 text-danger-800';
  return 'bg-neutral-100 text-neutral-700';
}

function renderControlCard(animalOptions: { value: number; label: string }[]) {
  return (item: ControlResponse & { [k: string]: any }) => {
    const label = animalOptions.find(o => o.value === item.animal_id)?.label || `Animal ${item.animal_id}`;
    const date = (item as any)?.checkup_date ?? (item as any)?.control_date;
    const status = (item as any)?.health_status ?? (item as any)?.healt_status ?? '-';
    const desc = (item as any)?.description ?? (item as any)?.observations;
    const critical = ['Malo', 'Enfermo', 'Crítico'].includes(status);
    const parsedDate = date ? parseDateOnlyLocal(String(date)) : null;
    return (
      <div className={`flex h-full flex-col gap-3 p-4 ${critical ? 'rounded-xl bg-red-50/30 ring-2 ring-red-300 dark:bg-red-950/20 dark:ring-red-800' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 break-words text-base font-extrabold">
            {item.animal_id ? <AnimalLink id={item.animal_id} label={label} /> : 'Animal sin identificar'}
          </div>
          <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${getStatusColor(status)}`}>{status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
          <span>
            {parsedDate ? parsedDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha no disponible'}
          </span>
          {item.weight != null && <span>{Number(item.weight).toFixed(1)} kg</span>}
          {item.height != null && <span>{Number(item.height).toFixed(2)} m</span>}
        </div>
        {desc && <p className="mt-auto break-words border-t border-border/40 pt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>}
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
  // Anotar el retorno hace que TypeScript verifique que cada `name` existe en
  // ControlForm; sin ello un campo mal escrito llegaba silencioso al formulario.
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
        { name: 'height', label: 'Altura en m (opcional)', type: 'number', validation: { min: 0 } },
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
    renderCard: renderControlCard(animalOptions),
    customToolbar: isCampesino ? null : (
      <div className="inline-flex rounded-lg border bg-muted/60 p-0.5 shadow-sm">
        <button onClick={() => setViewMode('table')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Tabla</button>
        <button onClick={() => setViewMode('cards')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Tarjetas</button>
      </div>
    ),
    customActions: (item: any) => <AnimalGrowthLink id={item.animal_id} label="" />,
  };
}

export const serviceAdapter: any = Object.create(controlService);
serviceAdapter.getAll = controlService.getAll.bind(controlService);
serviceAdapter.getPaginated = controlService.getPaginated.bind(controlService);
serviceAdapter.getById = controlService.getById.bind(controlService);
serviceAdapter.delete = controlService.delete.bind(controlService);
serviceAdapter.create = async (payload: ControlForm) => {
  const toServer: any = {
    animal_id: payload.animal_id, checkup_date: payload.checkup_date,
    weight: payload.weight, height: payload.height,
    description: payload.description, health_status: payload.health_status,
  };
  Object.keys(toServer).forEach((k) => toServer[k] === undefined && delete toServer[k]);
  return (controlService as any).create(toServer);
};
serviceAdapter.update = async (id: number | string, payload: ControlForm) => {
  const toServer: any = {
    animal_id: payload.animal_id, checkup_date: payload.checkup_date,
    weight: payload.weight, height: payload.height,
    description: payload.description, health_status: payload.health_status,
  };
  Object.keys(toServer).forEach((k) => toServer[k] === undefined && delete toServer[k]);
  return (controlService as any).update(id, toServer);
};

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
