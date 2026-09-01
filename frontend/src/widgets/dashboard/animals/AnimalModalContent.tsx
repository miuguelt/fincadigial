import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Activity,
  MapPin,
  Pill,
  TrendingUp,
  RefreshCw,
  Copy,
  FileText,
  Heart,
  Shield,
  Milk,
  DollarSign,
  Clock,
  Layers,
  Edit,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { apiClient } from '@/shared/api/client';
import { AnimalImageBanner } from './AnimalImageBanner';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { AnimalActionModalInstance } from '@/widgets/dashboard/AnimalActionModalInstance';
import { ItemDetailModal } from './ItemDetailModal';
import { TreatmentSuppliesModal } from '../treatments/TreatmentSuppliesModal';

// Entidades y servicios
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { controlService } from '@/entities/control/api/control.service';
import { animalImageService } from '@/entities/animal/api/animalImage.service';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { milkService } from '@/entities/milk/api/milk.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { fieldService } from '@/entities/field/api/field.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { usersService } from '@/entities/user/api/user.service';
import { clearAnimalDependencyCache, checkTreatmentDependencies } from '@/features/diagnostics/api/dependencyCheck.service';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';
import { analyzeGrowthTrends } from '@/shared/utils/animalMetrics';

// Pestañas especializadas
import {
  AnimalOverviewTab,
  AnimalGrowthTab,
  AnimalHealthTab,
  AnimalReproductionTab,
  AnimalMilkTab,
  AnimalPastureTab,
  AnimalFinancesTab,
  AnimalTimelineTab,
} from './tabs';

interface AnimalModalContentProps {
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  onFatherClick?: (fatherId: number) => void;
  onMotherClick?: (motherId: number) => void;
  currentUserId?: number;
  onOpenHistory?: () => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
  onEdit?: () => void;
  onReplicate?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function AnimalModalContent({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  onFatherClick,
  onMotherClick,
  currentUserId,
  onOpenHistory,
  onOpenAncestorsTree,
  onOpenDescendantsTree,
  onEdit,
  onReplicate,
  scrollContainerRef,
}: AnimalModalContentProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('resumen');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const savedScrollTopRef = React.useRef(0);
  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);

  const preserveScroll = useCallback(() => {
    const node = scrollContainerRef?.current;
    if (node) savedScrollTopRef.current = node.scrollTop;
  }, [scrollContainerRef]);

  const restoreScroll = useCallback(() => {
    const node = scrollContainerRef?.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollTop = savedScrollTopRef.current;
    });
  }, [scrollContainerRef]);

  // Estados para datos del animal
  const [geneticImprovements, setGeneticImprovements] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [controls, setControls] = useState<any[]>([]);
  const [animalImages, setAnimalImages] = useState<any[]>([]);
  const [reproductionHistory, setReproductionHistory] = useState<any | null>(null);
  const [milkRecords, setMilkRecords] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [_dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const [hasRecentTreatments, setHasRecentTreatments] = useState<boolean | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  // Opciones de catálogos
  const [diseaseOptions, setDiseaseOptions] = useState<Record<number, string>>({});
  const [fieldOptions, setFieldOptions] = useState<Record<number, string>>({});
  const [vaccineOptions, setVaccineOptions] = useState<Record<number, string>>({});
  const [userOptions, setUserOptions] = useState<Record<number, string>>({});

  // Insumos de tratamiento modal
  const [suppliesTreatment, setSuppliesTreatment] = useState<any | null>(null);

  // Acciones de modal anidado
  const [actionModalType, setActionModalType] = useState<
    'genetic_improvement' | 'animal_disease' | 'animal_field' | 'vaccination' | 'treatment' | 'control' | null
  >(null);
  const [actionModalMode, setActionModalMode] = useState<'create' | 'list' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }, []);

  const openCreateModal = (type: typeof actionModalType) => {
    setActionModalType(type);
    setActionModalMode('create');
    setSelectedItem(null);
  };

  const openViewModal = (type: typeof actionModalType, item: any) => {
    setActionModalType(type);
    setActionModalMode('view');
    setSelectedItem(item);
  };

  const openEditModal = (type: typeof actionModalType, item: any) => {
    setActionModalType(type);
    setActionModalMode('edit');
    setSelectedItem(item);
  };

  const closeActionModal = () => {
    setActionModalType(null);
    setSelectedItem(null);
  };

  // Carga de catálogos generales
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [diseasesRes, fieldsRes, vaccinesRes, usersRes] = await Promise.all([
          diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
          fieldService.getFields({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
          vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
          usersService.getUsers({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        ]);

        const dMap: Record<number, string> = {};
        ((diseasesRes as any)?.data || diseasesRes || []).forEach((d: any) => {
          dMap[d.id] = d.disease || d.name;
        });
        setDiseaseOptions(dMap);

        const fMap: Record<number, string> = {};
        ((fieldsRes as any)?.data || fieldsRes || []).forEach((f: any) => {
          fMap[f.id] = f.name;
        });
        setFieldOptions(fMap);

        const vMap: Record<number, string> = {};
        ((vaccinesRes as any)?.data || vaccinesRes || []).forEach((v: any) => {
          vMap[v.id] = v.name;
        });
        setVaccineOptions(vMap);

        const uMap: Record<number, string> = {};
        ((usersRes as any)?.data || usersRes || []).forEach((u: any) => {
          uMap[u.id] = u.fullname || u.name;
        });
        setUserOptions(uMap);
      } catch (err) {
        console.error('Error loading options in AnimalModalContent:', err);
      }
    };
    loadOptions();
  }, []);

  // Triggers de refresco
  const [triggers, setTriggers] = useState({
    genetic: 0,
    diseases: 0,
    fields: 0,
    vaccinations: 0,
    treatments: 0,
    controls: 0,
    images: 0,
    reproduction: 0,
    milk: 0,
    general: 0,
  });

  const handleRefresh = useCallback((type?: string) => {
    if (!type) {
      setTriggers((prev) => ({
        ...prev,
        genetic: prev.genetic + 1,
        diseases: prev.diseases + 1,
        fields: prev.fields + 1,
        vaccinations: prev.vaccinations + 1,
        treatments: prev.treatments + 1,
        controls: prev.controls + 1,
        images: prev.images + 1,
        reproduction: prev.reproduction + 1,
        milk: prev.milk + 1,
        general: prev.general + 1,
      }));
      return;
    }

    const mapping: Record<string, keyof typeof triggers> = {
      genetic_improvement: 'genetic',
      animal_disease: 'diseases',
      animal_field: 'fields',
      vaccination: 'vaccinations',
      treatment: 'treatments',
      control: 'controls',
    };

    const key = mapping[type];
    if (key) {
      setTriggers((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    } else {
      setTriggers((prev) => ({ ...prev, general: prev.general + 1 }));
    }
  }, []);

  // Carga de Mejoras Genéticas
  useEffect(() => {
    const fetchGenetic = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.genetic > 0 ? Date.now() : undefined };
        const res = await geneticImprovementsService.getGeneticImprovements(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData)
          ? allData.filter((item: any) => String(item.animal_id) === String(animal.id))
          : [];
        setGeneticImprovements(filtered);
      } catch (e) {
        console.error('Error fetching genetic stats', e);
      }
    };
    fetchGenetic();
  }, [animal.id, triggers.genetic]);

  // Carga de Enfermedades
  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.diseases > 0 ? Date.now() : undefined };
        const res = await animalDiseasesService.getAnimalDiseases(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData)
          ? allData.filter((item: any) => String(item.animal_id) === String(animal.id))
          : [];
        setDiseases(filtered);
      } catch (e) {
        console.error('Error fetching diseases', e);
      }
    };
    fetchDiseases();
  }, [animal.id, triggers.diseases]);

  // Carga de Potreros
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.fields > 0 ? Date.now() : undefined };
        const res = await animalFieldsService.getAnimalFields(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData)
          ? allData.filter((item: any) => String(item.animal_id) === String(animal.id))
          : [];
        setFields(filtered);
      } catch (e) {
        console.error('Error fetching fields', e);
      }
    };
    fetchFields();
  }, [animal.id, triggers.fields]);

  // Carga de Vacunaciones
  useEffect(() => {
    const fetchVaccinations = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.vaccinations > 0 ? Date.now() : undefined };
        const res = await vaccinationsService.getVaccinations(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData)
          ? allData.filter((item: any) => String(item.animal_id) === String(animal.id))
          : [];
        setVaccinations(filtered);
      } catch (e) {
        console.error('Error fetching vaccinations', e);
      }
    };
    fetchVaccinations();
  }, [animal.id, triggers.vaccinations]);

  // Carga de Tratamientos
  useEffect(() => {
    const fetchTreatments = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.treatments > 0 ? Date.now() : undefined };
        const res = await treatmentsService.getTreatments(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData)
          ? allData.filter((item: any) => String(item.animal_id) === String(animal.id))
          : [];
        setTreatments(filtered);
      } catch (e) {
        console.error('Error fetching treatments', e);
      }
    };
    fetchTreatments();
  }, [animal.id, triggers.treatments]);

  // Carga de Controles
  useEffect(() => {
    const fetchControls = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.controls > 0 ? Date.now() : undefined };
        const res = await controlService.getControls(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData)
          ? allData.filter((item: any) => String(item.animal_id) === String(animal.id))
          : [];
        setControls(filtered);
      } catch (e) {
        console.error('Error fetching controls', e);
      }
    };
    fetchControls();
  }, [animal.id, triggers.controls]);

  // Carga de Imágenes
  useEffect(() => {
    const fetchImages = async () => {
      setImagesLoading(true);
      try {
        const res = await animalImageService.getAnimalImages(animal.id);
        const allImages = res?.data?.images || [];
        setAnimalImages(allImages);
      } catch (e) {
        console.error('Error fetching images', e);
      } finally {
        setImagesLoading(false);
      }
    };
    fetchImages();
  }, [animal.id, triggers.images]);

  // Carga de Historial Reproductivo
  useEffect(() => {
    const fetchReproduction = async () => {
      try {
        const data = await reproductionService.getAnimalHistory(animal.id);
        if (data) setReproductionHistory(data);
      } catch {
        // Fallback silencioso si no hay eventos reproductivos
      }
    };
    fetchReproduction();
  }, [animal.id, triggers.reproduction]);

  // Carga de Producción Lechera
  useEffect(() => {
    const fetchMilk = async () => {
      try {
        const res = await milkService.getByAnimal(animal.id);
        const data = (res as any)?.data || res || [];
        setMilkRecords(Array.isArray(data) ? data : []);
      } catch {
        // Fallback silencioso
      }
    };
    fetchMilk();
  }, [animal.id, triggers.milk]);

  // Cálculo de recientes y fin de carga inicial
  useEffect(() => {
    const now = new Date().getTime();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const hasRecentTreatment = treatments.some((t: any) => {
      const d = new Date(t.treatment_date || t.date || t.created_at);
      return !isNaN(d.getTime()) && now - d.getTime() <= THIRTY_DAYS_MS;
    });

    const hasRecentVaccination = vaccinations.some((v: any) => {
      const d = new Date(v.vaccination_date || v.date || v.created_at);
      return !isNaN(d.getTime()) && now - d.getTime() <= THIRTY_DAYS_MS;
    });

    setHasRecentTreatments(hasRecentTreatment || hasRecentVaccination);
    setLoading(false);
    setIsManualRefreshing(false);
  }, [treatments, vaccinations]);

  const handleDownloadReport = async () => {
    if (!animal.id || isDownloadingReport) return;

    setIsDownloadingReport(true);
    try {
      const response = await apiClient.get(`/exports/animal/${animal.id}/health-report.pdf`, {
        responseType: 'blob',
      } as any);
      const blob = (response as any).data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const record = animal.record || `animal_${animal.id}`;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `ficha_${record}_${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Reporte del animal generado correctamente', 'success');
    } catch (err) {
      console.error('Error descargando reporte del animal:', err);
      showToast('No se pudo descargar el reporte del animal', 'error');
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Eliminación de registros con confirmación
  const handleDeleteRecord = async (
    type: 'vaccination' | 'treatment' | 'animal_disease' | 'animal_field' | 'control' | 'genetic_improvement',
    item: any
  ) => {
    const recordId = resolveRecordId(item);
    if (!recordId) {
      showToast('No se pudo determinar el ID del registro', 'error');
      return;
    }

    if (confirmingDeleteId === recordId) {
      setConfirmingDeleteId(null);
      setDeletingItemId(recordId);

      try {
        if (type === 'vaccination') {
          setVaccinations((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(recordId)));
          await vaccinationsService.deleteVaccination(recordId as any);
          await vaccinationsService.clearCache();
        } else if (type === 'treatment') {
          const depCheck = await checkTreatmentDependencies(recordId as number);
          if (depCheck.hasDependencies) {
            const depSummary = depCheck.dependencies?.map((d) => `${d.count} ${d.entity}`).join(', ') || 'registros asociados';
            showToast(`⚠️ No se puede eliminar este tratamiento porque tiene ${depSummary}. Elimina primero las dependencias.`, 'error');
            setDeletingItemId(null);
            return;
          }
          setTreatments((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(recordId)));
          await treatmentsService.deleteTreatment(recordId as any);
          await treatmentsService.clearCache();
        } else if (type === 'animal_disease') {
          setDiseases((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(recordId)));
          await animalDiseasesService.deleteAnimalDisease(recordId as any);
          await animalDiseasesService.clearCache();
        } else if (type === 'animal_field') {
          setFields((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(recordId)));
          await animalFieldsService.deleteAnimalField(recordId as any);
          await animalFieldsService.clearCache();
        } else if (type === 'control') {
          setControls((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(recordId)));
          await controlService.deleteControl(recordId as any);
          await controlService.clearCache();
        } else if (type === 'genetic_improvement') {
          setGeneticImprovements((prev) => prev.filter((i) => String(resolveRecordId(i)) !== String(recordId)));
          await geneticImprovementsService.deleteGeneticImprovement(recordId as any);
          await geneticImprovementsService.clearCache();
        }

        if (animal?.id) clearAnimalDependencyCache(animal.id);
        showToast('Registro eliminado correctamente', 'success');
      } catch (error: any) {
        showToast(`Error al eliminar: ${error.message || 'Error desconocido'}`, 'error');
        handleRefresh(type);
      } finally {
        setDeletingItemId(null);
      }
    } else {
      setConfirmingDeleteId(recordId);
      showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
      setTimeout(() => setConfirmingDeleteId((prev) => (prev === recordId ? null : prev)), 3000);
    }
  };

  const gender = animal.sex || animal.gender;
  const status = animal.status || 'Vivo';
  const hasAnimalImages = !imagesLoading && animalImages.length > 0;
  const isFemale = gender === 'Hembra';

  // Badges y estilo visual
  const healthLabel = useMemo(() => {
    const active = diseases.filter((d: any) => d.status === 'Activo').length;
    if (active > 0 || String(status).toLowerCase() === 'enfermo') return 'Atención';
    return 'Estable';
  }, [diseases, status]);

  const healthTone =
    healthLabel === 'Atención'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 animate-pulse'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300';

  const sexTone =
    gender === 'Macho'
      ? 'border-blue-200/60 bg-blue-50/80 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
      : gender === 'Hembra'
      ? 'border-pink-200/60 bg-pink-50/80 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300'
      : 'border-slate-200/60 bg-slate-50/80 text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300';

  const asideGradient =
    healthLabel === 'Atención'
      ? 'bg-gradient-to-b from-amber-50/60 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card'
      : 'bg-gradient-to-b from-emerald-50/50 via-card to-card dark:from-emerald-950/15 dark:via-card dark:to-card';

  const healthAlerts = useMemo(
    () =>
      controls.length >= 2
        ? analyzeGrowthTrends(
            controls.map((c) => ({
              date: c.checkup_date,
              weight: c.weight,
              height: c.height,
            }))
          )
        : [],
    [controls]
  );

  const activeFieldAssignment = useMemo(() => fields.find((f: any) => !f.removal_date), [fields]);

  const currentPotreroName = useMemo(() => {
    if (activeFieldAssignment) {
      return (
        fieldOptions[activeFieldAssignment.field_id] ||
        activeFieldAssignment.field?.name ||
        activeFieldAssignment.field_name ||
        `Potrero #${activeFieldAssignment.field_id}`
      );
    }
    return animal.current_field_name || animal.current_pasture || 'Sin potrero asignado';
  }, [activeFieldAssignment, fieldOptions, animal.current_field_name, animal.current_pasture]);

  const bentoDaysInField = useMemo(() => {
    if (fields.length === 0) return null;
    const sorted = [...fields].sort(
      (a, b) =>
        new Date(b.assignment_date || b.created_at).getTime() -
        new Date(a.assignment_date || a.created_at).getTime()
    );
    const latest = sorted[0];
    if (!latest?.assignment_date) return null;
    const diff = Math.floor(
      (Date.now() - new Date(latest.assignment_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? diff : 0;
  }, [fields]);

  const bentoGdpStats = useMemo(() => {
    if (controls.length < 2) return null;
    const sorted = [...controls]
      .filter((c) => c.weight && c.checkup_date)
      .sort((a, b) => new Date(a.checkup_date).getTime() - new Date(b.checkup_date).getTime());
    if (sorted.length < 2) return null;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const daysDiff = Math.round(
      (new Date(last.checkup_date).getTime() - new Date(first.checkup_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 0) return null;
    const weightDiff = (Number(last.weight) - Number(first.weight)).toFixed(1);
    const gdp = (Number(weightDiff) / daysDiff).toFixed(2);
    return { gdp, weightDiff, daysDiff };
  }, [controls]);

  const activeDiseasesCount = useMemo(() => diseases.filter((d: any) => d.status === 'Activo').length, [diseases]);
  const curedDiseasesCount = useMemo(
    () => diseases.filter((d: any) => d.status === 'Curado' || d.status === 'Inactivo').length,
    [diseases]
  );

  return (
    <>
      <div
        ref={scrollContainerRef}
        data-testid="animal-detail"
        role="region"
        aria-label={`Detalle del animal ${animal.record || animal.id}`}
        className="space-y-4 pb-6 h-full overflow-y-auto pr-1 sm:pr-2"
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Cabecera Hero de la Ficha Ganadera */}
        <section
          className={cn(
            'grid grid-cols-1 gap-4 -mt-2 sm:-mt-4',
            hasAnimalImages && 'xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]'
          )}
        >
          {hasAnimalImages && (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-border/40 shadow-md h-full">
              <div className="relative h-full min-h-[260px]">
                <AnimalImageBanner
                  animalId={animal.id}
                  height="100%"
                  showControls={true}
                  autoPlayInterval={5000}
                  hideWhenEmpty={true}
                  objectFit="cover"
                  refreshTrigger={refreshTrigger}
                  initialImages={animalImages}
                />
              </div>
            </div>
          )}

          <aside
            className={cn(
              'min-w-0 rounded-2xl border border-border/70 dark:border-white/10 shadow-sm overflow-hidden bg-card transition-all',
              asideGradient
            )}
          >
            <div className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider rounded-md bg-primary/10 text-primary border border-primary/20">
                      Ficha Ganadera
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      ID #{animal.id}
                    </span>
                  </div>
                  <h2
                    className="mt-1 text-2xl sm:text-3xl font-black text-foreground tracking-tight fit-clamp"
                    data-testid="animal-modal-title"
                  >
                    {animal.record || `Animal #${animal.id}`}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground/80">{breedLabel}</span>
                    {animal.category && <span>· {animal.category}</span>}
                    {animal.lot_name && <span>· Lote: {animal.lot_name}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                  {onReplicate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 px-2.5 rounded-lg text-xs gap-1.5 hover:bg-muted font-medium shadow-sm"
                      onClick={onReplicate}
                      title="Replicar Animal"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Replicar</span>
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 px-2.5 rounded-lg text-xs gap-1.5 hover:bg-muted font-medium shadow-sm"
                      onClick={onEdit}
                      title="Editar Animal"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Editar</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 px-2.5 rounded-lg text-xs gap-1.5 hover:bg-muted font-medium shadow-sm"
                    onClick={handleDownloadReport}
                    disabled={isDownloadingReport}
                    title="Descargar Ficha PDF"
                  >
                    {isDownloadingReport ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <FileText className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">PDF</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 w-8.5 p-0 rounded-lg hover:bg-muted shadow-sm"
                    onClick={() => {
                      setIsManualRefreshing(true);
                      setDataRefreshTrigger((prev) => prev + 1);
                      handleRefresh();
                    }}
                    title="Refrescar datos"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', (loading || isManualRefreshing) && 'animate-spin')} />
                  </Button>
                  <AnimalActionsMenu
                    animal={animal as AnimalResponse}
                    currentUserId={currentUserId}
                    onOpenHistory={onOpenHistory}
                    onOpenAncestorsTree={onOpenAncestorsTree}
                    onOpenDescendantsTree={onOpenDescendantsTree}
                    onRefresh={handleRefresh}
                  />
                </div>
              </div>

              {/* Badges de Estado */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('h-6.5 px-2 text-xs font-semibold rounded-lg shadow-sm gap-1.5', healthTone)}>
                  <Activity className="h-3 w-3" />
                  {healthLabel}
                </Badge>
                <Badge variant="outline" className={cn('h-6.5 px-2 text-xs font-semibold rounded-lg shadow-sm gap-1.5', sexTone)}>
                  {gender || 'Sin sexo'}
                </Badge>
                <Badge variant="outline" className="h-6.5 px-2 text-xs font-semibold rounded-lg shadow-sm border-border/60 bg-background/50 text-foreground/80">
                  {status}
                </Badge>
                {hasRecentTreatments && (
                  <Badge variant="outline" className="h-6.5 px-2 text-xs font-semibold rounded-lg shadow-sm border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1.5">
                    <Pill className="h-3 w-3" />
                    Tratamiento Reciente
                  </Badge>
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* ─── PESTAÑAS DE ANALÍTICAS, KPIS Y RESULTADOS ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-3">
          {/* Barra de Pestañas con Scroll Horizontal */}
          <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-muted/60 p-1 text-muted-foreground border border-border/50 min-w-full sm:min-w-0">
              <TabsTrigger
                value="resumen"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                <span>Resumen & KPIs</span>
              </TabsTrigger>

              <TabsTrigger
                value="crecimiento"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                <span>Crecimiento & ADG</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold">
                  {controls.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="sanidad"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Shield className="h-3.5 w-3.5 text-rose-500" />
                <span>Sanidad & ICA</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold">
                  {vaccinations.length + treatments.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="reproduccion"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Heart className="h-3.5 w-3.5 text-pink-500" />
                <span>Reproducción & Genética</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-pink-500/10 text-pink-600 dark:text-pink-400 font-extrabold">
                  {geneticImprovements.length}
                </span>
              </TabsTrigger>

              {(isFemale || milkRecords.length > 0) && (
                <TabsTrigger
                  value="leche"
                  className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <Milk className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Producción Lechera</span>
                  {milkRecords.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold">
                      {milkRecords.length}
                    </span>
                  )}
                </TabsTrigger>
              )}

              <TabsTrigger
                value="potreros"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <span>Potreros & Pasturas</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold">
                  {fields.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="finanzas"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span>Finanzas & ROI</span>
              </TabsTrigger>

              <TabsTrigger
                value="bitacora"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Clock className="h-3.5 w-3.5 text-purple-500" />
                <span>Bitácora & Fotos</span>
                {animalImages.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold">
                    {animalImages.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Pestaña Resumen */}
          <TabsContent value="resumen" className="mt-0 focus-visible:outline-none">
            <AnimalOverviewTab
              animal={animal}
              breedLabel={breedLabel}
              fatherLabel={fatherLabel}
              motherLabel={motherLabel}
              currentPotreroName={currentPotreroName}
              bentoDaysInField={bentoDaysInField}
              controls={controls}
              vaccinations={vaccinations}
              treatments={treatments}
              diseases={diseases}
              fields={fields}
              healthAlerts={healthAlerts}
              bentoGdpStats={bentoGdpStats}
              activeDiseasesCount={activeDiseasesCount}
              curedDiseasesCount={curedDiseasesCount}
              onFatherClick={onFatherClick}
              onMotherClick={onMotherClick}
              formatDate={formatDate}
            />
          </TabsContent>

          {/* 2. Pestaña Crecimiento */}
          <TabsContent value="crecimiento" className="mt-0 focus-visible:outline-none">
            <AnimalGrowthTab
              animal={animal}
              controls={controls}
              formatDate={formatDate}
              onAddControl={() => openCreateModal('control')}
              onViewControl={(item) => openViewModal('control', item)}
              onEditControl={(item) => openEditModal('control', item)}
              onDeleteControl={(item) => handleDeleteRecord('control', item)}
              confirmingDeleteId={confirmingDeleteId}
              deletingItemId={deletingItemId}
            />
          </TabsContent>

          {/* 3. Pestaña Sanidad */}
          <TabsContent value="sanidad" className="mt-0 focus-visible:outline-none">
            <AnimalHealthTab
              animal={animal}
              vaccinations={vaccinations}
              treatments={treatments}
              diseases={diseases}
              vaccineOptions={vaccineOptions}
              diseaseOptions={diseaseOptions}
              formatDate={formatDate}
              onAddRecord={(type) => openCreateModal(type)}
              onViewRecord={(type, item) => openViewModal(type, item)}
              onEditRecord={(type, item) => openEditModal(type, item)}
              onDeleteRecord={(type, item) => handleDeleteRecord(type, item)}
              onOpenSuppliesModal={(treatment) => setSuppliesTreatment(treatment)}
              confirmingDeleteId={confirmingDeleteId}
              deletingItemId={deletingItemId}
            />
          </TabsContent>

          {/* 4. Pestaña Reproducción */}
          <TabsContent value="reproduccion" className="mt-0 focus-visible:outline-none">
            <AnimalReproductionTab
              animal={animal}
              fatherLabel={fatherLabel}
              motherLabel={motherLabel}
              geneticImprovements={geneticImprovements}
              reproductionHistory={reproductionHistory}
              formatDate={formatDate}
              onFatherClick={onFatherClick}
              onMotherClick={onMotherClick}
              onOpenAncestorsTree={onOpenAncestorsTree}
              onOpenDescendantsTree={onOpenDescendantsTree}
              onAddGeneticImprovement={() => openCreateModal('genetic_improvement')}
              onViewGeneticImprovement={(item) => openViewModal('genetic_improvement', item)}
              onEditGeneticImprovement={(item) => openEditModal('genetic_improvement', item)}
              onDeleteGeneticImprovement={(item) => handleDeleteRecord('genetic_improvement', item)}
              confirmingDeleteId={confirmingDeleteId}
              deletingItemId={deletingItemId}
            />
          </TabsContent>

          {/* 5. Pestaña Leche */}
          {(isFemale || milkRecords.length > 0) && (
            <TabsContent value="leche" className="mt-0 focus-visible:outline-none">
              <AnimalMilkTab
                animal={animal}
                milkRecords={milkRecords}
                formatDate={formatDate}
              />
            </TabsContent>
          )}

          {/* 6. Pestaña Potreros */}
          <TabsContent value="potreros" className="mt-0 focus-visible:outline-none">
            <AnimalPastureTab
              animal={animal}
              fields={fields}
              fieldOptions={fieldOptions}
              formatDate={formatDate}
              onAddRecord={(type) => openCreateModal(type)}
              onViewRecord={(type, item) => openViewModal(type, item)}
              onEditRecord={(type, item) => openEditModal(type, item)}
              onDeleteRecord={(type, item) => handleDeleteRecord(type, item)}
              confirmingDeleteId={confirmingDeleteId}
              deletingItemId={deletingItemId}
            />
          </TabsContent>

          {/* 7. Pestaña Finanzas */}
          <TabsContent value="finanzas" className="mt-0 focus-visible:outline-none">
            <AnimalFinancesTab
              animal={animal}
              treatments={treatments}
              vaccinations={vaccinations}
              milkRecords={milkRecords}
              formatDate={formatDate}
            />
          </TabsContent>

          {/* 8. Pestaña Bitácora & Fotos */}
          <TabsContent value="bitacora" className="mt-0 focus-visible:outline-none">
            <AnimalTimelineTab
              animal={animal}
              controls={controls}
              vaccinations={vaccinations}
              treatments={treatments}
              diseases={diseases}
              fields={fields}
              geneticImprovements={geneticImprovements}
              animalImages={animalImages}
              refreshTrigger={refreshTrigger}
              vaccineOptions={vaccineOptions}
              diseaseOptions={diseaseOptions}
              fieldOptions={fieldOptions}
              formatDate={formatDate}
              onGalleryUpdate={() => {
                preserveScroll();
                setDataRefreshTrigger((prev) => prev + 1);
                setRefreshTrigger((prev) => prev + 1);
                setTimeout(restoreScroll, 0);
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Modal de Detalle para VER registro */}
        {actionModalType && selectedItem && actionModalMode === 'view' && (
          <ItemDetailModal
            type={actionModalType}
            item={selectedItem}
            options={{
              diseases: diseaseOptions,
              fields: fieldOptions,
              vaccines: vaccineOptions,
              users: userOptions,
            }}
            onClose={closeActionModal}
            onEdit={() => setActionModalMode('edit')}
            onDelete={() => handleDeleteRecord(actionModalType, selectedItem)}
            zIndex={2000}
          />
        )}

        {/* Modal de Acción (Crear / Editar / Listar) */}
        {actionModalType && (actionModalMode === 'create' || actionModalMode === 'list' || actionModalMode === 'edit') && (
          <AnimalActionModalInstance
            animal={animal as AnimalResponse}
            type={actionModalType}
            mode={actionModalMode === 'edit' ? 'create' : actionModalMode}
            currentUserId={currentUserId}
            editingItem={selectedItem}
            zIndex={2000}
            onRefreshParent={handleRefresh}
            onClose={closeActionModal}
          />
        )}
      </div>

      {/* Modal de Insumos de Tratamiento */}
      <TreatmentSuppliesModal
        isOpen={!!suppliesTreatment}
        onClose={() => setSuppliesTreatment(null)}
        treatment={suppliesTreatment}
        zIndex={2100}
      />
    </>
  );
}
