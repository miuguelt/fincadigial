import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import type { CRUDColumn, CRUDFormSection, CRUDConfig } from '../../../../shared/types/crud';
import { animalsService } from '@/entities/animal/api/animal.service';
import type { AnimalResponse, AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';

import { AnimalHistoryModal } from '@/widgets/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/widgets/dashboard/GeneticTreeModal';
import { useAnimalTreeApi, graphToAncestorLevels, graphToDescendantLevels } from '@/entities/animal/model/useAnimalTreeApi';
import DescendantsTreeModal from '@/widgets/dashboard/DescendantsTreeModal';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';
import { ANIMAL_GENDERS } from '@/shared/constants/enums';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { checkAnimalDependencies, clearAnimalDependencyCache } from '@/features/diagnostics/api/dependencyCheck.service';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { useAuth } from '@/features/auth/model/useAuth';
import { BreedLink } from '@/entities/breed/ui';
import { AnimalLink } from '@/entities/animal/ui';
import { AnimalCard } from '@/widgets/dashboard/animals/AnimalCard';
import { AnimalModalContent } from '@/widgets/dashboard/animals/AnimalModalContent';
import { BoardViewPotreros } from '@/widgets/dashboard/animals/BoardViewPotreros';
import { AnimalImagePreUpload } from '@/widgets/dashboard/animals/AnimalImagePreUpload';
import { animalImageService } from '@/entities/animal/api/animalImage.service';
import { useToast } from '@/app/providers/ToastContext';
import { fieldService } from '@/entities/field/api/field.service';
import {
  BatchActionToolbar,
  BatchWeightModal,
  BatchVaccinationModal,
  BatchFieldTransferModal,
  BulkTagPrintModal,
} from '@/features/animal-bulk-actions';

const ANIMAL_STATUS_OPTIONS = [
  { value: 'Vivo', label: 'Vivo' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'Muerto', label: 'Muerto' },
] as const;

const normalizeGender = (value: unknown): AnimalInput['sex'] | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  let mapped: string | undefined;
  if (['m', 'macho', 'male'].includes(normalized)) mapped = 'Macho';
  if (['f', 'hembra', 'female'].includes(normalized)) mapped = 'Hembra';
  if (['c', 'castrado', 'castrated'].includes(normalized)) mapped = 'Castrado';
  if (!mapped) return undefined;
  return ANIMAL_GENDERS.some((opt) => opt.value === mapped) ? (mapped as AnimalInput['sex']) : undefined;
};

const normalizeStatus = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  let mapped: string | undefined;
  if (['vivo', 'activo', 'sano'].includes(normalized)) mapped = 'Vivo';
  if (['vendido', 'sold'].includes(normalized)) mapped = 'Vendido';
  if (['muerto', 'fallecido', 'dead'].includes(normalized)) mapped = 'Muerto';
  if (!mapped) return undefined;
  return ANIMAL_STATUS_OPTIONS.some((opt) => opt.value === mapped) ? mapped : undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

// Mapear respuesta del backend al formulario
const mapResponseToForm = (item: AnimalResponse & { [k: string]: any }): Partial<AnimalInput> => {
  const status = normalizeStatus(item.status ?? item.estado) || 'Vivo';
  return {
    record: item.record || item.code || item.registro || '',
    birth_date: item.birth_date || item.birthDate || item.fecha_nacimiento,
    weight: toNumber(item.weight ?? item.peso),
    breeds_id: toNumber(item.breeds_id ?? item.breed_id ?? item.breedId ?? item.raza_id),
    sex: normalizeGender(item.sex ?? item.gender ?? item.sexo ?? item.genero),
    status: status as any,
    idFather: toNumber(item.idFather ?? item.father_id ?? item.padre_id ?? item.fatherId),
    idMother: toNumber(item.idMother ?? item.mother_id ?? item.madre_id ?? item.motherId),
    notes: item.notes ?? item.observations ?? item.observaciones ?? '',
    entry_date: item.entry_date,
    purchase_date: item.purchase_date,
    sale_date: item.sale_date,
    exit_date: item.exit_date,
    exit_reason: item.exit_reason || '',
  };
};

// Validación mejorada con advertencias y recomendaciones
const validateForm = (formData: Partial<AnimalInput>): string | null => {
  if (!formData.record || !formData.record.trim()) {
    return '⚠️ El registro es obligatorio. Ejemplo: REC0001, BOV001, etc.';
  }

  if (!formData.birth_date) {
    return '⚠️ La fecha de nacimiento es obligatoria para calcular la edad del animal.';
  }

  // Validar que la fecha de nacimiento no sea futura
  const birthDate = new Date(formData.birth_date);
  const today = new Date();
  if (birthDate > today) {
    return '⚠️ La fecha de nacimiento no puede ser futura. Verifique la fecha ingresada.';
  }

  // Advertir si el animal es muy viejo (más de 20 años)
  const yearsDiff = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsDiff > 20) {
    return '⚠️ La fecha de nacimiento indica que el animal tendría más de 20 años. ¿Es correcta esta fecha?';
  }

  const breedNum = Number(formData.breeds_id);
  if (formData.breeds_id == null || Number.isNaN(breedNum) || breedNum <= 0) {
    return '⚠️ Debe seleccionar una raza. La raza es importante para el seguimiento genético.';
  }

  if (!formData.sex) {
    return '⚠️ El sexo del animal es obligatorio.';
  }

  // Validar peso (requerido por el backend)
  if (formData.weight === undefined || formData.weight === null) {
    return '⚠️ El peso del animal es obligatorio.';
  }

  const weightNum = Number(formData.weight);
  if (Number.isNaN(weightNum) || weightNum <= 0) {
    return '⚠️ El peso debe ser un valor positivo mayor a 0 kg.';
  }

  if (weightNum > 2000) {
    return '⚠️ El peso parece excesivo (>2000 kg). Verifique el valor ingresado.';
  }

  // Advertir si se selecciona el mismo animal como padre y madre
  if (formData.idFather && formData.idMother && formData.idFather === formData.idMother) {
    return '⚠️ No puede seleccionar el mismo animal como padre y madre.';
  }

  return null;
};

// Datos iniciales
const initialFormData: Partial<AnimalInput> = {
  record: '',
  birth_date: getTodayColombia(),
  weight: undefined, // Requerido: será validado antes de enviar
  breeds_id: undefined as any, // Forzar que el usuario seleccione
  sex: 'Macho',
  status: 'Vivo' as any,
  idFather: undefined,
  idMother: undefined,
  notes: '',
};

import { Map as MapIcon, Activity, Users, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';

const AnimalsPotrerosHeader: React.FC = () => {
  const [fields, setFields] = useState<any[]>([]);
  const [_loading, _setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fieldService.getPaginated({ limit: 1000 });
        setFields(res.data || []);
      } catch (e) {
        console.warn('Error fetching fields for header', e);
      } finally {
        _setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    let totalCapacity = 0;
    let totalAnimals = 0;
    fields.forEach(f => {
      totalCapacity += parseInt(f.capacity || '0') || 0;
      totalAnimals += f.animal_count || 0;
    });
    return {
      totalCapacity,
      totalAnimals,
      occupation: totalCapacity > 0 ? Math.round((totalAnimals / totalCapacity) * 100) : 0,
      available: Math.max(0, totalCapacity - totalAnimals)
    };
  }, [fields]);

  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center shadow-xl shadow-primary/20">
            <MapIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Rotación en <span className="text-primary">Potreros</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">Gestión visual y estratégica de la carga animal</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Capacidad Total" value={metrics.totalCapacity} icon={<Users className="text-primary" />} />
        <KPICard title="Animales vivos en campo" value={metrics.totalAnimals} icon={<Activity className="text-rose-500" />} />
        <KPICard title="Ocupación de animales vivos" value={`${metrics.occupation}%`} icon={<ClipboardCheck className="text-amber-500" />} />
        <KPICard title="Cupos libres (vivos)" value={metrics.available} icon={<CheckCircle2 className="text-emerald-500" />} />
      </div>
    </div>
  );
};

function AdminAnimalsPage() {
  const navigate = useNavigate();
  const { id: routeAnimalId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [, setFormData] = useState<Partial<AnimalInput>>(initialFormData);
  const [viewMode, setViewMode] = useGlobalViewMode();

  // Detectar vista de potreros (query param ?vista=potreros)
  const [searchParams] = useSearchParams();
  const vista = searchParams.get('vista');
  const effectiveViewMode = vista === 'potreros' ? 'cards' : viewMode;

  // Estado para imágenes pre-seleccionadas durante la creación
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  // Estados para modales de acciones masivas
  const [bulkModal, setBulkModal] = useState<'transfer' | 'weight' | 'vaccinate' | 'print' | null>(null);
  const [selectedAnimalsForPrint, setSelectedAnimalsForPrint] = useState<any[]>([]);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const selectedIdsRef = useRef<number[]>([]);

  // Preferencia global ya persistida en el hook

  // Los selectores cargan una muestra pequeña y delegan la búsqueda al backend.
  const {
    options: breedOptions,
    loading: _loadingBreeds,
    handleSearch: _handleSearchBreeds,
  } = useForeignKeySelect(
    (params) => breedsService.getPaginated({ ...params, limit: 100 }),
    (b: { id: number; name: string }) => ({ value: b.id, label: b.name }),
    undefined,
    100
  );

  // Filtrar en PostgreSQL evita descargar y serializar todo el hato dos veces.
  const {
    options: fatherOptions,
    loading: _loadingFathers,
    refresh: refreshFathers,
  } = useForeignKeySelect(
    (params) => animalsService.getAnimalsPaginated({
      ...params,
      sex: 'Macho',
      fields: 'id,record,sex',
      limit: 50,
    }),
    (a: { id: number; record: string; sex?: string; gender?: string }) => ({
      value: a.id,
      label: a.record ? `${a.record}` : `ID ${a.id}`
    }),
    undefined,
    50
  );

  // Las búsquedas posteriores mantienen el filtro de sexo y un payload mínimo.
  const {
    options: motherOptions,
    loading: _loadingMothers,
    refresh: refreshMothers,
  } = useForeignKeySelect(
    (params) => animalsService.getAnimalsPaginated({
      ...params,
      sex: 'Hembra',
      fields: 'id,record,sex',
      limit: 50,
    }),
    (a: { id: number; record: string; sex?: string; gender?: string }) => ({
      value: a.id,
      label: a.record ? `${a.record}` : `ID ${a.id}`
    }),
    undefined,
    50
  );

  // Estados para modales
  const [isHistoryOpen, setIsHistoryOpen] = React.useState<boolean>(false);
  const [historyAnimal, setHistoryAnimal] = React.useState<{
    idAnimal: number;
    record: string;
    breed?: any;
    birth_date?: string;
    sex?: string;
    status?: string;
  } | null>(null);

  const [isTreeOpen, setIsTreeOpen] = React.useState<boolean>(false);
  const [treeAnimal, setTreeAnimal] = React.useState<any | null>(null);
  const [treeLevels, setTreeLevels] = React.useState<any[][]>([]);
  const ancestorsApi = useAnimalTreeApi();
  const [ancestorCounts, setAncestorCounts] = useState<{ nodes: number; edges: number } | undefined>(undefined);
  const [ancestorSummary, setAncestorSummary] = useState<any | undefined>(undefined);
  const [ancestorEdgeExamples, setAncestorEdgeExamples] = useState<any | undefined>(undefined);
  const [treeRootId, setTreeRootId] = useState<number | null>(null);

  const [isDescOpen, setIsDescOpen] = React.useState<boolean>(false);
  const [descAnimal, setDescAnimal] = React.useState<any | null>(null);
  const [descLevels, setDescLevels] = React.useState<any[][]>([]);
  const descendantsApi = useAnimalTreeApi();
  const [descCounts, setDescCounts] = useState<{ nodes: number; edges: number } | undefined>(undefined);
  const [descSummary, setDescSummary] = useState<any | undefined>(undefined);
  const [descEdgeExamples, setDescEdgeExamples] = useState<any | undefined>(undefined);
  const [descRootId, setDescRootId] = useState<number | null>(null);

  // Estados para modales de FK
  const [isAnimalDetailOpen, setIsAnimalDetailOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);

  // Secciones del formulario
  const formSectionsLocal: CRUDFormSection<Partial<AnimalInput>>[] = [
    {
      title: 'Información Básica',
      gridCols: 3,
      fields: [
        {
          name: 'record',
          label: 'Registro',
          type: 'text',
          required: true,
          placeholder: 'Ej: REC0001'
        },
        {
          name: 'birth_date',
          label: 'Fecha de Nacimiento',
          type: 'date',
          required: true
        },
        {
          name: 'breeds_id',
          label: 'Raza',
          type: 'select',
          required: true,
          options: breedOptions,
          placeholder: 'Seleccionar raza'
        },
        {
          name: 'sex',
          label: 'Sexo',
          type: 'select',
          required: true,
          options: ANIMAL_GENDERS as any
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          options: ANIMAL_STATUS_OPTIONS as any
        },
        {
          name: 'weight',
          label: 'Peso (kg)',
          type: 'number',
          required: true,
          placeholder: 'Ej: 250'
        },
      ],
    },
    {
      title: 'Genealogía y Adquisición',
      gridCols: 3,
      fields: [
        {
          name: 'idFather',
          label: 'Padre',
          type: 'select',
          options: fatherOptions,
          placeholder: 'Seleccionar padre',
          excludeSelf: true
        },
        {
          name: 'idMother',
          label: 'Madre',
          type: 'select',
          options: motherOptions,
          placeholder: 'Seleccionar madre',
          excludeSelf: true
        },
      ],
    },
    {
      title: 'Trazabilidad y Registro ICA',
      gridCols: 3,
      fields: [
        {
          name: 'entry_date',
          label: 'Fecha de Ingreso',
          type: 'date',
          placeholder: 'Fecha de llegada a la finca'
        },
        {
          name: 'purchase_date',
          label: 'Fecha de Compra',
          type: 'date',
          placeholder: 'Fecha de adquisición'
        },
        {
          name: 'exit_date',
          label: 'Fecha de Salida',
          type: 'date',
          placeholder: 'Fecha de egreso'
        },
        {
          name: 'sale_date',
          label: 'Fecha de Venta',
          type: 'date',
          placeholder: 'Fecha de comercialización'
        },
        {
          name: 'exit_reason',
          label: 'Motivo de Salida',
          type: 'text',
          placeholder: 'Ej: Venta, Traslado, Muerte'
        },
      ],
    },
  ];

  // Columnas de la tabla
  const columns: CRUDColumn<AnimalResponse & { [k: string]: any }>[] = [
    { key: 'record', label: 'Registro', width: 15 },
    {
      key: 'sex',
      label: 'Sexo',
      render: (v: any, record: AnimalResponse & { [k: string]: any }) => v || record.sex || '-'
    },
    {
      key: 'status',
      label: 'Estado',
      render: (v: any) => v || '-'
    },
    {
      key: 'breeds_id',
      label: 'Raza',
      render: (v: any, record: AnimalResponse & { [k: string]: any }) => {
        const breedId = v || record.breeds_id || record.breed_id;
        if (!breedId) return '-';
        const id = Number(breedId);
        const label = breedOptions.find((b) => Number(b.value) === id)?.label || `Raza ${id}`;
        return <BreedLink id={id} label={label} />;
      }
    },
    {
      key: 'birth_date',
      label: 'Nacimiento',
      render: (v: any) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-'
    },
    {
      key: 'weight',
      label: 'Peso (kg)',
      render: (v: any) => v ?? '-'
    },
    {
      key: 'age_in_months',
      label: 'Edad (meses)',
      render: (v: any) => v ?? '-'
    },
    {
      key: 'is_adult',
      label: 'Adulto',
      render: (v: any) => v === true ? 'Sí' : v === false ? 'No' : '-'
    },
    {
      key: 'idFather',
      label: 'Padre',
      render: (v: any, record: AnimalResponse & { [k: string]: any }) => {
        const fatherId = v || record.idFather || record.father_id;
        if (!fatherId) return '-';
        const id = Number(fatherId);
        const label = fatherOptions.find((o) => Number(o.value) === id)?.label || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'idMother',
      label: 'Madre',
      render: (v: any, record: AnimalResponse & { [k: string]: any }) => {
        const motherId = v || record.idMother || record.mother_id;
        if (!motherId) return '-';
        const id = Number(motherId);
        const label = motherOptions.find((o) => Number(o.value) === id)?.label || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (v: any) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-'
    },
  ];

  // Funciones para abrir modales
  const openHistoryModal = (record: AnimalResponse & { [k: string]: any }) => {
    const modalAnimal = {
      idAnimal: Number(record.id ?? 0),
      record: record.record || '',
      breed: (record as any).breed,
      birth_date: record.birth_date,
      sex: record.sex || record.gender,
      status: record.status,
    };
    setHistoryAnimal(modalAnimal);
    setIsHistoryOpen(true);
  };

  const openGeneticTreeModal = async (record: AnimalResponse & { [k: string]: any }) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const resp = await ancestorsApi.fetchAncestors(id, 3, 'id,record,sex,breeds_id,idFather,idMother');
    if (!resp) {
      // Si hay error, abrimos el modal de todas formas para mostrar el mensaje
      setTreeAnimal(record);
      setTreeLevels([]);
      setAncestorCounts(undefined);
      setAncestorSummary(undefined);
      setAncestorEdgeExamples(undefined);
      setTreeRootId(id);
      setIsTreeOpen(true);
      return;
    }
    setTreeRootId(resp.rootId);
    setTreeAnimal(resp.nodes[resp.rootId]);
    setTreeLevels(graphToAncestorLevels(resp));
    setAncestorCounts(resp.counts);
    setAncestorSummary(resp.summary);
    setAncestorEdgeExamples(resp.edge_examples);
    setIsTreeOpen(true);
  };

  const openDescendantsTreeModal = async (record: AnimalResponse & { [k: string]: any }) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const resp = await descendantsApi.fetchDescendants(id, 3, 'id,record,sex,breeds_id,idFather,idMother');
    if (!resp) {
      // Si hay error, abrimos el modal de todas formas para mostrar el mensaje
      setDescAnimal(record);
      setDescLevels([]);
      setDescCounts(undefined);
      setDescSummary(undefined);
      setDescEdgeExamples(undefined);
      setDescRootId(id);
      setIsDescOpen(true);
      return;
    }
    setDescRootId(resp.rootId);
    setDescAnimal(resp.nodes[resp.rootId]);
    setDescLevels(graphToDescendantLevels(resp));
    setDescCounts(resp.counts);
    setDescSummary(resp.summary);
    setDescEdgeExamples(resp.edge_examples);
    setIsDescOpen(true);
  };

  const openAnimalDetailModal = async (animalId: number) => {
    try {
      const animal = await animalsService.getById(animalId);
      setSelectedAnimal(animal);
      setIsAnimalDetailOpen(true);
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  // Manejar parámetro :id de la ruta para abrir detalle directamente
  useEffect(() => {
    if (routeAnimalId) {
      const animalId = Number(routeAnimalId);
      if (!Number.isNaN(animalId)) {
        openAnimalDetailModal(animalId);
      }
    }
  }, [routeAnimalId]);

  // Función personalizada para renderizar las tarjetas de animales
  const renderAnimalCard = (item: AnimalResponse & { [k: string]: any }) => {
    const breedId = item.breeds_id || item.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (item.breed?.name) || `ID ${breedId}`)
      : '-';

    const fatherId = item.idFather || item.father_id;
    const fatherLabel = fatherId
      ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`)
      : '-';

    const motherId = item.idMother || item.mother_id;
    const motherLabel = motherId
      ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`)
      : '-';

    const fieldName = item.current_field_name || null;
    const alertCount = item.pending_alerts_count || 0;

    return (
      <AnimalCard
        animal={item}
        breedLabel={breedLabel}
        fatherLabel={fatherLabel}
        motherLabel={motherLabel}
        fieldName={fieldName}
        alertCount={alertCount}
        onFatherClick={openAnimalDetailModal}
        onMotherClick={openAnimalDetailModal}
        onCardClick={() => openAnimalDetailModal(Number(item.id))}
        hideFooterActions
        embedded
      />
    );
  };

  // Renderizar vista agrupada por potreros (drag-and-drop)
  const renderGroupedAnimals = (items: AnimalResponse[]) => {
    return (
      <BoardViewPotreros
        animals={items}
        breedOptions={breedOptions}
        fatherOptions={fatherOptions}
        motherOptions={motherOptions}
        onAnimalClick={(animal) => {
          navigate(`/admin/animals/${animal.id}`);
        }}
      />
    );
  };

  // Contenido personalizado para el modal de detalle con imágenes
  const renderAnimalDetail = (item: AnimalResponse & { [k: string]: any }) => {
    const breedId = item.breeds_id || item.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (item.breed?.name) || `ID ${breedId}`)
      : '-';

    const fatherId = item.idFather || item.father_id;
    const fatherLabel = fatherId
      ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`)
      : '-';

    const motherId = item.idMother || item.mother_id;
    const motherLabel = motherId
      ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`)
      : '-';

    return (
      <AnimalModalContent
        animal={item}
        breedLabel={breedLabel}
        fatherLabel={fatherLabel}
        motherLabel={motherLabel}
        onFatherClick={openAnimalDetailModal}
        onMotherClick={openAnimalDetailModal}
        currentUserId={user?.id}
        onOpenHistory={() => openHistoryModal(item)}
        onOpenAncestorsTree={() => openGeneticTreeModal(item)}
        onOpenDescendantsTree={() => openDescendantsTreeModal(item)}
        onEdit={() => {
          const search = new URLSearchParams(window.location.search);
          search.set('edit', String(item.id));
          if (search.has('detail')) search.delete('detail'); // Intentar cerrar el detalle limpiando el param
          navigate(`?${search.toString()}`);
        }}
        onReplicate={() => {
          // Navegar a create=true
          const search = new URLSearchParams(window.location.search);
          search.set('create', 'true');
          if (search.has('detail')) search.delete('detail');
          navigate(`?${search.toString()}`);
          showToast('Modo creación iniciado. Ingrese los detalles del nuevo animal.', 'info');
        }}
      />
    );
  };

  const crudConfigLocal: CRUDConfig<AnimalResponse & { [k: string]: any }, Partial<AnimalInput>> = {
    title: 'Animales',
    entityName: 'Animal',
    viewMode: effectiveViewMode,
    columns,
    formSections: formSectionsLocal,
    searchPlaceholder: 'Buscar animales...',
    emptyStateMessage: 'No hay animales registrados',
    emptyStateDescription: 'Empiece agregando el primer semoviente de su hato.',
    emptyStateIcon: 'IconCow',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    enableSelection: vista !== 'potreros',
    defaultFields: ['id', 'record', 'name', 'birth_date', 'weight', 'breeds_id', 'sex', 'status', 'idFather', 'idMother', 'age_in_months', 'is_adult', 'current_field_id', 'current_field_name', 'pending_alerts_count', 'created_at'],
    batchActions: vista !== 'potreros'
      ? (selectedIds: number[], _items: any[], clearSelection: () => void) => {
          clearSelectionRef.current = clearSelection;
          selectedIdsRef.current = selectedIds;
          return (
            <BatchActionToolbar
              selectedCount={selectedIds.length}
              onClear={clearSelection}
              onTransfer={() => setBulkModal('transfer')}
              onWeight={() => setBulkModal('weight')}
              onVaccinate={() => setBulkModal('vaccinate')}
              onPrintTags={() => {
                const selected = _items.filter(item => selectedIds.includes(item.id));
                setSelectedAnimalsForPrint(selected);
                setBulkModal('print');
              }}
              onDelete={() => {
                showToast(`Seleccionados ${selectedIds.length} animales para eliminar. Use el botón de la barra flotante.`, 'warning');
              }}
            />
          );
        }
      : undefined,
    renderCard: renderAnimalCard,
    renderGrouped: vista === 'potreros' ? renderGroupedAnimals : undefined,
    cardGridClassName: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6',
    customHeader: vista === 'potreros' ? <AnimalsPotrerosHeader /> : undefined,
    // Mantener la vista agrupada paginada: montar decenas de tarjetas complejas
    // a la vez bloquea React y la GPU en equipos modestos.
    defaultLimit: 25,
    customToolbar: (
      <div className="flex items-center gap-1">
        <Button
          variant={effectiveViewMode === 'table' ? 'primary' : 'outline'}
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
          onClick={() => {
            if (vista === 'potreros') {
              const params = new URLSearchParams(searchParams);
              params.delete('vista');
              navigate(`?${params.toString()}`);
            }
            setViewMode('table');
          }}
          aria-label="Vista en tabla"
        >
          <span className="hidden sm:inline">Tabla</span>
          <span className="sm:hidden">T</span>
        </Button>
        <Button
          variant={effectiveViewMode === 'cards' && vista !== 'potreros' ? 'primary' : 'outline'}
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
          onClick={() => {
            if (vista === 'potreros') {
              const params = new URLSearchParams(searchParams);
              params.delete('vista');
              navigate(`?${params.toString()}`);
            }
            setViewMode('cards');
          }}
          aria-label="Vista en tarjetas"
        >
          <span className="hidden sm:inline">Tarjetas</span>
          <span className="sm:hidden">C</span>
        </Button>
        <Button
          variant={vista === 'potreros' ? 'primary' : 'outline'}
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs sm:text-sm gap-2"
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('vista', 'potreros');
            navigate(`?${params.toString()}`);
            setViewMode('cards');
          }}
          aria-label="Vista Potreros"
        >
          <MapIcon size={14} />
          <span className="hidden sm:inline">Potreros</span>
        </Button>
      </div>
    ),
    customActions: (record: AnimalResponse & { [k: string]: any }) => (
      <div className="flex items-center gap-1">
        <AnimalActionsMenu
          animal={record as AnimalResponse}
          currentUserId={user?.id}
          onOpenHistory={() => openHistoryModal(record as any)}
          onOpenAncestorsTree={() => openGeneticTreeModal(record as any)}
          onOpenDescendantsTree={() => openDescendantsTreeModal(record as any)}
        />
      </div>
    ),
    // Verificación exhaustiva de dependencias antes de eliminar
    preDeleteCheck: async (id: number) => {
      // Limpiar caché para evitar dependencias falsas de animales recién creados
      clearAnimalDependencyCache(id);
      return await checkAnimalDependencies(id);
    },
    // Refrescar dropdowns después de crear/actualizar animales
    onAfterCreate: async (createdAnimal: any) => {
      console.log('[AdminAnimalsPage] Animal creado, refrescando dropdowns:', createdAnimal);

      // Refrescar listas de padre y madre para que aparezcan animales nuevos
      refreshFathers();
      refreshMothers();

      // Subir imágenes pendientes si existen
      if (pendingImages.length > 0 && createdAnimal?.id) {
        console.log(`[AdminAnimalsPage] Subiendo ${pendingImages.length} imágenes para el animal ${createdAnimal.id}`);
        try {
          const uploadResponse = await animalImageService.uploadImages(
            createdAnimal.id,
            pendingImages,
            {
              compress: true,
              quality: 0.8,
            }
          );

          if (uploadResponse.success) {
            console.log(`[AdminAnimalsPage] ${uploadResponse.data.total_uploaded} imagen(es) subida(s) exitosamente`);

            // Despachar evento global para refrescar galerías
            window.dispatchEvent(new CustomEvent('animal-images:updated', {
              detail: { animalId: createdAnimal.id, uploaded: uploadResponse.data.uploaded }
            }));
          }
        } catch (err) {
          console.error('[AdminAnimalsPage] Error al subir imágenes:', err);
        } finally {
          // Limpiar imágenes pendientes
          setPendingImages([]);
        }
      }
    },
    onAfterUpdate: async (updatedAnimal: any) => {
      console.log('[AdminAnimalsPage] Animal actualizado, refrescando dropdowns:', updatedAnimal);
      // Refrescar listas de padre y madre para reflejar cambios de nombre
      refreshFathers();
      refreshMothers();
    },
  };

  return (
    <>
      <AdminCRUDPage
        config={crudConfigLocal}
        service={animalsService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        customDetailContent={renderAnimalDetail}
        onFormDataChange={setFormData}
        realtime={true}
        pollIntervalMs={0}
        refetchOnFocus={false}
        refetchOnReconnect={true}
        enhancedHover={true}
        additionalFormContent={(_formData: any, editingItem: any) => {
          // Solo mostrar selector de imágenes durante la creación (no en edición)
          if (editingItem) return null;

          return (
            <div className="relative rounded-xl p-4 border border-border/40 bg-gradient-to-br from-card/30 via-card/20 to-transparent shadow-sm backdrop-blur-sm">
              <div className="mb-4 pb-2 border-b border-border/30">
                <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Imágenes del Animal (Opcional)
                </h3>
              </div>
              <AnimalImagePreUpload
                files={pendingImages}
                onChange={setPendingImages}
                maxFiles={20}
              />
            </div>
          );
        }}
      />

      {/* Modal de detalle de animal (padre/madre) */}
      {isAnimalDetailOpen && selectedAnimal && (() => {
        const breedId = selectedAnimal.breeds_id || selectedAnimal.breed_id;
        const breedLabel = breedId
          ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (selectedAnimal.breed?.name) || `ID ${breedId}`)
          : '-';

        const fatherId = selectedAnimal.idFather || selectedAnimal.father_id;
        const fatherLabel = fatherId
          ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`)
          : '-';

        const motherId = selectedAnimal.idMother || selectedAnimal.mother_id;
        const motherLabel = motherId
          ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`)
          : '-';

        return (
          <GenericModal
            isOpen={isAnimalDetailOpen}
            onOpenChange={setIsAnimalDetailOpen}
            title={`Detalle del Animal: ${selectedAnimal.id}`}
            description="Información detallada del animal"
            size="full"
            variant="compact"
            enableBackdropBlur
            className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out"
            footer={(
              <div className="border-t border-border/40 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 px-4 sm:px-6 py-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Navegación deshabilitada (estética igual al detalle principal) */}
                  <div className="flex gap-2 sm:flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled
                      className="flex-1 sm:flex-initial transition-all duration-150"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled
                      className="flex-1 sm:flex-initial transition-all duration-150"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setIsAnimalDetailOpen(false)}
                      className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                    >
                      Cerrar
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        // Disparar la edición usando el mecanismo de AdminCRUDPage (query param ?edit=ID)
                        const search = new URLSearchParams(window.location.search);
                        search.set('edit', String(selectedAnimal.id));
                        const qs = `?${search.toString()}`;
                        navigate(qs);
                        setIsAnimalDetailOpen(false);
                      }}
                      className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                    >
                      <Edit className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          >
            <AnimalModalContent
              animal={selectedAnimal}
              breedLabel={breedLabel}
              fatherLabel={fatherLabel}
              motherLabel={motherLabel}
              onFatherClick={openAnimalDetailModal}
              onMotherClick={openAnimalDetailModal}
              currentUserId={user?.id}
              onOpenHistory={() => openHistoryModal(selectedAnimal)}
              onOpenAncestorsTree={() => openGeneticTreeModal(selectedAnimal)}
              onOpenDescendantsTree={() => openDescendantsTreeModal(selectedAnimal)}
            />
          </GenericModal>
        );
      })()}

      {isHistoryOpen && historyAnimal && (
        <AnimalHistoryModal
          animal={historyAnimal}
          onClose={() => {
            setIsHistoryOpen(false);
            setHistoryAnimal(null);
          }}
        />
      )}

      <GeneticTreeModal
        isOpen={isTreeOpen}
        onClose={() => {
          setIsTreeOpen(false);
          setTreeAnimal(null);
          setTreeLevels([]);
          ancestorsApi.clearError();
        }}
        animal={treeAnimal}
        levels={treeLevels}
        counts={ancestorCounts}
        summary={ancestorSummary}
        edgeExamples={ancestorEdgeExamples}
        dependencyInfo={ancestorsApi.dependencyInfo}
        treeError={ancestorsApi.error}
        loadingMore={ancestorsApi.loading}
        onNavigateToAnimal={openGeneticTreeModal}
        onOpenDescendantsTreeForAnimal={openDescendantsTreeModal}
        onLoadMore={async () => {
          if (!treeRootId || !ancestorsApi.graph) return;
          const merged = await ancestorsApi.loadMore('ancestors', treeRootId, ancestorsApi.graph, {
            increment: 2,
            fields: 'id,record,sex,breeds_id,idFather,idMother'
          });
          setTreeAnimal(merged.nodes[merged.rootId]);
          setTreeLevels(graphToAncestorLevels(merged));
          setAncestorCounts(merged.counts);
          setAncestorSummary(merged.summary);
          setAncestorEdgeExamples(merged.edge_examples);
        }}
      />

      <DescendantsTreeModal
        isOpen={isDescOpen}
        onClose={() => {
          setIsDescOpen(false);
          setDescAnimal(null);
          setDescLevels([]);
          descendantsApi.clearError();
        }}
        animal={descAnimal}
        levels={descLevels}
        counts={descCounts}
        summary={descSummary}
        edgeExamples={descEdgeExamples}
        dependencyInfo={descendantsApi.dependencyInfo}
        treeError={descendantsApi.error}
        loadingMore={descendantsApi.loading}
        onNavigateToAnimal={openDescendantsTreeModal}
        onOpenAncestorsTreeForAnimal={openGeneticTreeModal}
        onLoadMore={async () => {
          if (!descRootId || !descendantsApi.graph) return;
          const merged = await descendantsApi.loadMore('descendants', descRootId, descendantsApi.graph, {
            increment: 2,
            fields: 'id,record,sex,breeds_id,idFather,idMother'
          });
          setDescAnimal(merged.nodes[merged.rootId]);
          setDescLevels(graphToDescendantLevels(merged));
          setDescCounts(merged.counts);
          setDescSummary(merged.summary);
          setDescEdgeExamples(merged.edge_examples);
        }}
      />

      {/* Modales de acciones masivas */}
      {bulkModal === 'transfer' && (
        <BatchFieldTransferModal
          isOpen
          onClose={() => setBulkModal(null)}
          selectedAnimalIds={selectedIdsRef.current}
          onSuccess={() => {
            setBulkModal(null);
            clearSelectionRef.current?.();
          }}
        />
      )}
      {bulkModal === 'weight' && (
        <BatchWeightModal
          isOpen
          onClose={() => setBulkModal(null)}
          selectedAnimalIds={selectedIdsRef.current}
          onSuccess={() => {
            setBulkModal(null);
            clearSelectionRef.current?.();
            showToast('Pesaje masivo registrado', 'success');
          }}
        />
      )}
      {bulkModal === 'vaccinate' && (
        <BatchVaccinationModal
          isOpen
          onClose={() => setBulkModal(null)}
          selectedAnimalIds={selectedIdsRef.current}
          onSuccess={() => {
            setBulkModal(null);
            clearSelectionRef.current?.();
            showToast('Vacunación masiva registrada', 'success');
          }}
        />
      )}
      {bulkModal === 'print' && (
        <BulkTagPrintModal
          isOpen
          onClose={() => setBulkModal(null)}
          animals={selectedAnimalsForPrint.map(item => {
            const breedId = item.breeds_id || item.breed_id;
            const breedLabel = breedId
              ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (item.breed?.name) || `ID ${breedId}`)
              : undefined;
            return {
              id: item.id,
              record: item.record || `ID-${item.id}`,
              breedLabel,
              gender: item.gender || item.sex || undefined,
              birthDate: item.birth_date ? new Date(item.birth_date).toLocaleDateString('es-ES') : undefined
            };
          })}
          onSuccess={() => {
            setBulkModal(null);
            clearSelectionRef.current?.();
            showToast('Etiquetas generadas', 'success');
          }}
        />
      )}
    </>
  );
}

export default AdminAnimalsPage;
