import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { inventoryService } from '@/entities/inventory/api/inventory.service';
import type { MedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { routeAdministrationsService } from '@/entities/route-administration/api/routeAdministrations.service';
import { MedicationDetailContent } from './components/MedicationDetailContent';
import { MedicationsHeaderBanner } from './components/MedicationsHeaderBanner';
import { Boxes, CheckCircle2, XCircle } from 'lucide-react';

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
  const navigate = useNavigate();
  const [routeOptions, setRouteOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [stockMap, setStockMap] = useState<Record<number, { total: number; unit: string; lotCount: number }>>({});
  const [loading, setLoading] = useState(true);

  // Carga de opciones de rutas de administración
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

  // Carga del stock actual de medicamentos en la finca
  const loadStockData = useCallback(async () => {
    try {
      const lotsRes: any = await inventoryService.getLots({ limit: 1000 });
      const lotList = Array.isArray(lotsRes) ? lotsRes : lotsRes?.data ?? lotsRes?.items ?? [];
      const map: Record<number, { total: number; unit: string; lotCount: number }> = {};

      (lotList || []).forEach((lot: any) => {
        if (lot.medication_id) {
          const mId = Number(lot.medication_id);
          const qty = Number(lot.current_quantity ?? lot.quantity ?? 0);
          const unit = lot.unit || 'unidades';

          if (!map[mId]) {
            map[mId] = { total: 0, unit, lotCount: 0 };
          }
          map[mId].total += isNaN(qty) ? 0 : qty;
          map[mId].lotCount += 1;
        }
      });

      setStockMap(map);
    } catch (err) {
      console.warn('[medications] Error al cargar stock de inventario', err);
    }
  }, []);

  useEffect(() => {
    loadStockData();

    // Actualización reactiva al cambiar recursos en servidor
    const handleResourceChanged = (e: CustomEvent) => {
      if (e.detail?.endpoint?.includes('inventory')) {
        loadStockData();
      }
    };

    window.addEventListener('server-resource-changed' as any, handleResourceChanged);
    return () => {
      window.removeEventListener('server-resource-changed' as any, handleResourceChanged);
    };
  }, [loadStockData]);

  const routeMap = useMemo(() => {
    const map = new Map<number, string>();
    routeOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [routeOptions]);

  // Columnas de la tabla
  const columns: CRUDColumn<MedicationResponse & { [k: string]: any }>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Nombre de Medicamento',
      render: (v) => (
        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
          <span className="text-base">💊</span> {v}
        </span>
      )
    },
    { key: 'dosis', label: 'Dosis Sugerida', render: (v) => v || '-' },
    {
      key: 'availability',
      label: 'En Catálogo',
      render: (v) => (
        v ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" title="Habilitado para formular y aplicar en tratamientos">
            <CheckCircle2 className="w-3 h-3" /> Habilitado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-muted/60 text-muted-foreground border border-border/50" title="Inactivo en catálogo de referencia">
            <XCircle className="w-3 h-3" /> Inactivo
          </span>
        )
      )
    },
    {
      key: 'route_administration_id',
      label: 'Vía de Administración',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = routeMap.get(id) || `ID ${id}`;
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
            <span>⚙️</span> {label}
          </span>
        );
      }
    },
    {
      key: 'stock',
      label: 'Stock en Finca',
      render: (_v, row) => {
        const info = stockMap[Number(row.id)];
        if (info && info.total > 0) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/inventory?search=${encodeURIComponent(row.name)}`);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all hover:scale-102"
              title={`Ver ${info.lotCount} lote(s) en inventario`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>{Number(info.total.toFixed(2))} {info.unit}</span>
              <span className="text-[10px] opacity-75">({info.lotCount} {info.lotCount === 1 ? 'lote' : 'lotes'})</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/admin/inventory?create=1');
            }}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors"
            title="Sin existencias físicas registradas en el botiquín. Clic para registrar ingreso."
          >
            <span className="opacity-70">0 en bodega</span>
            <span className="text-[10px] text-primary underline font-bold">Ingresar</span>
          </button>
        );
      }
    },
    { key: 'created_at', label: 'Registrado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-') },
  ], [routeMap, stockMap, navigate]);

  // Secciones del formulario
  const formSections: CRUDFormSection<MedicationInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        {
          name: 'name',
          label: 'Nombre',
          type: 'text',
          required: true,
          placeholder: 'Ej: Florfenicol',
          suggestions: [
            'Oxitetraciclina L.A.',
            'Penicilina Estreptomicina',
            'Ivermectina 1%',
            'Florfenicol 30%',
            'Flunixin Meglumine',
            'Complejo B + B12',
            'Calcio con Magnesio',
            'Dexametasona',
          ],
        },
        {
          name: 'dosis',
          label: 'Dosis Sugerida',
          type: 'text',
          placeholder: 'Ej: 20mg/kg o 1 mL / 10 kg',
          suggestions: [
            '1 mL / 10 kg',
            '1 mL / 50 kg',
            '10 mL intramuscular',
            '20 mL subcutánea',
            '50 mL IV lento',
            '1 frasco 500 mL',
          ],
        },
        { name: 'route_administration_id', label: 'Ruta de Administración', type: 'select', options: routeOptions, placeholder: 'Seleccionar ruta' },
        { name: 'availability', label: 'Habilitado en Catálogo', type: 'checkbox' },
      ],
    },
    {
      title: 'Detalles Clínicos',
      gridCols: 2,
      fields: [
        {
          name: 'indications',
          label: 'Indicaciones',
          type: 'textarea',
          placeholder: 'Ej: Tratamiento de infecciones respiratorias y fiebre',
          colSpan: 2,
          suggestions: [
            'Tratamiento de infecciones respiratorias y fiebre',
            'Control de parásitos gastrointestinales y garrapatas',
            'Antiinflamatorio, antipirético y analgésico',
            'Terapia de soporte vitamínico y reconstituyente',
            'Tratamiento de mastitis clínica y metritis',
          ],
        },
        {
          name: 'contraindications',
          label: 'Contraindicaciones y Tiempo de Retiro',
          type: 'textarea',
          placeholder: 'Ej: No usar en hembras en producción de leche para consumo',
          colSpan: 2,
          suggestions: [
            'No administrar en hembras en producción de leche para consumo humano',
            'No usar en animales con insuficiencia renal o hepática',
            'Respetar tiempo de retiro previo al sacrificio',
            'No aplicar vía endovenosa rápida',
          ],
        },
        {
          name: 'description',
          label: 'Descripción General',
          type: 'textarea',
          placeholder: 'Descripción general del medicamento',
          colSpan: 2,
          suggestions: [
            'Antibiótico de amplio espectro y larga acción',
            'Antiparasitario endectocida para bovinos',
            'Antiinflamatorio no esteroideo analgésico',
            'Solución inyectable mineralizante y multivitamínica',
          ],
        },
      ],
    },
  ];

  // Configuración CRUD
  const crudConfig: CRUDConfig<MedicationResponse & { [k: string]: any }, MedicationInput> = {
    title: 'Catálogo de Medicamentos',
    headerDescription: 'Vademécum de referencia con los posibles medicamentos utilizables en la finca. Consulta el stock físico en Inventario.',
    entityName: 'Medicamento',
    columns,
    formSections,
    searchPlaceholder: 'Buscar medicamentos en catálogo...',
    emptyStateMessage: 'No hay medicamentos registrados en el catálogo.',
    emptyStateDescription: 'Registra un medicamento para habilitarlo en tratamientos.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
    detailTitle: (item: any) =>
      item?.name ? `Ficha de Medicamento: ${item.name} (#${item.id})` : `Ficha de Medicamento #${item?.id}`,
    customHeader: <MedicationsHeaderBanner />,
    themeColor: 'purple',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center animate-pulse">
          <p className="text-muted-foreground text-sm">Cargando catálogo de medicamentos...</p>
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
      customDetailContent={(item) => (
        <MedicationDetailContent
          medication={item}
          routeLabel={routeMap.get(Number(item.route_administration_id))}
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
