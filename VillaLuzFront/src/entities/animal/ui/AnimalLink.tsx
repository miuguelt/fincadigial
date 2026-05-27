import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { Button } from '@/shared/ui/button';

// Widgets (Permitido desde entities a widgets? NO. Entities NO puede importar de Widgets)
// AH! Aquí hay otro problema de FSD.
// Si AnimalLink necesita AnimalModalContent (widget), entonces AnimalLink DEBE ser un WIDGET o un FEATURE.
// O AnimalModalContent debe ser movido a Entities si es puramente informativo.

// Revisando AnimalModalContent...
import { AnimalModalContent } from '@/widgets/dashboard/animals/AnimalModalContent';
import { AnimalHistoryModal } from '@/widgets/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/widgets/dashboard/GeneticTreeModal';
import DescendantsTreeModal from '@/widgets/dashboard/DescendantsTreeModal';
import { useAnimalTreeApi, graphToAncestorLevels, graphToDescendantLevels } from '@/entities/animal/model/useAnimalTreeApi';

export const AnimalLink: React.FC<{ id: number | string; label: string; children?: React.ReactNode }> = ({ id, label, children }) => {
  const renderAnimalContent = (initialAnimal: any) => {
    const Wrapper: React.FC<{ initial: any }> = ({ initial }) => {
      const [animal, setAnimal] = useState<any>(initial);
      const { user } = useAuth();

      const [isHistoryOpen, setIsHistoryOpen] = useState(false);
      const [historyAnimal, setHistoryAnimal] = useState<any | null>(null);

      const ancestorsApi = useAnimalTreeApi();
      const descendantsApi = useAnimalTreeApi();
      
      const [isTreeOpen, setIsTreeOpen] = useState(false);
      const [treeAnimal, setTreeAnimal] = useState<any | null>(null);
      const [treeLevels, setTreeLevels] = useState<any[][]>([]);
      const [ancestorCounts, setAncestorCounts] = useState<any>();
      const [ancestorSummary, setAncestorSummary] = useState<any>();
      const [ancestorEdgeExamples, setAncestorEdgeExamples] = useState<any>();
      const [treeRootId, setTreeRootId] = useState<number | null>(null);

      const [isDescOpen, setIsDescOpen] = useState(false);
      const [descAnimal, setDescAnimal] = useState<any | null>(null);
      const [descLevels, setDescLevels] = useState<any[][]>([]);
      const [descCounts, setDescCounts] = useState<any>();
      const [descSummary, setDescSummary] = useState<any>();
      const [descEdgeExamples, setDescEdgeExamples] = useState<any>();
      const [descRootId, setDescRootId] = useState<number | null>(null);

      const loadAnimal = async (animalId: number) => {
        const next = await animalsService.getById(animalId);
        setAnimal(next);
      };

      const openHistory = (record: any) => {
        const payload = {
          idAnimal: Number(record?.id ?? 0),
          record: record?.record || '',
          breed: record?.breed,
          birth_date: record?.birth_date,
          sex: record?.sex || record?.gender,
          status: record?.status,
        };
        setHistoryAnimal(payload);
        setIsHistoryOpen(true);
      };

      const openAncestorsTree = async (record: any) => {
        const idNum = Number(record?.id ?? 0);
        if (!idNum) return;
        const resp = await ancestorsApi.fetchAncestors(idNum, 3, 'id,record,sex,breeds_id,idFather,idMother');
        if (!resp) {
          setTreeAnimal(record);
          setTreeLevels([]);
          setTreeRootId(idNum);
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

      const openDescendantsTree = async (record: any) => {
        const idNum = Number(record?.id ?? 0);
        if (!idNum) return;
        const resp = await descendantsApi.fetchDescendants(idNum, 3, 'id,record,sex,breeds_id,idFather,idMother');
        if (!resp) {
          setDescAnimal(record);
          setDescLevels([]);
          setDescRootId(idNum);
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

      return (
        <>
          <AnimalModalContent
            animal={animal}
            breedLabel={animal?.breed?.name || '-'}
            fatherLabel={animal?.idFather ? `ID ${animal.idFather}` : '-'}
            motherLabel={animal?.idMother ? `ID ${animal.idMother}` : '-'}
            onFatherClick={animal?.idFather ? (id: number) => loadAnimal(id) : undefined}
            onMotherClick={animal?.idMother ? (id: number) => loadAnimal(id) : undefined}
            currentUserId={user?.id}
            onOpenHistory={() => openHistory(animal)}
            onOpenAncestorsTree={() => openAncestorsTree(animal)}
            onOpenDescendantsTree={() => openDescendantsTree(animal)}
          />

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
            }}
            animal={treeAnimal}
            levels={treeLevels}
            counts={ancestorCounts}
            summary={ancestorSummary}
            edgeExamples={ancestorEdgeExamples}
            dependencyInfo={ancestorsApi.dependencyInfo}
            treeError={ancestorsApi.error}
            loadingMore={ancestorsApi.loading}
            onNavigateToAnimal={openAncestorsTree}
            onOpenDescendantsTreeForAnimal={openDescendantsTree}
            onLoadMore={async () => {
              if (!treeRootId || !ancestorsApi.graph) return;
              const merged = await ancestorsApi.loadMore('ancestors', treeRootId, ancestorsApi.graph, {
                increment: 2,
                fields: 'id,record,sex,breeds_id,idFather,idMother',
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
            }}
            animal={descAnimal}
            levels={descLevels}
            counts={descCounts}
            summary={descSummary}
            edgeExamples={descEdgeExamples}
            dependencyInfo={descendantsApi.dependencyInfo}
            treeError={descendantsApi.error}
            loadingMore={descendantsApi.loading}
            onNavigateToAnimal={openDescendantsTree}
            onOpenAncestorsTreeForAnimal={openAncestorsTree}
            onLoadMore={async () => {
              if (!descRootId || !descendantsApi.graph) return;
              const merged = await descendantsApi.loadMore('descendants', descRootId, descendantsApi.graph, {
                increment: 2,
                fields: 'id,record,sex,breeds_id,idFather,idMother',
              });
              setDescAnimal(merged.nodes[merged.rootId]);
              setDescLevels(graphToDescendantLevels(merged));
              setDescCounts(merged.counts);
              setDescSummary(merged.summary);
              setDescEdgeExamples(merged.edge_examples);
            }}
          />
        </>
      );
    };

    return <Wrapper initial={initialAnimal} />;
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={animalsService}
      modalTitle="Detalle del Animal"
      renderContent={renderAnimalContent}
      size="full"
      enableFullScreenToggle
    >
      {children}
    </ForeignKeyLink>
  );
};

export const AnimalGrowthLink: React.FC<{ id: number | string; label: string; className?: string }> = ({ id, label, className = '' }) => {
  return (
    <AnimalLink id={id} label={label}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 w-9 p-0 flex-shrink-0 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-200 ${className}`}
        title={`Ver Análisis de Crecimiento de ${label}`}
      >
        <TrendingUp className="h-4 w-4" />
      </Button>
    </AnimalLink>
  );
};
