import { controlService } from '@/entities/control/api/control.service';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import { AnimalLink, AnimalGrowthLink } from '@/entities/animal/ui';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ControlDetailExpanded } from './components/ControlDetailExpanded';

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
    return (
      <div className={`flex flex-col gap-3 p-4 h-full ${critical ? 'ring-2 ring-red-300 bg-red-50/30 rounded-xl' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(status)}`}>{status}</span>
          <span className="text-xs text-muted-foreground font-medium bg-muted/40 px-2 py-1 rounded-md">
            {date ? new Date(date as string).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
          </span>
        </div>
        <div className="text-base font-bold truncate">
          {item.animal_id ? <AnimalLink id={item.animal_id} label={label} /> : '-'}
        </div>
        {desc && <p className="text-xs text-muted-foreground line-clamp-2 mt-auto pt-2 border-t border-border/20">"{desc}"</p>}
      </div>
    );
  };
}

export function buildCrudConfig(
  animalOptions: { value: number; label: string }[],
  columns: any[],
  viewMode: string,
  setViewMode: (mode: 'table' | 'cards') => void,
  isCampesino?: boolean,
) {
  const formSections = [
    {
      title: 'Información Básica', gridCols: 2,
      fields: [
        { name: 'animal_id', label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal' },
        { name: 'checkup_date', label: 'Fecha de Chequeo', type: 'date', required: true },
      ],
    },
    {
      title: 'Métricas Básicas', gridCols: 2,
      fields: [
        { name: 'weight', label: 'Peso (kg)', type: 'number', validation: { min: 0 } },
        { name: 'height', label: 'Altura (m)', type: 'number', validation: { min: 0 } },
        { name: 'health_status', label: 'Estado de Salud', type: 'select', required: true, options: STATUS_OPTIONS },
      ],
    },
    { title: 'Descripción', fields: [{ name: 'description', label: 'Descripción', type: 'textarea', colSpan: 2 }] },
  ];

  return {
    title: 'Controles',
    entityName: 'Control',
    columns,
    formSections,
    searchPlaceholder: 'Buscar controles...',
    emptyStateMessage: 'No hay controles disponibles.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
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
