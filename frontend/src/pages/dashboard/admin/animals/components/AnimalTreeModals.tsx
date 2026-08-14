import GeneticTreeModal from '@/widgets/dashboard/GeneticTreeModal';
import DescendantsTreeModal from '@/widgets/dashboard/DescendantsTreeModal';
import { useAnimalTreeApi } from '@/entities/animal/model/useAnimalTreeApi';

interface TreeModalState {
  isOpen: boolean;
  animal: any;
  levels: any[][];
  counts?: { nodes: number; edges: number };
  summary?: any;
  edgeExamples?: any;
  rootId: number | null;
}

interface AnimalTreeModalsProps {
  ancestors: TreeModalState;
  descendants: TreeModalState;
  ancestorsApi: ReturnType<typeof useAnimalTreeApi>;
  descendantsApi: ReturnType<typeof useAnimalTreeApi>;
  onCloseAncestors: () => void;
  onCloseDescendants: () => void;
  onNavigateToAnimal: (record: any) => void;
  onOpenDescendants: (record: any) => void;
  onOpenAncestors: (record: any) => void;
  onLoadAncestors: () => Promise<void>;
  onLoadDescendants: () => Promise<void>;
}

export function AnimalTreeModals({ ancestors, descendants, ancestorsApi, descendantsApi, onCloseAncestors, onCloseDescendants, onNavigateToAnimal, onOpenDescendants, onOpenAncestors, onLoadAncestors, onLoadDescendants }: AnimalTreeModalsProps) {
  return (
    <>
      <GeneticTreeModal isOpen={ancestors.isOpen} onClose={onCloseAncestors} animal={ancestors.animal} levels={ancestors.levels} counts={ancestors.counts} summary={ancestors.summary} edgeExamples={ancestors.edgeExamples} dependencyInfo={ancestorsApi.dependencyInfo} treeError={ancestorsApi.error} loadingMore={ancestorsApi.loading} onNavigateToAnimal={onNavigateToAnimal} onOpenDescendantsTreeForAnimal={onOpenDescendants} onLoadMore={onLoadAncestors} />
      <DescendantsTreeModal isOpen={descendants.isOpen} onClose={onCloseDescendants} animal={descendants.animal} levels={descendants.levels} counts={descendants.counts} summary={descendants.summary} edgeExamples={descendants.edgeExamples} dependencyInfo={descendantsApi.dependencyInfo} treeError={descendantsApi.error} loadingMore={descendantsApi.loading} onNavigateToAnimal={onNavigateToAnimal} onOpenAncestorsTreeForAnimal={onOpenAncestors} onLoadMore={onLoadDescendants} />
    </>
  );
}
