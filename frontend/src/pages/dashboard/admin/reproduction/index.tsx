import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { animalService } from '@/entities/animal/api/animal.service';
import type { ReproductiveEventResponse, ReproductiveEventInput } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';

/** Etiqueta del selector: el registro manda, la raza desambigua. */
const animalLabel = (animal: { record: string; breed?: { name?: string } | null }) =>
  animal.breed?.name ? `${animal.record} · ${animal.breed.name}` : animal.record;

const ReproductionPage: React.FC = () => {
  const navigate = useNavigate();
  const initialFormData: ReproductiveEventInput = {
    animal_id: 0,
    event_type: 'Celo',
    event_date: new Date().toISOString().split('T')[0],
  };

  const crudConfig: CRUDConfig<ReproductiveEventResponse, ReproductiveEventInput> = {
    entityName: 'Evento Reproductivo',
    title: 'Gestión Reproductiva',
    searchPlaceholder: 'Buscar por animal o notas...',
    columns: [
      {
        key: 'animal',
        label: 'Hembra',
        render: (val: any) => <span className="font-medium text-primary">{val?.record || '---'}</span>
      },
      {
        key: 'event_type',
        label: 'Evento',
        render: (val: any) => {
          let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
          switch (val) {
            case 'Celo': variant = 'secondary'; break;
            case 'Inseminacion': variant = 'outline'; break;
            case 'Diagnostico': variant = 'default'; break;
            case 'Parto': variant = 'destructive'; break;
            case 'Secado': variant = 'outline'; break;
          }
          return <Badge variant={variant}>{val}</Badge>;
        }
      },
      {
        key: 'event_date',
        label: 'Fecha',
        render: (val: any) => val ? formatDateColombia(val) : '---'
      },
      {
        key: 'diagnosis_result',
        label: 'Resultado',
        render: (val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Diagnostico') return null;
          const label = val || 'Pendiente';
          return (
            <Badge className={getAutoStatusClass(label)}>
              {label}
            </Badge>
          );
        }
      },
      {
        key: 'expected_birth_date',
        label: 'Fecha Prob. Parto',
        render: (val: any, item: ReproductiveEventResponse) => {
          // El diagnóstico positivo hereda la fecha probable de su servicio,
          // así que también anuncia parto y debe mostrarla.
          if (item.event_type !== 'Inseminacion' && item.event_type !== 'Diagnostico') return null;
          if (!val) return null;
          return (
            <div className="flex flex-col">
              <span className={item.is_overdue ? 'text-destructive font-bold' : ''}>
                {formatDateColombia(val)}
              </span>
              {item.days_to_birth !== undefined && (
                <span className="text-[11px] text-muted-foreground">
                  {item.days_to_birth > 0 ? `Faltan ${item.days_to_birth} días` : item.days_to_birth === 0 ? 'Hoy' : `Vencido por ${Math.abs(item.days_to_birth)} días`}
                </span>
              )}
            </div>
          );
        }
      },
      {
        key: 'sire',
        label: 'Detalles Servicio',
        render: (_val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Inseminacion') return null;
          const techniqueLabels: Record<string, string> = {
            'Natural': 'Monta Natural',
            'Artificial': 'Inseminación Artificial',
            'Transferencia_Embrionaria': 'Transferencia de Embrión'
          };
          const techLabel = item.technique ? (techniqueLabels[item.technique] || item.technique) : '---';
          return (
            <div className="flex flex-col text-[11px] leading-tight">
              <span className="font-bold text-foreground">Padre: {item.sire?.record || '---'}</span>
              <span className="text-muted-foreground">{techLabel}</span>
            </div>
          );
        }
      },
      {
        key: 'parto_details',
        label: 'Detalles Parto',
        render: (_val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Parto') return null;
          return (
            <div className="flex flex-col text-[11px] leading-tight gap-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {item.alive_count ?? 0} Vivas
                </span>
                <span className="flex items-center gap-1 font-semibold text-rose-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {item.dead_count ?? 0} Muertas
                </span>
              </div>
              {item.complications && (
                <Badge variant="destructive" className="text-[11px] px-1.5 py-0 rounded font-bold w-fit">
                  Complicaciones
                </Badge>
              )}
            </div>
          );
        }
      },
      {
        key: 'notes',
        label: 'Observaciones',
        render: (val: any) => val ? (
          <span className="text-xs text-muted-foreground max-w-[185px] fit-clamp block" title={val}>
            {val}
          </span>
        ) : '---'
      }
    ],
    formSections: [
      {
        title: 'Detalles del Evento',
        fields: [
          {
            name: 'animal_id',
            label: 'Hembra',
            type: 'select',
            required: true,
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Hembra' });
              return animals.map(a => ({ label: animalLabel(a), value: a.id }));
            }
          },
          {
            name: 'event_type',
            label: 'Tipo de Evento',
            type: 'select',
            required: true,
            options: [
              { label: 'Celo', value: 'Celo' },
              { label: 'Inseminación', value: 'Inseminacion' },
              { label: 'Diagnóstico de Preñez', value: 'Diagnostico' },
              { label: 'Parto', value: 'Parto' },
              { label: 'Secado', value: 'Secado' },
            ],
          },
          {
            name: 'event_date',
            label: 'Fecha del Evento',
            type: 'date',
            required: true,
          },
        ]
      },
      {
        title: 'Inseminación / Servicio',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Inseminacion',
        fields: [
          {
            name: 'technique',
            label: 'Técnica',
            type: 'select',
            options: [
              { label: 'Natural', value: 'Natural' },
              { label: 'Inseminación Artificial', value: 'Artificial' },
              { label: 'Transferencia de Embrión', value: 'Transferencia_Embrionaria' },
            ],
          },
          {
            name: 'sire_id',
            label: 'Macho (Padre)',
            type: 'select',
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Macho' });
              return animals.map(a => ({ label: animalLabel(a), value: a.id }));
            }
          },
        ]
      },
      {
        title: 'Diagnóstico',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Diagnostico',
        fields: [
          {
            name: 'diagnosis_result',
            label: 'Resultado del Diagnóstico',
            type: 'select',
            options: [
              { label: 'Positivo', value: 'Positivo' },
              { label: 'Negativo', value: 'Negativo' },
              { label: 'Pendiente', value: 'Pendiente' },
            ],
          },
        ]
      },
      {
        title: 'Información del Parto',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Parto',
        fields: [
          {
            name: 'alive_count',
            label: 'Crías Vivas',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'dead_count',
            label: 'Crías Muertas',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'complications',
            label: '¿Hubo complicaciones?',
            type: 'checkbox',
          },
        ]
      },
      {
        title: 'Observaciones',
        fields: [
          {
            name: 'notes',
            label: 'Notas',
            type: 'textarea',
          }
        ]
      }
    ],
    customToolbar: (
      <Button
        variant="outline"
        className="h-9 gap-2 rounded-lg font-semibold"
        onClick={() => navigate('/admin/reproduction/kpis')}
      >
        <Target className="h-4 w-4" />
        Indicadores del hato
      </Button>
    ),
    enableEditModal: true,
    enableDelete: true,
    enableDetailModal: true,
    themeColor: 'purple',
  };

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={reproductionService}
      initialFormData={initialFormData}
    />
  );
};

export default ReproductionPage;
