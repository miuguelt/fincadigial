import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { animalService } from '@/entities/animal/api/animal.service';
import type { ReproductiveEventResponse, ReproductiveEventInput } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';

const ReproductionPage: React.FC = () => {
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
          if (item.event_type !== 'Inseminacion') return null;
          return (
            <div className="flex flex-col">
              <span className={item.is_overdue ? 'text-destructive font-bold' : ''}>
                {val ? formatDateColombia(val) : '---'}
              </span>
              {item.days_to_birth !== undefined && item.days_to_birth > 0 && (
                <span className="text-[10px] text-muted-foreground">Faltan {item.days_to_birth} días</span>
              )}
            </div>
          );
        }
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
            // @ts-ignore
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Hembra' });
              return animals.map(a => ({ label: `${a.record} - ${a.name || ''}`, value: a.id }));
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
        // @ts-ignore
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
            // @ts-ignore
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Macho' });
              return animals.map(a => ({ label: `${a.record} - ${a.name || ''}`, value: a.id }));
            }
          },
        ]
      },
      {
        title: 'Diagnóstico',
        // @ts-ignore
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
        // @ts-ignore
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Parto',
        fields: [
          {
            name: 'alive_count',
            label: 'Crías Vivas',
            type: 'number',
            // @ts-ignore
            min: 0,
          },
          {
            name: 'dead_count',
            label: 'Crías Muertas',
            type: 'number',
            // @ts-ignore
            min: 0,
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
    enableEdit: true,
    enableDelete: true,
    // @ts-ignore
    enableDetail: true,
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
