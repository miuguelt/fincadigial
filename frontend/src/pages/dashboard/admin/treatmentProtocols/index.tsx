import { useMemo, useState, useEffect } from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { treatmentProtocolsService } from '@/entities/treatment-protocol/api/treatmentProtocols.service';
import type { TreatmentProtocolRow } from '@/entities/treatment-protocol/model/types';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';

const SEVERITY_STYLES: Record<string, string> = {
  Leve: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  Moderada: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  Severa: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  Crítica: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
};

type ProtocolForm = {
  name: string;
  description: string;
  disease_id?: number | string;
  severity?: string;
  default_dosis?: string;
  default_frequency?: string;
  withdrawal_days?: string;
  duration_days?: string;
};

const columns: CRUDColumn<TreatmentProtocolRow & { [k: string]: any }>[] = [
  {
    key: 'name',
    label: 'Protocolo',
    render: (_v, item) => (
      <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
        <span>🧪</span> {item.name}
        {item.is_default && (
          <Badge variant="outline" className="text-[11px] h-4.5 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            base
          </Badge>
        )}
      </span>
    ),
  },
  {
    key: 'disease_id',
    label: 'Enfermedad',
    render: (_v, item) => (item.disease?.name ? String(item.disease.name) : 'General'),
  },
  {
    key: 'severity',
    label: 'Gravedad',
    render: (v) => {
      if (!v) return '-';
      return (
        <Badge variant="outline" className={cn('text-[11px]', SEVERITY_STYLES[String(v)] || 'bg-muted/40 text-muted-foreground border-border/40')}>
          {String(v)}
        </Badge>
      );
    },
  },
  { key: 'default_dosis', label: 'Dosis', render: (v) => (v ? String(v) : '-') },
  { key: 'default_frequency', label: 'Frecuencia', render: (v) => (v ? String(v) : '-') },
  {
    key: 'withdrawal_days',
    label: 'Retiro (días)',
    render: (_v, item) => (
      <span className="tabular-nums">
        {item.withdrawal_days ? String(item.withdrawal_days) : '0'}
      </span>
    ),
  },
];

const formSections: CRUDFormSection<ProtocolForm>[] = [
  {
    title: 'Información del protocolo',
    gridCols: 2,
    fields: [
      {
        name: 'name',
        label: 'Nombre del protocolo',
        type: 'text',
        required: true,
        placeholder: 'Ej: Mastitis aguda - terapia intramamaria',
        suggestions: [
          'Tratamiento Mastitis Clínica Aguda',
          'Control de Neumonía y Fiebre Bovina',
          'Terapia Antibiótica para Pododermatitis',
          'Desparasitación Interna y Externa',
          'Protocolo Diarrea Neonatal Terneros',
          'Manejo de Timpanismo Ruminal',
        ],
      },
      { name: 'disease_id', label: 'Enfermedad asociada (opcional)', type: 'select', options: [], placeholder: 'Sugerir cuando se reporte esta enfermedad' },
      { name: 'severity', label: 'Gravedad sugerida', type: 'select', options: [{ value: 'Leve', label: 'Leve' }, { value: 'Moderada', label: 'Moderada' }, { value: 'Severa', label: 'Severa' }, { value: 'Crítica', label: 'Crítica' }], placeholder: 'Cualquiera' },
      {
        name: 'description',
        label: 'Descripción y pasos',
        type: 'textarea',
        required: true,
        placeholder: 'Explique cómo se aplica, precauciones y cuándo consultar…',
        colSpan: 2,
        suggestions: [
          'Aplicar previa desinfección del pezón o zona afectada; mantener en observación 48h.',
          'Monitorear temperatura rectal cada 12 horas hasta estabilización.',
          'Aislar en potrero de enfermería con sombra, agua a voluntad y pasto tierno.',
        ],
      },
      {
        name: 'default_dosis',
        label: 'Dosis por defecto',
        type: 'text',
        placeholder: 'Ej: 10 ml por cuarto afectado',
        suggestions: [
          '1 jeringa intramamaria por cuarto',
          '1 ml por cada 50 kg de peso vivo',
          '10 ml vía intramuscular profunda',
          '20 ml vía subcutánea en la tabla del cuello',
          '5 ml vía intramuscular',
        ],
      },
      {
        name: 'default_frequency',
        label: 'Frecuencia por defecto',
        type: 'text',
        placeholder: 'Ej: Cada 12 h por 5 días',
        suggestions: [
          'Cada 24 horas por 3 días',
          'Dosis única',
          'Cada 12 horas por 3 a 5 días',
          'Cada 48 horas por 2 dosis',
        ],
      },
      {
        name: 'withdrawal_days',
        label: 'Días de retiro',
        type: 'number',
        placeholder: '0',
        suggestions: [0, 3, 5, 7, 14, 28, 30],
      },
      {
        name: 'duration_days',
        label: 'Duración (días)',
        type: 'number',
        placeholder: 'Opcional',
        suggestions: [1, 3, 5, 7, 10, 14],
      },
    ],
  },
];

const mapResponseToForm = (item: TreatmentProtocolRow): ProtocolForm => ({
  name: item.name ?? '',
  description: item.description ?? '',
  disease_id: item.disease_id ?? '',
  severity: item.severity ?? '',
  default_dosis: item.default_dosis ?? '',
  default_frequency: item.default_frequency ?? '',
  withdrawal_days: item.withdrawal_days != null ? String(item.withdrawal_days) : '',
  duration_days: item.duration_days != null ? String(item.duration_days) : '',
});

const validateForm = (form: ProtocolForm): string | null => {
  if (!form.name?.trim()) return 'El nombre del protocolo es obligatorio.';
  if (!form.description?.trim()) return 'La descripción es obligatoria.';
  return null;
};

const initialFormData: ProtocolForm = {
  name: '',
  description: '',
  disease_id: '',
  severity: '',
  default_dosis: '',
  default_frequency: '',
  withdrawal_days: '',
  duration_days: '',
};

function AdminTreatmentProtocolsPage() {
  const [diseaseOptions, setDiseaseOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await diseaseService.getDiseases({ page: 1, limit: 1000 });
        const items = (res as any)?.data || (res as any)?.items || res || [];
        if (!mounted) return;
        setDiseaseOptions(
          (Array.isArray(items) ? items : []).map((d: any) => ({
            value: String(d.id),
            label: d.disease || d.name || `Enfermedad #${d.id}`,
          })),
        );
      } catch {
        /* catálogo vacío: se puede guardar sin enfermedad asociada */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const crudConfig: CRUDConfig<TreatmentProtocolRow, ProtocolForm> = useMemo(() => {
    const sections = formSections.map((section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.name === 'disease_id' && diseaseOptions.length > 0
          ? { ...field, options: diseaseOptions }
          : field,
      ),
    }));
    return {
      title: 'Protocolos de tratamiento',
      entityName: 'Protocolo',
      columns,
      formSections: sections,
      searchPlaceholder: 'Buscar protocolos (mastitis, desparasitación…)',
      emptyStateMessage: 'Aún no hay protocolos en la finca.',
      emptyStateDescription: 'Crea el primero o siembra el catálogo base desde el backend.',
      enableDetailModal: true,
      enableCreateModal: true,
      enableEditModal: true,
      enableDelete: true,
      customHeader: <SanidadTabs />,
      themeColor: 'purple',
    };
  }, [diseaseOptions]);

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={treatmentProtocolsService as any}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      realtime={true}
      pollIntervalMs={0}
      refetchOnFocus={false}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
}

export default AdminTreatmentProtocolsPage;
