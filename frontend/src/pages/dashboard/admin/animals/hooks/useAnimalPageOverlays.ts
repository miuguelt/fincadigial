import type { AnimalPageOverlaysProps } from '../components/AnimalPageOverlays';
import type { AnimalPageRuntime } from './useAnimalPageRuntime';

const treeState = (dialog: AnimalPageRuntime['ancestors']) => ({
  isOpen: dialog.isOpen,
  animal: dialog.animal,
  levels: dialog.levels,
  counts: dialog.counts,
  summary: dialog.summary,
  edgeExamples: dialog.edgeExamples,
  rootId: dialog.rootId,
});

export function buildAnimalPageOverlays(runtime: AnimalPageRuntime): AnimalPageOverlaysProps {
  const { ancestors, descendants, details, user, navigate, breedOptions, fatherOptions, motherOptions, openGeneticTreeModal, openDescendantsTreeModal } = getOverlayInputs(runtime);

  return {
    detail: {
      isOpen: details.isOpen,
      animal: details.selectedAnimal,
      animals: details.animalNavList,
      breedOptions,
      fatherOptions,
      motherOptions,
      currentUserId: user?.id,
      navigate,
      onOpenChange: (open: boolean) => {
        details.setIsOpen(open);
        if (!open && typeof window !== 'undefined') {
          if (window.location.pathname.startsWith('/admin/animals/') && !window.location.pathname.endsWith('/admin/animals')) {
            navigate('/admin/animals', { replace: true });
          }
        }
      },
      onOpenHistory: details.openHistory,
      onOpenAncestors: openGeneticTreeModal,
      onOpenDescendants: openDescendantsTreeModal,
      onOpenAnimal: details.openAnimal,
    },
    history: {
      isOpen: details.isHistoryOpen,
      animal: details.historyAnimal,
      onClose: () => {
        details.setIsHistoryOpen(false);
        details.setHistoryAnimal(null);
      },
    },
    trees: {
      ancestors: treeState(ancestors),
      descendants: treeState(descendants),
      ancestorsApi: ancestors.api,
      descendantsApi: descendants.api,
      onCloseAncestors: ancestors.close,
      onCloseDescendants: descendants.close,
      onNavigateToAnimal: openGeneticTreeModal,
      onOpenDescendants: openDescendantsTreeModal,
      onOpenAncestors: openGeneticTreeModal,
      onLoadAncestors: ancestors.loadMore,
      onLoadDescendants: descendants.loadMore,
    },
    bulk: {
      bulkModal: runtime.bulkModal,
      selectedIds: runtime.selectedIdsRef.current,
      selectedAnimals: runtime.selectedAnimalsForPrint,
      breedOptions,
      onClose: () => runtime.setBulkModal(null),
      onSuccess: (message) => message && runtime.showToast(message, 'success'),
      clearSelection: () => runtime.clearSelectionRef.current?.(),
    },
  };
}

function getOverlayInputs(runtime: AnimalPageRuntime) {
  return {
    ...runtime,
    openGeneticTreeModal: runtime.ancestors.open,
    openDescendantsTreeModal: runtime.descendants.open,
  };
}
