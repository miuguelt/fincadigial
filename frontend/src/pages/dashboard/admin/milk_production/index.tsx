import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { milkService, MilkProduction } from '@/entities/milk/api/milk.service';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconFlask, IconCalendar, IconInfoCircle } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { animalService } from '@/entities/animal/api/animal.service';

const MilkProductionPage: React.FC = () => {
  const [animals, setAnimals] = React.useState<{label: string, value: any}[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadAnimals = async () => {
      try {
        const data = await animalService.getAll();
        // Mapeo flexible para manejar diferentes nombres de campos (record/registro, name/nombre)
        setAnimals(data.map((a: any) => ({ 
          label: (a.record || a.registro) ? `${a.record || a.registro} - ${a.name || a.nombre || ''}` : `Animal #${a.id}`, 
          value: a.id 
        })));
      } catch (error) {
        console.error('Error loading animals for milk production:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnimals();
  }, []);

  const initialFormData: Partial<MilkProduction> = {
    date: new Date().toISOString().split('T')[0],
    liters: 0,
    milking_session: 'AM',
  };

  const columns: CRUDColumn<MilkProduction>[] = [
    {
      key: 'date',
      label: 'Fecha',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {formatDateColombia(val)}
        </div>
      )
    },
    {
      key: 'animal_id',
      label: 'ID Animal',
      fkEntity: 'animals',
      sortable: true,
      width: 10
    },
    {
      key: 'animal_name',
      label: 'Animal',
      render: (val: string, item: any) => (
        <div className="flex flex-col">
          <span className="font-bold">{item.animal?.nombre || item.animal?.name || item.animal_id}</span>
          <span className="text-[10px] text-muted-foreground">{item.animal?.registro || item.animal?.record || 'Ref: ' + item.animal_id}</span>
        </div>
      )
    },
    {
      key: 'liters',
      label: 'Litros',
      render: (val: number) => (
        <div className="flex items-center gap-1 font-bold text-primary">
          <IconFlask size="sm" />
          {val ? Number(val).toFixed(1) : '0'} L
        </div>
      )
    },
    {
      key: 'milking_session',
      label: 'Sesión',
      render: (val: string) => (
        <Badge variant={val === 'AM' ? 'default' : val === 'PM' ? 'secondary' : 'outline'}>
          {val}
        </Badge>
      )
    },
    {
      key: 'fat_percentage',
      label: 'Grasa/Prot',
      render: (_val: any, item: MilkProduction) => (
        <div className="text-[10px] text-muted-foreground">
          G: {item.fat_percentage || '-'}% | P: {item.protein_percentage || '-'}%
        </div>
      )
    }
  ];

  const formSections: CRUDFormSection<Partial<MilkProduction>>[] = [
    {
      title: 'Datos de Producción',
      fields: [
        {
          name: 'animal_id',
          label: 'Animal',
          type: 'select',
          required: true,
          options: animals,
          loading: loading
        },
        {
          name: 'date',
          label: 'Fecha',
          type: 'date',
          required: true,
        },
        {
          name: 'liters',
          label: 'Cantidad (Litros)',
          type: 'number',
          required: true,
          // @ts-ignore
          min: 0,
          step: 0.1,
        },
        {
          name: 'milking_session',
          label: 'Sesión de Ordeño',
          type: 'select',
          required: true,
          options: [
            { label: 'Mañana (AM)', value: 'AM' },
            { label: 'Tarde (PM)', value: 'PM' },
            { label: 'Extra', value: 'Extra' },
          ],
        },
      ]
    },
    {
      title: 'Calidad y Notas',
      fields: [
        {
          name: 'fat_percentage',
          label: '% Grasa',
          type: 'number',
          // @ts-ignore
          min: 0,
          step: 0.01,
        },
        {
          name: 'protein_percentage',
          label: '% Proteína',
          type: 'number',
          // @ts-ignore
          min: 0,
          step: 0.01,
        },
        {
          name: 'somatic_cells',
          label: 'Células Somáticas',
          type: 'number',
          // @ts-ignore
          min: 0,
        },
        {
          name: 'notes',
          label: 'Observaciones',
          type: 'textarea',
          placeholder: 'Cualquier detalle sobre el ordeño...',
        },
      ]
    }
  ];

  const config: CRUDConfig<MilkProduction, Partial<MilkProduction>> = {
    entityName: 'Registro de Leche',
    title: 'Producción de Leche',
    searchPlaceholder: 'Buscar por animal...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
    // @ts-ignore
    enableDetail: true,
  };

  return (
    <AdminCRUDPage
      config={config}
      service={milkService}
      initialFormData={initialFormData}
    />
  );
};

export default MilkProductionPage;

