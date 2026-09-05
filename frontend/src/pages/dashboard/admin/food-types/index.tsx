import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDConfig } from '@/shared/types/crud';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';
import { fieldService } from '@/entities/field/api/field.service';
import type { FoodTypeResponse, FieldResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { useToast } from '@/app/providers/ToastContext';
import { useSearchParams } from 'react-router-dom';
import {
  Sprout,
  Scale,
  LayoutGrid,
  Table as TableIcon,
  Calculator,
  MapPin,
  Leaf,
  Plus,
} from 'lucide-react';
import {
  FoodTypesHeader,
  FoodCategoryTabs,
  FoodTypeCard,
  FoodTypeDetailModal,
  FoodTypeFormModal,
  type FoodTypeFormData,
} from '@/widgets/food-types';
import {
  classifyFoodType,
  type ForageCategoryId,
} from '@/entities/food-type/model/forageClassification';
import { AforoCalculatorModal, PastureRestModal } from '@/features/potreros';
import { RationCalculatorModal } from '@/features/operational/ui/RationCalculatorModal';

export const AdminFoodTypesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [activeCategory, setActiveCategory] = useState<ForageCategoryId>('all');
  const [currentItems, setCurrentItems] = useState<Array<FoodTypeResponse & { [k: string]: any }>>([]);

  // Modales
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<(FoodTypeResponse & { [k: string]: any }) | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(FoodTypeResponse & { [k: string]: any }) | null>(null);
  const [isFormSaving, setIsFormSaving] = useState(false);

  const [isAforoOpen, setIsAforoOpen] = useState(false);
  const [aforoField, setAforoField] = useState<FieldResponse | null>(null);

  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [isRationModalOpen, setIsRationModalOpen] = useState(false);

  // Abrir modal de creación si viene en query params (?create=true)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingItem(null);
      setIsFormOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Consulta de potreros para asociar forrajes
  const { data: fieldsResp } = useQuery({
    queryKey: ['fields-for-food-types'],
    queryFn: async () => {
      const resp = await fieldService.getFields({ limit: 200 });
      const raw = (resp as any)?.data ?? (resp as any)?.items ?? resp ?? [];
      return Array.isArray(raw) ? (raw as FieldResponse[]) : [];
    },
    staleTime: 60000,
  });

  const fields: FieldResponse[] = useMemo(() => {
    return Array.isArray(fieldsResp) ? fieldsResp : [];
  }, [fieldsResp]);

  // Mapa de potreros por food_type_id
  const fieldsByFoodType = useMemo(() => {
    const map = new Map<number, FieldResponse[]>();
    fields.forEach((f) => {
      if (f.food_type_id) {
        const id = Number(f.food_type_id);
        const list = map.get(id) || [];
        list.push(f);
        map.set(id, list);
      }
    });
    return map;
  }, [fields]);

  // Conteos por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<ForageCategoryId, number> = {
      all: currentItems.length,
      pasture: 0,
      cut_grass: 0,
      legume_silvopastoral: 0,
      silage_hay: 0,
      mineral_supplement: 0,
      concentrate: 0,
    };

    currentItems.forEach((item) => {
      const { category } = classifyFoodType(item.food_type || item.name, item.handlings || item.description);
      if (counts[category.id] !== undefined) {
        counts[category.id]++;
      }
    });

    return counts;
  }, [currentItems]);

  // Manejadores de acciones
  const handleOpenDetail = useCallback((item: FoodTypeResponse & { [k: string]: any }) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: FoodTypeResponse & { [k: string]: any }) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleOpenAforo = useCallback(
    (item?: any) => {
      if (item && item.id) {
        const linked = fieldsByFoodType.get(Number(item.id));
        if (linked && linked.length > 0) {
          setAforoField(linked[0]);
        } else {
          setAforoField(null);
        }
      } else {
        setAforoField(null);
      }
      setIsAforoOpen(true);
    },
    [fieldsByFoodType]
  );

  // Guardado de formulario modal
  const handleFormSubmit = async (formData: FoodTypeFormData) => {
    setIsFormSaving(true);
    try {
      if (editingItem && editingItem.id) {
        await foodTypesService.updateFoodType(String(editingItem.id), formData as any);
        showToast('Tipo de alimento actualizado exitosamente', 'success');
      } else {
        await foodTypesService.createFoodType(formData as any);
        showToast('Tipo de alimento registrado exitosamente', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['food_types'] });
      setIsFormOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar el tipo de alimento';
      showToast(msg, 'error');
    } finally {
      setIsFormSaving(false);
    }
  };

  // ─── Columnas de Tabla Enriquecidas ──────────────────────────────────────────
  const columns: CRUDColumn<FoodTypeResponse & { [k: string]: any }>[] = useMemo(
    () => [
      {
        key: 'food_type',
        label: 'Nombre / Variedad',
        sortable: true,
        render: (_v, item) => {
          const name = item.food_type || item.name || '-';
          const { category } = classifyFoodType(name, item.handlings || item.description);
          return (
            <div className="flex items-center gap-2">
              <span className="text-base">{category.icon}</span>
              <div className="min-w-0">
                <span className="font-bold text-foreground hover:text-emerald-600 transition-colors block fit-clamp">
                  {name}
                </span>
                <span className="text-[11px] text-muted-foreground">{category.shortLabel}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'category' as any,
        label: 'Categoría',
        render: (_v, item) => {
          const { category } = classifyFoodType(item.food_type || item.name, item.handlings || item.description);
          return (
            <Badge variant="outline" className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${category.badgeClass}`}>
              {category.shortLabel}
            </Badge>
          );
        },
      },
      {
        key: 'nutrition' as any,
        label: 'Calidad Bromatológica',
        render: (_v, item) => {
          const { profile } = classifyFoodType(item.food_type || item.name, item.handlings || item.description);
          return (
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <Leaf className="w-3 h-3 text-emerald-500" />
                {profile.estimatedProtein}
              </span>
              {profile.restDaysSuggested > 0 ? (
                <span className="block text-[11px] text-muted-foreground font-medium">
                  ⏳ {profile.restDaysSuggested}d descanso
                </span>
              ) : (
                <span className="block text-[11px] text-muted-foreground">{profile.dryMatter}</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'linked_fields' as any,
        label: 'Potreros',
        render: (_v, item) => {
          const linked = fieldsByFoodType.get(Number(item.id)) || [];
          if (linked.length === 0) {
            return <span className="text-[11px] text-muted-foreground">0 potreros</span>;
          }
          return (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-bold gap-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(item);
              }}
              title={`Potreros: ${linked.map((f) => f.name).join(', ')}`}
            >
              <MapPin className="w-3 h-3" />
              {linked.length} {linked.length === 1 ? 'potrero' : 'potreros'}
            </Badge>
          );
        },
      },
      {
        key: 'area',
        label: 'Área',
        sortable: true,
        render: (v) => (v ? `${v} ha` : '-'),
      },
      {
        key: 'handlings',
        label: 'Manejo / Suministro',
        render: (v, item) => {
          const text = v || item.description || '-';
          return (
            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[260px]" title={String(text)}>
              {text}
            </span>
          );
        },
      },
      {
        key: 'created_at',
        label: 'Creado',
        sortable: true,
        render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-'),
      },
    ],
    [fieldsByFoodType, handleOpenDetail]
  );

  // ─── Render Card para Vista Grid ──────────────────────────────────────────
  const renderFoodTypeCard = useCallback(
    (item: FoodTypeResponse & { [k: string]: any }) => (
      <FoodTypeCard
        item={item}
        fields={fields}
        onOpenDetail={handleOpenDetail}
        onOpenEdit={handleOpenEdit}
        onOpenAforo={handleOpenAforo}
      />
    ),
    [fields, handleOpenDetail, handleOpenEdit, handleOpenAforo]
  );

  // ─── Toolbar Personalizado con Filtros & Herramientas ──────────────────────
  const customToolbar = useMemo(
    () => (
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full pb-2">
        {/* Selector de Categorías Forrajeras */}
        <FoodCategoryTabs
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          counts={categoryCounts}
        />

        {/* Herramientas Zootécnicas & Conmutador de Vistas */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs"
            onClick={() => handleOpenAforo()}
            title="Calculadora de Aforo de Pasturas"
          >
            <Scale size={14} className="text-emerald-500" />
            <span className="hidden sm:inline">Aforo de</span> Pastos
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shadow-xs"
            onClick={() => setIsRestModalOpen(true)}
            title="Semáforo de Reposo y Rebrote de Potreros"
          >
            <Sprout size={14} className="text-amber-500" />
            <span className="hidden sm:inline">Semáforo</span> Reposo
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shadow-xs"
            onClick={() => setIsRationModalOpen(true)}
            title="Calculadora de Raciones y Concentrados"
          >
            <Calculator size={14} className="text-blue-500" />
            <span className="hidden sm:inline">Raciones</span>
          </Button>

          {/* View mode toggle */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-lg ${viewMode === 'cards' ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setViewMode('cards')}
              title="Vista Cuadrícula / Tarjetas Bento"
            >
              <LayoutGrid size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-lg ${viewMode === 'table' ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setViewMode('table')}
              title="Vista Tabla Detallada"
            >
              <TableIcon size={14} />
            </Button>
          </div>

          {/* Botón de Crear Nuevo Forraje / Alimento */}
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/25 rounded-xl"
            onClick={handleOpenCreate}
          >
            <Plus size={14} />
            <span>Nuevo</span>
          </Button>
        </div>
      </div>
    ),
    [
      activeCategory,
      categoryCounts,
      handleOpenAforo,
      handleOpenCreate,
      viewMode,
      setViewMode,
    ]
  );

  // ─── Configuración CRUD ───────────────────────────────────────────────────
  const crudConfig: CRUDConfig<FoodTypeResponse & { [k: string]: any }, any> = useMemo(
    () => ({
      title: 'Alimentación y Forrajes',
      entityName: 'Tipo de Alimento',
      columns,
      customHeader: <FoodTypesHeader items={currentItems} fields={fields} />,
      customToolbar,
      viewMode,
      renderCard: renderFoodTypeCard,
      cardGridClassName: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5 !auto-rows-max',
      searchPlaceholder: 'Buscar pasto, forraje, sal mineral, concentrado...',
      emptyStateMessage: 'No se encontraron alimentos ni forrajes',
      emptyStateDescription: 'Registra una nueva pastura o alimento para comenzar a monitorear la nutrición.',
      enableDetailModal: false,
      enableCreateModal: false,
      enableEditModal: false,
      enableDelete: true,
      onOpenDetail: handleOpenDetail,
    }),
    [columns, currentItems, fields, customToolbar, viewMode, renderFoodTypeCard, handleOpenDetail]
  );

  // Filtro por categoría en memoria para la lista
  const filterItemsByCategory = useCallback(
    (items: Array<FoodTypeResponse & { [k: string]: any }>) => {
      if (activeCategory === 'all') return items;
      return items.filter((item) => {
        const { category } = classifyFoodType(item.food_type || item.name, item.handlings || item.description);
        return category.id === activeCategory;
      });
    },
    [activeCategory]
  );

  return (
    <>
      <AdminCRUDPage
        config={crudConfig}
        service={foodTypesService}
        initialFormData={{
          food_type: '',
          handlings: '',
          sowing_date: undefined,
          harvest_date: undefined,
          area: undefined,
          gauges: '',
        }}
        filterItems={filterItemsByCategory}
        onItemsChange={setCurrentItems}
        onOpenDetail={handleOpenDetail}
        realtime={true}
        pollIntervalMs={0}
        refetchOnFocus={false}
        refetchOnReconnect={true}
        enhancedHover={true}
      />

      {/* Botón Flotante para Crear en Móvil / Acceso Rápido */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <Button
          onClick={handleOpenCreate}
          className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center p-0"
          title="Nuevo Alimento"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Modal de Detalle Bromatológico y Zootécnico */}
      <FoodTypeDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={detailItem}
        fields={fields}
        onOpenAforo={handleOpenAforo}
      />

      {/* Modal de Creación / Edición con Presets */}
      <FoodTypeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingItem}
        onSubmit={handleFormSubmit}
        loading={isFormSaving}
      />

      {/* Modales Zootécnicos Integrados */}
      <AforoCalculatorModal
        isOpen={isAforoOpen}
        onClose={() => setIsAforoOpen(false)}
        initialField={aforoField}
        fields={fields}
      />

      <PastureRestModal
        isOpen={isRestModalOpen}
        onClose={() => setIsRestModalOpen(false)}
      />

      <RationCalculatorModal
        isOpen={isRationModalOpen}
        onClose={() => setIsRationModalOpen(false)}
      />
    </> 
  );
};

export default AdminFoodTypesPage;