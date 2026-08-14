import type { ComponentProps } from 'react';
import { AnimalHistoryModal } from '@/widgets/dashboard/AnimalHistoryModal';
import { AnimalDetailModal } from './AnimalDetailModal';
import { AnimalTreeModals } from './AnimalTreeModals';
import { AnimalBulkModals } from './AnimalBulkModals';

export interface AnimalPageOverlaysProps {
  detail: { isOpen: boolean; animal: any; animals: any[]; breedOptions: any[]; fatherOptions: any[]; motherOptions: any[]; currentUserId?: number; navigate: any; onOpenChange: (open: boolean) => void; onOpenHistory: (animal: any) => void; onOpenAncestors: (animal: any) => void; onOpenDescendants: (animal: any) => void; onOpenAnimal: (id: number) => void };
  history: { isOpen: boolean; animal: any; onClose: () => void };
  trees: ComponentProps<typeof AnimalTreeModals>;
  bulk: ComponentProps<typeof AnimalBulkModals>;
}

export function AnimalPageOverlays({ detail, history, trees, bulk }: AnimalPageOverlaysProps) {
  return (
    <>
      <AnimalDetailModal {...detail} />
      {history.isOpen && history.animal && <AnimalHistoryModal animal={history.animal} onClose={history.onClose} />}
      <AnimalTreeModals {...trees} />
      <AnimalBulkModals {...bulk} />
    </>
  );
}
