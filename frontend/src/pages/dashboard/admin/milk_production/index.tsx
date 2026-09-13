import { useState, useEffect, useMemo, useCallback } from 'react';
import { MilkDashboard } from '@/widgets/milk';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { milkService, MilkProduction } from '@/entities/milk/api/milk.service';
import { CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { useAuth } from '@/features/auth/model/useAuth';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { Badge } from '@/shared/ui/badge';
import { IconFlask, IconCalendar } from '@/shared/ui/icons';
import { formatDateColombia, getTodayColombia } from '@/shared/utils/dateUtils';
import { animalService } from '@/entities/animal/api/animal.service';
import { cn } from '@/shared/ui/cn';

type DateFilter = 'all' | 'today' | 'week' | 'month';

const FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todos' },
];

function getDateRange(filter: DateFilter): { date_from?: string; date_to?: string } {
  const today = getTodayColombia();

  if (filter === 'all') {
    return {};
  }

  if (filter === 'today') {
    return { date_from: today, date_to: today };
  }

  const [y, m, d] = today.split('-').map(Number);
  const now = new Date(y, m - 1, d);

  if (filter === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return { date_from: formatDateColombia(start), date_to: today };
  }

  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { date_from: formatDateColombia(start), date_to: today };
  }

  return { date_from: today, date_to: today };
}

interface MilkProductionPageProps {
  /** Pestaña con la que abre el panel del dashboard. */
  initialTab?: 'overview' | 'table';
  /** Fecha del último registo guardado; ajusta el filtro inicial para que sea visible. */
  focusDate?: string | null;
}

const MilkProductionPage = ({ initialTab = 'overview', focusDate = null }: MilkProductionPageProps = {}) => {
  const { role: userRole, user } = useAuth() as any;
  const isCampesino = userRole === 'Operario' || userRole === 'Aprendiz';
  const [viewMode] = useGlobalViewMode();
  const [animals, setAnimals] = useState<{label: string, value: any}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    focusDate && focusDate !== getTodayColombia() ? 'all' : 'today',
  );

  const fincaId = user?.finca_id;

  useEffect(() => {
    const loadAnimals = async () => {
      try {
        const data = await animalService.getAll();
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

  const dateFilters = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  /**
   * Si el registro recién guardado cae fuera del rango actual de fechas,
   * amplía el filtro a "Todos" para que el usuario lo vea de inmediato.
   */
  const handleRecordSaved = useCallback((record?: { date: string }) => {
    const saved = record?.date;
    if (!saved) return;
    const range = getDateRange(dateFilter);
    const visibleFrom = !range.date_from || saved >= range.date_from;
    const visibleTo = !range.date_to || saved <= range.date_to;
    if (visibleFrom && visibleTo) return;
    setDateFilter('all');
  }, [dateFilter]);

  const initialFormData: Partial<MilkProduction> = {
    date: getTodayColombia(),
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
      sortable: true,
      width: 10
    },
    {
      key: 'animal_name',
      label: 'Animal',
      render: (_val: string, item: any) => (
        <div className="flex flex-col">
          <span className="font-bold">{item.animal?.nombre || item.animal?.name || item.animal_id}</span>
          <span className="text-[11px] text-muted-foreground">{item.animal?.registro || item.animal?.record || 'Ref: ' + item.animal_id}</span>
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
        <div className="text-[11px] text-muted-foreground">
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
          validation: { min: 0, step: 0.1 },
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
          validation: { min: 0, step: 0.01 },
        },
        {
          name: 'protein_percentage',
          label: '% Proteína',
          type: 'number',
          validation: { min: 0, step: 0.01 },
        },
        {
          name: 'somatic_cells',
          label: 'Células Somáticas',
          type: 'number',
          validation: { min: 0 },
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

  const customToolbar = (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Filtrar por:</span>
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setDateFilter(opt.value)}
          className={cn(
            "px-3 py-1 text-xs font-bold rounded-full border transition-all shrink-0",
            dateFilter === opt.value
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card/70 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
      {dateFilter !== 'today' && (
        <button
          onClick={() => setDateFilter('today')}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors shrink-0"
        >
          ✕ Limpiar
        </button>
      )}
    </div>
  );

  const config = {
    entityName: 'Registro de Leche',
    title: 'Registros de Ordeño',
    searchPlaceholder: 'Buscar por animal...',
    columns,
    formSections,
    enableCreateModal: !isCampesino,
    enableEditModal: !isCampesino,
    enableDelete: !isCampesino,
    enableDetailModal: true,
    enableSelection: !isCampesino,
    viewMode,
    toolbarPlacement: 'row',
    customToolbar: isCampesino ? null : customToolbar,
  } as any;

  const tableComponent = (
    <AdminCRUDPage
      config={config}
      service={milkService}
      initialFormData={initialFormData}
      filters={dateFilters}
      realtime={true}
    />
  );

  return (
    <div className="space-y-4">
      <MilkDashboard
        fincaId={fincaId}
        tableComponent={tableComponent}
        initialTab={initialTab}
        onRecordSaved={handleRecordSaved}
      />
    </div>
  );
};

export default MilkProductionPage;
