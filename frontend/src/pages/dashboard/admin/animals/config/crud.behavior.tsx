import type { MutableRefObject } from 'react';
import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { animalImageService } from '@/entities/animal/api/animalImage.service';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { BatchActionToolbar } from '@/features/animal-bulk-actions';
import { checkAnimalDependencies, clearAnimalDependencyCache } from '@/features/diagnostics/api/dependencyCheck.service';

export type BulkModal = 'transfer' | 'weight' | 'vaccinate' | 'print' | 'delete' | null;
type AnimalRecord = AnimalResponse & { [key: string]: any };

interface BatchActionOptions {
  clearSelectionRef: MutableRefObject<(() => void) | null>;
  selectedIdsRef: MutableRefObject<number[]>;
  setBulkModal: (modal: Exclude<BulkModal, null>) => void;
  setSelectedAnimals: (animals: any[]) => void;
}

export const createBatchActions = ({ clearSelectionRef, selectedIdsRef, setBulkModal, setSelectedAnimals }: BatchActionOptions) => (selectedIds: number[], items: any[], clearSelection: () => void) => {
  clearSelectionRef.current = clearSelection;
  selectedIdsRef.current = selectedIds;
  return <BatchActionToolbar selectedCount={selectedIds.length} onClear={clearSelection} onTransfer={() => setBulkModal('transfer')} onWeight={() => setBulkModal('weight')} onVaccinate={() => setBulkModal('vaccinate')} onPrintTags={() => { setSelectedAnimals(items.filter((item) => selectedIds.includes(item.id))); setBulkModal('print'); }} onDelete={() => setBulkModal('delete')} />;
};

export const createAnimalActions = (userId: number | undefined, openHistory: (animal: AnimalRecord) => void, openAncestors: (animal: AnimalRecord) => void, openDescendants: (animal: AnimalRecord) => void) => (record: AnimalRecord) => (
  <div className="flex items-center gap-1"><AnimalActionsMenu animal={record} currentUserId={userId} onOpenHistory={() => openHistory(record)} onOpenAncestorsTree={() => openAncestors(record)} onOpenDescendantsTree={() => openDescendants(record)} /></div>
);

const uploadPendingImages = async (animal: any, pendingImages: File[]) => {
  const response = await animalImageService.uploadImages(animal.id, pendingImages, { compress: true, quality: 0.8 });
  if (response.success) window.dispatchEvent(new CustomEvent('animal-images:updated', { detail: { animalId: animal.id, uploaded: response.data.uploaded } }));
};

export const createAnimalLifecycle = (pendingImages: File[], setPendingImages: (files: File[]) => void, refreshFathers: () => void, refreshMothers: () => void) => ({
  onAfterCreate: async (createdAnimal: any) => {
    refreshFathers();
    refreshMothers();
    if (pendingImages.length === 0 || !createdAnimal?.id) return;
    try { await uploadPendingImages(createdAnimal, pendingImages); }
    catch (error) { console.error('[AdminAnimalsPage] Error al subir imágenes:', error); }
    finally { setPendingImages([]); }
  },
  onAfterUpdate: async () => { refreshFathers(); refreshMothers(); },
});

export const preDeleteCheck = async (id: number) => {
  clearAnimalDependencyCache(id);
  return checkAnimalDependencies(id);
};
