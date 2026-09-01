import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Edit, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { AnimalModalContent } from './AnimalModalContent';
import { AnimalHistoryModal } from '@/widgets/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/widgets/dashboard/GeneticTreeModal';
import DescendantsTreeModal from '@/widgets/dashboard/DescendantsTreeModal';
import { animalsService } from '@/entities/animal/api/animal.service';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  useAnimalTreeApi,
  graphToAncestorLevels,
  graphToDescendantLevels,
} from '@/entities/animal/model/useAnimalTreeApi';

export interface AnimalDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  animal?: any;
  animalId?: number | string;
  animals?: any[];
  breedOptions?: Array<{ value: unknown; label: string }>;
  fatherOptions?: Array<{ value: unknown; label: string }>;
  motherOptions?: Array<{ value: unknown; label: string }>;
  currentUserId?: number;
  navigate?: NavigateFunction;
  onOpenHistory?: (animal: any) => void;
  onOpenAncestors?: (animal: any) => void;
  onOpenDescendants?: (animal: any) => void;
  onOpenAnimal?: (animalId: number) => void;
  onEdit?: () => void;
  onReplicate?: () => void;
  children?: React.ReactNode;
}

const findOptionLabel = (id: unknown, options: Array<{ value: unknown; label: string }>, fallback: string) => {
  if (!id) return '-';
  return options.find((option) => Number(option.value) === Number(id))?.label || fallback;
};

function AnimalDetailFooter({
  animal,
  animals,
  navigate,
  onClose,
  onOpenAnimal,
  onEdit,
  canGoBack,
  onGoBack,
  previousAnimal,
}: {
  animal: any;
  animals?: any[];
  navigate: NavigateFunction;
  onClose: () => void;
  onOpenAnimal: (id: number) => void;
  onEdit?: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  previousAnimal?: any;
}) {
  const index = Array.isArray(animals)
    ? animals.findIndex((item) => Number(item.id) === Number(animal.id))
    : -1;
  const hasPrevious = index > 0;
  const hasNext = Array.isArray(animals) && index >= 0 && index < animals.length - 1;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
      return;
    }
    const search = new URLSearchParams(window.location.search);
    search.set('edit', String(animal.id));
    navigate(`?${search.toString()}`);
    onClose();
  };

  return (
    <div className="border-t border-border/60 bg-muted/20 dark:bg-card/90 backdrop-blur-md px-4 sm:px-6 py-3 rounded-b-2xl">
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
        {canGoBack && (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGoBack?.();
            }}
            className="h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold transition-all duration-150 shadow-sm text-xs"
            title={`Volver a ${previousAnimal?.record || `#${previousAnimal?.id}`}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            <span>Volver a {previousAnimal?.record || `#${previousAnimal?.id}`}</span>
          </Button>
        )}
        {Array.isArray(animals) && animals.length > 1 && (
          <div className="flex gap-2 sm:flex-initial">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={!hasPrevious}
              onClick={(e) => {
                e.stopPropagation();
                if (hasPrevious) onOpenAnimal(Number(animals[index - 1].id));
              }}
              className="h-9 px-3 rounded-lg text-xs font-semibold transition-all duration-150 hover:bg-muted/60 shadow-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={!hasNext}
              onClick={(e) => {
                e.stopPropagation();
                if (hasNext) onOpenAnimal(Number(animals[index + 1].id));
              }}
              className="h-9 px-3 rounded-lg text-xs font-semibold transition-all duration-150 hover:bg-muted/60 shadow-sm disabled:opacity-40"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
        <div className="flex gap-2 sm:justify-end sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-9 px-4 rounded-lg text-xs font-medium hover:bg-muted/80"
          >
            Cerrar
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={handleEdit}
            className="h-9 px-4 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-150"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            <span>Editar Animal</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AnimalDetailModal({
  isOpen,
  onOpenChange,
  onClose,
  animal: initialAnimal,
  animalId,
  animals,
  breedOptions: initialBreedOptions,
  fatherOptions: initialFatherOptions,
  motherOptions: initialMotherOptions,
  currentUserId: propUserId,
  navigate: propNavigate,
  onOpenHistory: customOpenHistory,
  onOpenAncestors: customOpenAncestors,
  onOpenDescendants: customOpenDescendants,
  onOpenAnimal: customOpenAnimal,
  onEdit,
  onReplicate,
}: AnimalDetailModalProps) {
  const defaultNavigate = useNavigate();
  const navigate = propNavigate || defaultNavigate;
  const { user } = useAuth();
  const currentUserId = propUserId ?? user?.id;

  const [loadedAnimal, setLoadedAnimal] = useState<any>(initialAnimal || null);
  const [isLoadingAnimal, setIsLoadingAnimal] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);
  const [internalBreedOptions, setInternalBreedOptions] = useState<Array<{ value: unknown; label: string }>>([]);
  const [internalFatherOptions, setInternalFatherOptions] = useState<Array<{ value: unknown; label: string }>>([]);
  const [internalMotherOptions, setInternalMotherOptions] = useState<Array<{ value: unknown; label: string }>>([]);

  // Estados para modales integrados de árbol e historial
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyAnimal, setHistoryAnimal] = useState<any | null>(null);

  const ancestorsApi = useAnimalTreeApi();
  const descendantsApi = useAnimalTreeApi();

  const [isAncestorsOpen, setIsAncestorsOpen] = useState(false);
  const [ancestorsAnimal, setAncestorsAnimal] = useState<any | null>(null);
  const [ancestorsLevels, setAncestorsLevels] = useState<any[][]>([]);
  const [ancestorCounts, setAncestorCounts] = useState<any>();
  const [ancestorSummary, setAncestorSummary] = useState<any>();
  const [ancestorEdgeExamples, setAncestorEdgeExamples] = useState<any>();
  const [ancestorsRootId, setAncestorsRootId] = useState<number | null>(null);

  const [isDescendantsOpen, setIsDescendantsOpen] = useState(false);
  const [descendantsAnimal, setDescendantsAnimal] = useState<any | null>(null);
  const [descendantsLevels, setDescendantsLevels] = useState<any[][]>([]);
  const [descendantsCounts, setDescendantsCounts] = useState<any>();
  const [descendantsSummary, setDescendantsSummary] = useState<any>();
  const [descendantsEdgeExamples, setDescendantsEdgeExamples] = useState<any>();
  const [descendantsRootId, setDescendantsRootId] = useState<number | null>(null);

  const targetId = animalId ?? initialAnimal?.id ?? initialAnimal?.idAnimal ?? initialAnimal?.animal_id;

  // Sincronizar animal inicial
  useEffect(() => {
    if (initialAnimal) {
      setLoadedAnimal(initialAnimal);
    }
  }, [initialAnimal]);

  // Cargar animal completo por ID si es necesario
  useEffect(() => {
    if (!isOpen || !targetId) return;

    const currentLoadedId = loadedAnimal?.id ?? loadedAnimal?.idAnimal ?? loadedAnimal?.animal_id;
    const isLoadedComplete = Boolean(loadedAnimal && (loadedAnimal.birth_date || loadedAnimal.sex || loadedAnimal.weight !== undefined));

    if (!loadedAnimal || String(currentLoadedId) !== String(targetId) || !isLoadedComplete) {
      setIsLoadingAnimal(true);
      void animalsService.getById(Number(targetId)).then((res) => {
        if (res) setLoadedAnimal(res);
      }).catch((err) => {
        console.error('[AnimalDetailModal] Error loading animal by ID:', err);
      }).finally(() => {
        setIsLoadingAnimal(false);
      });
    }
  }, [isOpen, targetId, loadedAnimal]);

  // Cargar opciones de razas y padres si no fueron provistas
  useEffect(() => {
    if (!isOpen) return;

    if (!initialBreedOptions && internalBreedOptions.length === 0) {
      void breedsService.getBreeds({ page: 1, limit: 1000 }).then((res: any) => {
        const list = res?.data || res || [];
        setInternalBreedOptions(list.map((b: any) => ({ value: b.id, label: b.name || `Raza #${b.id}` })));
      }).catch(() => {});
    }

    if (!initialFatherOptions && internalFatherOptions.length === 0) {
      void animalsService.getAnimalsPaginated({ sex: 'Macho', limit: 1000, fields: 'id,record' }).then((res: any) => {
        const list = res?.data || res || [];
        setInternalFatherOptions(list.map((a: any) => ({ value: a.id, label: a.record || `Macho #${a.id}` })));
      }).catch(() => {});
    }

    if (!initialMotherOptions && internalMotherOptions.length === 0) {
      void animalsService.getAnimalsPaginated({ sex: 'Hembra', limit: 1000, fields: 'id,record' }).then((res: any) => {
        const list = res?.data || res || [];
        setInternalMotherOptions(list.map((a: any) => ({ value: a.id, label: a.record || `Hembra #${a.id}` })));
      }).catch(() => {});
    }
  }, [isOpen, initialBreedOptions, initialFatherOptions, initialMotherOptions, internalBreedOptions.length, internalFatherOptions.length, internalMotherOptions.length]);

  const handleOpenAnimal = useCallback(async (id: number) => {
    if (customOpenAnimal) {
      customOpenAnimal(id);
      return;
    }
    try {
      if (loadedAnimal) {
        setNavigationHistory((prev) => [...prev, loadedAnimal]);
      }
      setIsLoadingAnimal(true);
      const nextAnimal = await animalsService.getById(id);
      setLoadedAnimal(nextAnimal);
    } catch (err) {
      console.error('[AnimalDetailModal] Error switching animal:', err);
    } finally {
      setIsLoadingAnimal(false);
    }
  }, [customOpenAnimal, loadedAnimal]);

  const handleGoBack = useCallback(() => {
    if (navigationHistory.length === 0) return;
    const previous = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory((prev) => prev.slice(0, -1));
    setLoadedAnimal(previous);
  }, [navigationHistory]);

  const handleOpenHistory = useCallback((record: any) => {
    if (customOpenHistory) {
      customOpenHistory(record);
      return;
    }
    setHistoryAnimal({
      idAnimal: Number(record?.id ?? 0),
      record: record?.record || '',
      breed: record?.breed,
      birth_date: record?.birth_date,
      sex: record?.sex || record?.gender,
      status: record?.status,
    });
    setIsHistoryOpen(true);
  }, [customOpenHistory]);

  const handleOpenAncestors = useCallback(async (record: any) => {
    if (customOpenAncestors) {
      customOpenAncestors(record);
      return;
    }
    const idNum = Number(record?.id ?? 0);
    if (!idNum) return;
    const resp = await ancestorsApi.fetchAncestors(idNum, 3, 'id,record,sex,breeds_id,idFather,idMother');
    if (!resp) {
      setAncestorsAnimal(record);
      setAncestorsLevels([]);
      setAncestorsRootId(idNum);
      setIsAncestorsOpen(true);
      return;
    }
    setAncestorsRootId(resp.rootId);
    setAncestorsAnimal(resp.nodes[resp.rootId]);
    setAncestorsLevels(graphToAncestorLevels(resp));
    setAncestorCounts(resp.counts);
    setAncestorSummary(resp.summary);
    setAncestorEdgeExamples(resp.edge_examples);
    setIsAncestorsOpen(true);
  }, [customOpenAncestors, ancestorsApi]);

  const handleOpenDescendants = useCallback(async (record: any) => {
    if (customOpenDescendants) {
      customOpenDescendants(record);
      return;
    }
    const idNum = Number(record?.id ?? 0);
    if (!idNum) return;
    const resp = await descendantsApi.fetchDescendants(idNum, 3, 'id,record,sex,breeds_id,idFather,idMother');
    if (!resp) {
      setDescendantsAnimal(record);
      setDescendantsLevels([]);
      setDescendantsRootId(idNum);
      setIsDescendantsOpen(true);
      return;
    }
    setDescendantsRootId(resp.rootId);
    setDescendantsAnimal(resp.nodes[resp.rootId]);
    setDescendantsLevels(graphToDescendantLevels(resp));
    setDescendantsCounts(resp.counts);
    setDescendantsSummary(resp.summary);
    setDescendantsEdgeExamples(resp.edge_examples);
    setIsDescendantsOpen(true);
  }, [customOpenDescendants, descendantsApi]);

  const effectiveBreedOptions = initialBreedOptions || internalBreedOptions;
  const effectiveFatherOptions = initialFatherOptions || internalFatherOptions;
  const effectiveMotherOptions = initialMotherOptions || internalMotherOptions;

  const currentAnimal = loadedAnimal || initialAnimal;
  const previousAnimal = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;

  const labels = useMemo(() => {
    if (!currentAnimal) return { breedLabel: '-', fatherLabel: '-', motherLabel: '-' };
    const breedId = currentAnimal.breeds_id || currentAnimal.breed_id;
    const fatherId = currentAnimal.idFather || currentAnimal.father_id;
    const motherId = currentAnimal.idMother || currentAnimal.mother_id;
    return {
      breedLabel: findOptionLabel(breedId, effectiveBreedOptions, currentAnimal.breed?.name || (breedId ? `ID ${breedId}` : '-')),
      fatherLabel: findOptionLabel(fatherId, effectiveFatherOptions, fatherId ? `ID ${fatherId}` : '-'),
      motherLabel: findOptionLabel(motherId, effectiveMotherOptions, motherId ? `ID ${motherId}` : '-'),
    };
  }, [currentAnimal, effectiveBreedOptions, effectiveFatherOptions, effectiveMotherOptions]);

  const handleModalClose = useCallback(() => {
    setNavigationHistory([]);
    if (onClose) onClose();
    onOpenChange(false);
  }, [onClose, onOpenChange]);

  const animalIndex = Array.isArray(animals) && currentAnimal
    ? animals.findIndex((item) => Number(item.id) === Number(currentAnimal.id))
    : -1;
  const hasPreviousAnimal = animalIndex > 0;
  const hasNextAnimal = Array.isArray(animals) && animalIndex >= 0 && animalIndex < animals.length - 1;

  const handleNavigatePrevious = useCallback(() => {
    if (Array.isArray(animals) && animalIndex > 0) {
      handleOpenAnimal(Number(animals[animalIndex - 1].id));
    }
  }, [animals, animalIndex, handleOpenAnimal]);

  const handleNavigateNext = useCallback(() => {
    if (Array.isArray(animals) && animalIndex >= 0 && animalIndex < animals.length - 1) {
      handleOpenAnimal(Number(animals[animalIndex + 1].id));
    }
  }, [animals, animalIndex, handleOpenAnimal]);

  if (!isOpen) return null;

  return (
    <>
      <GenericModal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
          else onOpenChange(true);
        }}
        title={currentAnimal ? `Detalle del Animal: ${currentAnimal.record || currentAnimal.id}` : 'Cargando información del animal...'}
        description="Ficha integral y trazabilidad médica y productiva"
        size="full"
        variant="compact"
        enableBackdropBlur
        enableNavigation={Array.isArray(animals) && animals.length > 1}
        hasPrevious={hasPreviousAnimal}
        hasNext={hasNextAnimal}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        className="bg-card text-card-foreground border-border shadow-2xl transition-all duration-200 ease-out"
        footer={
          currentAnimal ? (
            <AnimalDetailFooter
              animal={currentAnimal}
              animals={animals}
              navigate={navigate}
              onClose={handleModalClose}
              onOpenAnimal={handleOpenAnimal}
              onEdit={onEdit}
              canGoBack={navigationHistory.length > 0}
              onGoBack={handleGoBack}
              previousAnimal={previousAnimal}
            />
          ) : undefined
        }
      >
        {isLoadingAnimal && !currentAnimal ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-[300px] space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">Cargando expediente completo del animal...</p>
          </div>
        ) : currentAnimal ? (
          <AnimalModalContent
            animal={currentAnimal}
            breedLabel={labels.breedLabel}
            fatherLabel={labels.fatherLabel}
            motherLabel={labels.motherLabel}
            onFatherClick={handleOpenAnimal}
            onMotherClick={handleOpenAnimal}
            currentUserId={currentUserId}
            onOpenHistory={() => handleOpenHistory(currentAnimal)}
            onOpenAncestorsTree={() => handleOpenAncestors(currentAnimal)}
            onOpenDescendantsTree={() => handleOpenDescendants(currentAnimal)}
            onEdit={onEdit}
            onReplicate={onReplicate}
          />
        ) : null}
      </GenericModal>

      {/* Modal de Historial Integrado */}
      {isHistoryOpen && historyAnimal && (
        <AnimalHistoryModal
          animal={historyAnimal}
          onClose={() => {
            setIsHistoryOpen(false);
            setHistoryAnimal(null);
          }}
        />
      )}

      {/* Modal de Árbol de Antepasados Integrado */}
      <GeneticTreeModal
        isOpen={isAncestorsOpen}
        onClose={() => {
          setIsAncestorsOpen(false);
          setAncestorsAnimal(null);
          setAncestorsLevels([]);
        }}
        animal={ancestorsAnimal}
        levels={ancestorsLevels}
        counts={ancestorCounts}
        summary={ancestorSummary}
        edgeExamples={ancestorEdgeExamples}
        dependencyInfo={ancestorsApi.dependencyInfo}
        treeError={ancestorsApi.error}
        loadingMore={ancestorsApi.loading}
        onNavigateToAnimal={handleOpenAncestors}
        onOpenDescendantsTreeForAnimal={handleOpenDescendants}
        onLoadMore={async () => {
          if (!ancestorsRootId || !ancestorsApi.graph) return;
          const merged = await ancestorsApi.loadMore('ancestors', ancestorsRootId, ancestorsApi.graph, {
            increment: 2,
            fields: 'id,record,sex,breeds_id,idFather,idMother',
          });
          if (merged) {
            setAncestorsAnimal(merged.nodes[merged.rootId]);
            setAncestorsLevels(graphToAncestorLevels(merged));
            setAncestorCounts(merged.counts);
            setAncestorSummary(merged.summary);
            setAncestorEdgeExamples(merged.edge_examples);
          }
        }}
      />

      {/* Modal de Árbol de Descendientes Integrado */}
      <DescendantsTreeModal
        isOpen={isDescendantsOpen}
        onClose={() => {
          setIsDescendantsOpen(false);
          setDescendantsAnimal(null);
          setDescendantsLevels([]);
        }}
        animal={descendantsAnimal}
        levels={descendantsLevels}
        counts={descendantsCounts}
        summary={descendantsSummary}
        edgeExamples={descendantsEdgeExamples}
        dependencyInfo={descendantsApi.dependencyInfo}
        treeError={descendantsApi.error}
        loadingMore={descendantsApi.loading}
        onNavigateToAnimal={handleOpenDescendants}
        onOpenAncestorsTreeForAnimal={handleOpenAncestors}
        onLoadMore={async () => {
          if (!descendantsRootId || !descendantsApi.graph) return;
          const merged = await descendantsApi.loadMore('descendants', descendantsRootId, descendantsApi.graph, {
            increment: 2,
            fields: 'id,record,sex,breeds_id,idFather,idMother',
          });
          if (merged) {
            setDescendantsAnimal(merged.nodes[merged.rootId]);
            setDescendantsLevels(graphToDescendantLevels(merged));
            setDescendantsCounts(merged.counts);
            setDescendantsSummary(merged.summary);
            setDescendantsEdgeExamples(merged.edge_examples);
          }
        }}
      />
    </>
  );
}
