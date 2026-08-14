import  { useMemo, useState, useEffect } from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { medicationsService } from '@/entities/medication/api/medications.service';
import type { MedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { routeAdministrationsService } from '@/entities/route-administration/api/routeAdministrations.service';
import { ItemDetailModal } from '@/widgets/dashboard/animals/ItemDetailModal';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';

// Input del formulario
type MedicationInput = {
  name: string;
  description?: string;
  dosis?: string;
  availability?: boolean;
  route_administration_id?: number;
  indications?: string;
  contraindications?: string;
};

// Página principal
function AdminMedicationsPage() {
  const [routeOptions, setRouteOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await routeAdministrationsService.getRouteAdministrations?.({ page: 1, limit: 1000 });
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setRouteOptions((list || []).map((r: any) => ({
          value: r.id,
          label: r.name || r.route || r.description || `ID ${r.id}`,
        })));
      } catch (e) {
        console.warn('[medications] Error en carga de opciones', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const routeMap = useMemo(() => {
    const map = new Map<number, string>();
    routeOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [routeOptions]);

  // Columnas de la tabla
  const columns: CRUDColumn<MedicationResponse & { [k: string]: any }>[] = useMemo(() => [
    { 
      key: 'name', 
      label: 'Nombre',
      render: (v) => (
        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
          <span>💊</span> {v}
        </span>
      )
    },
    { key: 'dosis', label: 'Dosis', render: (v) => v || '-' },
    { key: 'availability', label: 'Disponibilidad', render: (v) => (v ? '✅ Sí' : '❌ No') },
    { 
      key: 'route_administration_id', 
      label: 'Ruta Admin.',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = routeMap.get(id) || `ID ${id}`;
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <span>⚙️</span> {label}
          </span>
        );
      }
    },
    { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-') },
  ], [routeMap]);

  // Secciones del formulario
  const formSections: CRUDFormSection<MedicationInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Florfenicol' },
        { name: 'dosis', label: 'Dosis', type: 'text', placeholder: 'Ej: 20mg/kg' },
        { name: 'route_administration_id', label: 'Ruta de Administración', type: 'select', options: routeOptions, placeholder: 'Seleccionar ruta' },
        { name: 'availability', label: 'Disponible', type: 'checkbox' },
      ],
    },
    {
      title: 'Detalles',
      gridCols: 2,
      fields: [
        { name: 'indications', label: 'Indicaciones', type: 'textarea', placeholder: 'Ej: Enfermedades respiratorias', colSpan: 2 },
        { name: 'contraindications', label: 'Contraindicaciones', type: 'textarea', placeholder: 'Ej: No usar en leche', colSpan: 2 },
        { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción general del medicamento', colSpan: 2 },
      ],
    },
  ];

  // Configuración CRUD
  const crudConfig: CRUDConfig<MedicationResponse & { [k: string]: any }, MedicationInput> = {
    title: 'Medicamentos',
    entityName: 'Medicamento',
    columns,
    formSections,
    searchPlaceholder: 'Buscar medicamentos...',
    emptyStateMessage: 'No hay medicamentos registrados.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
    customHeader: <div className="mt-4"><SanidadTabs /></div>,
    themeColor: 'purple',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center animate-pulse">
          <p className="text-muted-foreground text-sm">Cargando medicamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={medicationsService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      customDetailContent={(item, handlers: any) => (
        <ItemDetailModal
          type="medication"
          item={item}
          onEdit={handlers?.onEdit}
          onClose={() => { }}
          options={{
            routes: Object.fromEntries(routeOptions.map(o => [o.value, o.label]))
          }}
        />
      )}
      realtime={true}
      enhancedHover={true}
    />
  );
}

// Mapear respuesta a formulario
const mapResponseToForm = (item: MedicationResponse & { [k: string]: any }): MedicationInput => ({
  name: item.name || '',
  description: (item as any).description || '',
  dosis: (item as any).dosis || '',
  availability: (item as any).availability ?? true,
  route_administration_id: (item as any).route_administration_id,
  indications: (item as any).indications || '',
  contraindications: (item as any).contraindications || '',
});

// Validación
const validateForm = (formData: MedicationInput): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: MedicationInput = {
  name: '',
  description: '',
  dosis: '',
  availability: true,
  route_administration_id: undefined,
  indications: '',
  contraindications: '',
};

export default AdminMedicationsPage;
