import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Edit,
  Leaf,
  MapPin,
  Maximize2,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { animalService } from '@/entities/animal/api/animal.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { fieldService } from '@/entities/field/api/field.service';
import { FieldReadyService } from '@/shared/api/offline/FieldReadyService';
import type { AnimalResponse, FieldResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { AnimalCard } from '@/widgets/dashboard/animals/AnimalCard';
import { AnimalModal } from '@/widgets/dashboard/animals/AnimalModal';
import { AnimalModalContent } from '@/widgets/dashboard/animals/AnimalModalContent';

type FieldDetailsTab = 'overview' | 'animals' | 'stats';

interface FieldDetailsModalProps {
  field?: FieldResponse | null;
  fieldId?: number | string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: FieldDetailsTab;
  onEdit?: (field: FieldResponse) => void;
}

const tabs: Array<{ id: FieldDetailsTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Resumen', icon: Activity },
  { id: 'animals', label: 'Animales por potrero', icon: Users },
  { id: 'stats', label: 'Estadísticas', icon: TrendingUp },
];

const numberFrom = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getOccupancyTone = (rate: number) => {
  if (rate > 100) {
    return {
      label: 'Sobrecargado',
      text: 'text-destructive',
      badge: 'bg-destructive/10 text-destructive border-destructive/20',
      bar: 'bg-destructive',
      track: 'bg-destructive/10',
    };
  }
  if (rate >= 80) {
    return {
      label: 'Casi lleno',
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/40',
      bar: 'bg-amber-500',
      track: 'bg-amber-500/10',
    };
  }
  if (rate > 0) {
    return {
      label: 'Operativo',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/40',
      bar: 'bg-blue-500',
      track: 'bg-blue-500/10',
    };
  }
  return {
    label: 'Disponible',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40',
    bar: 'bg-emerald-500',
    track: 'bg-emerald-500/10',
  };
};

const getAnimalFieldId = (animal: any) =>
  animal.field_id ?? animal.field?.id ?? animal.id_field ?? animal.fields_id ?? animal.fieldId;

const animalMatchesField = (animal: any, fieldId: FieldResponse['id']) =>
  String(getAnimalFieldId(animal)) === String(fieldId);

const animalLabel = (animal: any) => animal.record || animal.name || `Animal #${animal.id}`;

const getBreedLabel = (animal: any) =>
  animal.breed?.name || animal.breed_name || animal.breed?.breed || `ID ${animal.breed_id ?? animal.breeds_id ?? '-'}`;

const getFatherLabel = (animal: any) =>
  animal.father?.record || animal.father_record || `${animal.idFather ?? animal.father_id ?? '-'}`;

const getMotherLabel = (animal: any) =>
  animal.mother?.record || animal.mother_record || `${animal.idMother ?? animal.mother_id ?? '-'}`;

export const FieldDetailsModal: React.FC<FieldDetailsModalProps> = ({
  field: propField,
  fieldId,
  isOpen,
  onClose,
  initialTab = 'overview',
  onEdit,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FieldDetailsTab>(initialTab);
  const [currentFieldId, setCurrentFieldId] = useState<number | undefined>(
    propField?.id ?? (fieldId ? Number(fieldId) : undefined)
  );

  const resolvedId = currentFieldId ?? propField?.id ?? (fieldId ? Number(fieldId) : undefined);

  const [animalDetailStack, setAnimalDetailStack] = useState<{id: number; data: any}[]>([]);

  const handleOpenAnimalDetail = async (animal: any) => {
    const id = Number(animal.id || animal.animal_id);
    if (!id) return;
    setAnimalDetailStack((prev) => [...prev, { id, data: animal }]);
    try {
      const full = await animalService.getById(String(id));
      setAnimalDetailStack((prev) => {
        const nextStack = [...prev];
        const idx = nextStack.findIndex((i) => i.id === id);
        if (idx >= 0) {
          nextStack[idx] = { ...nextStack[idx], data: full };
        }
        return nextStack;
      });
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    setCurrentFieldId(propField?.id ?? (fieldId ? Number(fieldId) : undefined));
  }, [propField?.id, fieldId]);

  const { data: allFields = [] } = useQuery({
    queryKey: ['field-details-all-fields'],
    enabled: isOpen,
    queryFn: async () => {
      const resp = await fieldService.getFields({ limit: 500 });
      return (resp.data || []) as FieldResponse[];
    },
  });

  const { data: fetchedField, isLoading: fieldLoading, isError: fieldError, refetch } = useQuery({
    queryKey: ['field-details-field', resolvedId],
    enabled: isOpen && !!resolvedId && !propField,
    queryFn: async () => {
      const data = await fieldService.getById(String(resolvedId));
      return data as FieldResponse;
    },
  });

  const field = propField || fetchedField || null;

  const currentField = useMemo(() => {
    if (!field) return null;
    if (field.id === currentFieldId) return field;
    return allFields.find((f) => f.id === currentFieldId) || field;
  }, [field, allFields, currentFieldId]);

  const sortedFields = useMemo(() => {
    return [...allFields].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
  }, [allFields]);

  const currentIndex = useMemo(() => {
    if (!currentFieldId) return -1;
    return sortedFields.findIndex((f) => f.id === currentFieldId);
  }, [sortedFields, currentFieldId]);

  const f = currentField;

  const { data: animals = [], isLoading: animalsLoading } = useQuery({
    queryKey: ['field-details-animals', f?.id],
    enabled: isOpen && !!f && (activeTab === 'animals' || activeTab === 'stats'),
    queryFn: async () => {
      if (!f?.id) return [];
      
      // 1. Intentar obtener del cache offline local (Modo Campo / FieldReadyService)
      // Esto proporciona una velocidad de carga instantánea tanto offline como online.
      try {
        const cachedAnimals = await FieldReadyService.getAnimals();
        if (cachedAnimals && cachedAnimals.length > 0) {
          const matched = cachedAnimals.filter((animal: any) => animalMatchesField(animal, f.id));
          if (matched.length > 0) {
            console.log(`[FieldDetailsModal] Cargando ${matched.length} animales desde cache offline para potrero ${f.id}`);
            return matched as AnimalResponse[];
          }
        }
      } catch (err) {
        console.warn('[FieldDetailsModal] Error leyendo cache de FieldReadyService:', err);
      }

      // 2. Si no está precargado en Modo Campo, llamar al endpoint específico del potrero
      try {
        const fieldAnimals = await fieldService.getAnimalsByField(f.id);
        if (Array.isArray(fieldAnimals)) return fieldAnimals as AnimalResponse[];
      } catch (error) {
        console.warn('[FieldDetailsModal] No se pudo cargar animales por endpoint de potrero, intentando fallback:', error);
      }

      // 3. Fallback final: obtener animales paginados de animalService (que usa IndexedDB de BaseService con 60 días de gracia)
      try {
        const response = await animalService.getPaginated({ limit: 500 });
        return (response.data || []).filter((animal: any) => animalMatchesField(animal, f.id));
      } catch (error) {
        console.error('[FieldDetailsModal] Fallback final fallido:', error);
        return [];
      }
    },
  });

  const animalStats = useMemo(() => {
    const bySpecies = new Map<string, number>();
    const bySex = new Map<string, number>();
    const byBreed = new Map<string, number>();
    let totalAge = 0;
    let animalsWithBirthDate = 0;

    animals.forEach((animal: any) => {
      const species = animal.specie?.name || animal.species?.name || animal.species_name || 'Sin especie';
      const sex = animal.sex || animal.gender || 'Sin definir';
      const breed = animal.breed?.name || animal.breed_name || 'Sin raza';

      bySpecies.set(species, (bySpecies.get(species) || 0) + 1);
      bySex.set(sex, (bySex.get(sex) || 0) + 1);
      byBreed.set(breed, (byBreed.get(breed) || 0) + 1);

      if (animal.birth_date) {
        const birth = new Date(animal.birth_date);
        if (!Number.isNaN(birth.getTime())) {
          totalAge += Math.max(0, new Date().getFullYear() - birth.getFullYear());
          animalsWithBirthDate += 1;
        }
      }
    });

    return {
      bySpecies: Array.from(bySpecies.entries()),
      bySex: Array.from(bySex.entries()),
      byBreed: Array.from(byBreed.entries()),
      avgAge: animalsWithBirthDate > 0 ? totalAge / animalsWithBirthDate : 0,
    };
  }, [animals]);

  const navigateField = (direction: 'prev' | 'next') => {
    if (currentIndex < 0 || sortedFields.length === 0) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= sortedFields.length) return;
    const nextId = sortedFields[nextIndex].id;
    setCurrentFieldId(nextId);
    queryClient.removeQueries({ queryKey: ['field-details-field', nextId] });
    setActiveTab('overview');
  };

  const handleRemoveFromField = async (animalId: number) => {
    if (!f) return;
    if (!window.confirm('¿Estás seguro de que quieres quitar este animal del potrero?')) return;
    await animalFieldsService.removeFromField(animalId);
    queryClient.setQueryData<AnimalResponse[]>(['field-details-animals', f.id], (current = []) =>
      current.filter((animal: any) => Number(animal.id) !== Number(animalId))
    );
    queryClient.invalidateQueries({ queryKey: ['field-details-animals', f.id] });
  };

  const capacity = f ? Math.max(0, Math.trunc(numberFrom(f.capacity))) : 0;
  const area = f ? numberFrom(f.area) : 0;
  const occupied = f ? Math.max(0, f.animal_count ?? 0) : 0;

  const hasDefinedCapacity = capacity > 0;
  const estimatedCapacity = area > 0 ? Math.max(1, Math.round(area * 2)) : 0;
  const effectiveCapacity = hasDefinedCapacity ? capacity : estimatedCapacity;
  const isEstimated = !hasDefinedCapacity && area > 0;

  const available = effectiveCapacity > 0 ? effectiveCapacity - occupied : 0;
  const occupationRate = effectiveCapacity > 0 ? (occupied / effectiveCapacity) * 100 : 0;
  const progressRate = effectiveCapacity > 0 ? Math.min(occupationRate, 100) : occupied > 0 ? 100 : 0;
  const tone = getOccupancyTone(occupationRate);
  const location = f ? (f.ubication || 'Sin ubicación') : 'Cargando...';
  const foodTypeLabel = f
    ? (f.food_type?.food_type || (f.food_type_id ? `Tipo ${f.food_type_id}` : 'Sin tipo de alimento'))
    : 'Cargando...';

  const historicalData = useMemo(
    () => [
      { month: 'Ene', occupation: Math.round(occupied * 0.78), capacity: effectiveCapacity },
      { month: 'Feb', occupation: Math.round(occupied * 0.86), capacity: effectiveCapacity },
      { month: 'Mar', occupation: Math.round(occupied * 0.92), capacity: effectiveCapacity },
      { month: 'Abr', occupation: Math.round(occupied * 0.95), capacity: effectiveCapacity },
      { month: 'May', occupation: occupied, capacity: effectiveCapacity },
    ],
    [effectiveCapacity, occupied]
  );

  const summaryCards = f ? [
    { label: 'Área total', value: f.area ? `${f.area} hectáreas` : 'Sin dato', icon: Maximize2 },
    { label: 'Ubicación', value: location, icon: MapPin },
    { label: 'Tipo de alimento', value: foodTypeLabel, icon: Leaf },
    { label: 'Fecha de registro', value: formatDate(f.created_at), icon: Calendar },
  ] : [];

  const metricCards = [
    { label: 'Actuales', value: occupied },
    { 
      label: 'Capacidad', 
      value: hasDefinedCapacity 
        ? capacity 
        : isEstimated 
          ? `${estimatedCapacity} (Est. por área)` 
          : 'Sin definir' 
    },
    { 
      label: 'Disponibles', 
      value: effectiveCapacity > 0 
        ? Math.max(available, 0) 
        : 'N/A' 
    },
    { 
      label: 'Ocupación', 
      value: effectiveCapacity > 0 
        ? `${occupationRate.toFixed(0)}%` 
        : occupied > 0 
          ? 'Sin capacidad' 
          : '0%' 
    },
  ];

  const statGroups = [
    { title: 'Distribución por especie', rows: animalStats.bySpecies },
    { title: 'Distribución por sexo', rows: animalStats.bySex },
    { title: 'Distribución por raza', rows: animalStats.byBreed },
  ];

  if (!isOpen) return null;

  if (fieldLoading && !f) return (
    <GenericModal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} title="Detalle del Potrero" size="6xl" fullWidth enableBackdropBlur themeColor="emerald" allowFullScreenToggle>
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Cargando potrero...</p>
        </div>
      </div>
    </GenericModal>
  );

  if (fieldError && !f) return (
    <GenericModal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} title="Detalle del Potrero" size="6xl" fullWidth enableBackdropBlur themeColor="emerald" allowFullScreenToggle>
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-destructive mb-2">Error al cargar el potrero</p>
          <p className="text-xs text-muted-foreground mb-4">No se pudo obtener la información del potrero.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    </GenericModal>
  );

  if (!f) return null;

  return (
    <>
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`Detalle del Potrero: ${f.name || f.id}`}
      description={`${location} · ${f.state || 'Sin estado'} · ${sortedFields.length > 0 ? `${currentIndex + 1} de ${sortedFields.length}` : ''}`}
      size="6xl"
      fullWidth
      enableBackdropBlur
      themeColor="emerald"
      allowFullScreenToggle
      enableNavigation
      hasPrevious={currentIndex > 0}
      hasNext={currentIndex < sortedFields.length - 1}
      onNavigatePrevious={() => navigateField('prev')}
      onNavigateNext={() => navigateField('next')}
      tabs={
        <div className="flex gap-1 overflow-x-auto px-3 sm:px-5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'relative flex h-14 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition-colors',
                activeTab === id
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}{id === 'animals' ? ` (${occupied})` : ''}</span>
              {activeTab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </div>
      }
      footer={
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button className="gap-2" onClick={() => {
            if (onEdit) onEdit(f);
            else navigate(`/admin/fields?edit=${f.id}`);
          }}>
            <Edit className="h-4 w-4" />
            Editar Potrero
          </Button>
        </div>
      }
    >
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estado actual</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">{f.name || `Potrero #${f.id}`}</h3>
            </div>
            <span className={cn('inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-bold', tone.badge)}>
              {f.state || tone.label}
            </span>
          </div>

          <section className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Ocupación del potrero</p>
              <span className={cn('text-sm font-bold', tone.text)}>{tone.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {metricCards.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-border/60 bg-background/70 p-3 text-center">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-black text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
            <div className={cn('mt-4 h-4 overflow-hidden rounded-full', tone.track)}>
              <div className={cn('flex h-full items-center justify-end rounded-full pr-2 transition-all', tone.bar)} style={{ width: `${progressRate}%` }}>
                {progressRate > 12 && <span className="text-[10px] font-black text-white">{occupationRate.toFixed(0)}%</span>}
              </div>
            </div>
            {occupationRate > 100 && (
              <div className="mt-4 flex gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Se recomienda redistribuir {Math.abs(available)} animales a otros potreros.</span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <Icon className="h-4 w-4 text-emerald-600" />
                  {label}
                </div>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <TrendingUp className="h-5 w-5" />
              Métricas de densidad
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-black text-foreground">
                  {effectiveCapacity > 0 && area > 0 ? (area / effectiveCapacity).toFixed(2) : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  ha / animal capacidad {isEstimated && <span className="text-[10px] text-amber-500 font-bold block">(Estimado)</span>}
                </p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{occupied > 0 && area > 0 ? (area / occupied).toFixed(2) : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">ha / animal actual</p>
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{area > 0 ? (occupied / area).toFixed(2) : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">animales / ha</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'animals' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Animales por potrero</h3>
              <p className="text-sm text-muted-foreground">{location} · {animals.length || occupied} animales registrados</p>
            </div>
          </div>

          {animalsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              Cargando animales...
            </div>
          ) : animals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
              No hay animales registrados en este potrero.
            </div>
          ) : (
            <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:auto-cols-auto md:grid-flow-row md:grid-cols-2 xl:grid-cols-3 md:overflow-visible">
              {animals.map((animal: any) => (
                <div key={animal.id} className="snap-center">
                  <AnimalCard
                    animal={animal}
                    breedLabel={getBreedLabel(animal)}
                    fatherLabel={getFatherLabel(animal)}
                    motherLabel={getMotherLabel(animal)}
                    onCardClick={() => handleOpenAnimalDetail(animal)}
                    actions={
                      <div className="flex w-full items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 flex-1 justify-center gap-2" onClick={(event) => {
                          event.stopPropagation();
                          handleOpenAnimalDetail(animal);
                        }}>
                          <Users className="h-3.5 w-3.5" />
                          {animalLabel(animal)}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" title="Quitar del potrero" onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveFromField(Number(animal.id)).catch((error) => {
                            console.error('Error removing animal from field:', error);
                            window.alert('Error al quitar el animal del potrero');
                          });
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Animales</p>
              <p className="mt-1 text-3xl font-black">{animals.length || occupied}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Densidad actual</p>
              <p className="mt-1 text-3xl font-black">{area > 0 ? (occupied / area).toFixed(2) : 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Edad promedio</p>
              <p className="mt-1 text-3xl font-black">{animalStats.avgAge > 0 ? `${animalStats.avgAge.toFixed(1)}a` : 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Uso capacidad</p>
              <p className={cn('mt-1 text-3xl font-black', tone.text)}>
                {effectiveCapacity > 0 ? `${occupationRate.toFixed(0)}%` : 'N/A'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-foreground">Histórico de ocupación</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="occupation" name="Ocupación" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capacity" name="Capacidad" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {statGroups.map((group) => (
              <div key={group.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
                {animalsLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : group.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
                ) : (
                  <div className="space-y-3">
                    {group.rows.map(([label, count]) => (
                      <div key={label}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="fit-clamp text-foreground">{label}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${animals.length ? (count / animals.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </GenericModal>

    {animalDetailStack.map((stacked, index) => {
      const selectedAnimal = stacked.data;
      return (
        <AnimalModal
          key={`stacked-${stacked.id}-${index}`}
          isOpen={true}
          onClose={() => setAnimalDetailStack((prev) => prev.slice(0, -1))}
          animal={selectedAnimal}
          breedLabel={getBreedLabel(selectedAnimal)}
          fatherLabel={getFatherLabel(selectedAnimal)}
          motherLabel={getMotherLabel(selectedAnimal)}
        >
          <AnimalModalContent 
            animal={selectedAnimal}
            breedLabel={getBreedLabel(selectedAnimal)}
            fatherLabel={getFatherLabel(selectedAnimal)}
            motherLabel={getMotherLabel(selectedAnimal)}
            onFatherClick={(id) => handleOpenAnimalDetail({ id })}
            onMotherClick={(id) => handleOpenAnimalDetail({ id })}
          />
        </AnimalModal>
      );
    })}
    </>
  );
};

export default FieldDetailsModal;
