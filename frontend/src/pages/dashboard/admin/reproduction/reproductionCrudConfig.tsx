import { animalService } from '@/entities/animal/api/animal.service';
import { Badge } from '@/shared/ui/badge';
import type { ReproductiveEventInput, ReproductiveEventResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';

const animalLabel = (animal: { record: string; breed?: { name?: string } | null }) =>
  animal.breed?.name ? `${animal.record} · ${animal.breed.name}` : animal.record;

export function createReproductionCrudConfig(onSelectAnimal: (id: number) => void, onRefresh: () => void): CRUDConfig<ReproductiveEventResponse, ReproductiveEventInput> {
    return {
    entityName: 'Evento Reproductivo',
    title: 'Registro de Eventos Reproductivos',
    headerDescription: 'Registra celos, servicios, diagnósticos, partos y crías',
    searchPlaceholder: 'Buscar por hembra, toro o notas...',
    columns: [
      {
        key: 'animal',
        label: 'Hembra (Vaca/Novilla)',
        render: (val: any, item: ReproductiveEventResponse) => (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (item.animal_id) onSelectAnimal(item.animal_id);
            }}
            className="font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            {val?.record || `ID #${item.animal_id}`}
          </span>
        ),
      },
      {
        key: 'event_type',
        label: 'Tipo de Evento',
        render: (val: any) => {
          let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
          switch (val) {
            case 'Celo':
              variant = 'secondary';
              break;
            case 'Inseminacion':
              variant = 'outline';
              break;
            case 'Diagnostico':
              variant = 'default';
              break;
            case 'Parto':
              variant = 'destructive';
              break;
            case 'Secado':
              variant = 'outline';
              break;
          }
          return <Badge variant={variant} className="font-bold text-xs">{val}</Badge>;
        },
      },
      {
        key: 'event_date',
        label: 'Fecha Evento',
        render: (val: any) => (val ? formatDateColombia(val) : '---'),
      },
      {
        key: 'diagnosis_result',
        label: 'Diagnóstico',
        render: (val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Diagnostico') return null;
          const label = val || 'Pendiente';
          return <Badge className={getAutoStatusClass(label)}>{label}</Badge>;
        },
      },
      {
        key: 'expected_birth_date',
        label: 'Fecha Prob. Parto (FPP)',
        render: (val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Inseminacion' && item.event_type !== 'Diagnostico') return null;
          if (!val) return null;
          return (
            <div className="flex flex-col">
              <span className={item.is_overdue ? 'text-destructive font-black' : 'font-semibold'}>
                {formatDateColombia(val)}
              </span>
              {item.days_to_birth !== undefined && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.days_to_birth > 0
                    ? `Faltan ${item.days_to_birth} días`
                    : item.days_to_birth === 0
                    ? '¡Parto Hoy!'
                    : `Vencido por ${Math.abs(item.days_to_birth)} días`}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'sire',
        label: 'Servicio / Macho',
        render: (_val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Inseminacion') return null;
          const techniqueLabels: Record<string, string> = {
            Natural: 'Monta Natural',
            Artificial: 'Inseminación Artificial',
            Transferencia_Embrionaria: 'Transferencia de Embrión',
          };
          const techLabel = item.technique ? techniqueLabels[item.technique] || item.technique : '---';
          return (
            <div className="flex flex-col text-xs leading-tight">
              {item.sire?.record ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.sire_id) onSelectAnimal(item.sire_id);
                  }}
                  className="font-bold text-foreground hover:text-primary cursor-pointer hover:underline"
                >
                  Toro: {item.sire.record}
                </span>
              ) : (
                <span className="text-muted-foreground">Toro: No asignado</span>
              )}
              <span className="text-[11px] text-muted-foreground">{techLabel}</span>
            </div>
          );
        },
      },
      {
        key: 'parto_details',
        label: 'Detalles Parto',
        render: (_val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Parto') return null;
          return (
            <div className="flex flex-col text-xs leading-tight gap-1">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">{item.alive_count ?? 0} Vivas</span>
                <span className="text-rose-500">{item.dead_count ?? 0} Muertas</span>
              </div>
              {item.complications && (
                <Badge variant="destructive" className="text-[11px] px-1.5 py-0 font-bold w-fit">
                  Complicaciones
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'notes',
        label: 'Observaciones',
        render: (val: any) =>
          val ? (
            <span className="text-xs text-muted-foreground max-w-[200px] fit-clamp block" title={val}>
              {val}
            </span>
          ) : (
            '---'
          ),
      },
    ],
    formSections: [
      {
        title: 'Datos Principales del Evento',
        fields: [
          {
            name: 'animal_id',
            label: 'Hembra (Vaca o Novilla)',
            type: 'select',
            required: true,
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Hembra' });
              return animals.map((a) => ({ label: animalLabel(a), value: a.id }));
            },
          },
          {
            name: 'event_type',
            label: 'Tipo de Evento',
            type: 'select',
            required: true,
            options: [
              { label: 'Celo Detectado', value: 'Celo' },
              { label: 'Inseminación / Monta', value: 'Inseminacion' },
              { label: 'Diagnóstico de Preñez (Palpación)', value: 'Diagnostico' },
              { label: 'Parto', value: 'Parto' },
              { label: 'Secado (Cierre de Lactancia)', value: 'Secado' },
            ],
          },
          {
            name: 'event_date',
            label: 'Fecha del Evento',
            type: 'date',
            required: true,
          },
        ],
      },
      {
        title: 'Detalles de Inseminación / Monta',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Inseminacion',
        fields: [
          {
            name: 'technique',
            label: 'Técnica Empleada',
            type: 'select',
            options: [
              { label: 'Inseminación Artificial (Pajilla)', value: 'Artificial' },
              { label: 'Monta Natural', value: 'Natural' },
              { label: 'Transferencia de Embrión', value: 'Transferencia_Embrionaria' },
            ],
          },
          {
            name: 'sire_id',
            label: 'Toro Reproductor (Padre)',
            type: 'select',
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Macho' });
              return animals.map((a) => ({ label: animalLabel(a), value: a.id }));
            },
          },
        ],
      },
      {
        title: 'Resultado de Palpación / Diagnóstico',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Diagnostico',
        fields: [
          {
            name: 'diagnosis_result',
            label: 'Resultado',
            type: 'select',
            options: [
              { label: 'Positivo (Confirmada Preñada)', value: 'Positivo' },
              { label: 'Negativo (Vacía / No Preñada)', value: 'Negativo' },
              { label: 'Pendiente (Repetir en 15 días)', value: 'Pendiente' },
            ],
          },
        ],
      },
      {
        title: 'Información del Parto',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Parto',
        fields: [
          {
            name: 'alive_count',
            label: 'Crías Nacidas Vivas',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'dead_count',
            label: 'Crías Nacidas Muertas',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'complications',
            label: '¿Hubo complicaciones o distocia?',
            type: 'checkbox',
          },
        ],
      },
      {
        title: 'Observaciones y Notas',
        fields: [
          {
            name: 'notes',
            label: 'Notas del Evento',
            type: 'textarea',
          },
        ],
      },
    ],
    enableEditModal: true,
    enableDelete: true,
    enableDetailModal: true,
    themeColor: 'purple',
    onAfterCreate: () => onRefresh(),
    onAfterUpdate: () => onRefresh(),
    onAfterDelete: () => onRefresh(),
  };
}
