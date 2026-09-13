import React, { useCallback, useState } from 'react';
import { MoreVertical } from 'lucide-react';

import { cn } from '@/shared/ui/cn';
import { Popover, PopoverTrigger } from '@/shared/ui/popover';
import { AnimalExitModal } from '@/widgets/animals/AnimalExitModal';
import { WeaningModal } from '@/widgets/animals/WeaningModal';

import { AnimalActionModalInstance } from './AnimalActionModalInstance';
import type {
  AnimalActionsMenuProps,
  ModalMode,
  ModalState,
  ModalType,
} from './AnimalActionsMenu.types';
import { AnimalActionsPanel } from './animal-actions-menu/AnimalActionsPanel';
import type { SectionId } from './animal-actions-menu/menuSections';

const MIN_WEANING_AGE_DAYS = 200;
const MAX_WEANING_AGE_DAYS = 250;

function isWeaningCandidate(animal: AnimalActionsMenuProps['animal']): boolean {
  if (typeof animal.age_in_days === 'number') {
    return animal.age_in_days >= MIN_WEANING_AGE_DAYS && animal.age_in_days <= MAX_WEANING_AGE_DAYS;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(animal.birth_date || '')) return false;
  const birthDate = new Date(`${animal.birth_date}T00:00:00-05:00`);
  const ageInDays = Math.floor((Date.now() - birthDate.getTime()) / 86_400_000);
  return ageInDays >= MIN_WEANING_AGE_DAYS && ageInDays <= MAX_WEANING_AGE_DAYS;
}

export const AnimalActionsMenu: React.FC<AnimalActionsMenuProps> = ({
  animal,
  breedLabel,
  currentUserId,
  onOpenHistory,
  onOpenAncestorsTree,
  onOpenDescendantsTree,
  onRefresh,
  onModalClose,
  onEditAnimal,
  onDeleteAnimal,
  className,
}) => {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>('health');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isWeaningModalOpen, setIsWeaningModalOpen] = useState(false);
  const animalName = animal.record || `#${animal.id}`;
  const runtimeAnimal = animal as typeof animal & { breed_name?: string; gender?: string };
  const breedName = breedLabel || (typeof animal.breed === 'string' ? animal.breed : animal.breed?.name) || runtimeAnimal.breed_name;
  const sexName = animal.sex || runtimeAnimal.gender;

  const handleOpenModal = useCallback((type: Exclude<ModalType, null>, mode: ModalMode = 'create') => {
    setModalStack([{ id: Math.random().toString(36).substring(2, 9), type, mode, editingItem: null }]);
    setMenuOpen(false);
  }, []);

  const handleCloseModal = useCallback((id?: string) => {
    setModalStack((previousStack) => {
      const nextStack = id ? previousStack.filter((modal) => modal.id !== id) : previousStack.slice(0, -1);
      if (nextStack.length === 0) onModalClose?.();
      return nextStack;
    });
  }, [onModalClose]);

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn('icon-btn flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)}
            onClick={(event) => event.stopPropagation()}
            title={`Abrir acciones de ${animalName}`}
            aria-label={`Abrir acciones de ${animalName}`}
            data-testid="animal-actions-trigger"
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <AnimalActionsPanel
          animalName={animalName}
          breedName={breedName}
          sexName={sexName}
          canWean={isWeaningCandidate(animal)}
          openSection={openSection}
          onToggleSection={(section) => setOpenSection((current) => current === section ? null : section)}
          onClose={() => setMenuOpen(false)}
          onOpenModule={handleOpenModal}
          onOpenExit={() => setIsExitModalOpen(true)}
          onOpenWeaning={() => setIsWeaningModalOpen(true)}
          onOpenHistory={onOpenHistory}
          onOpenAncestorsTree={onOpenAncestorsTree}
          onOpenDescendantsTree={onOpenDescendantsTree}
          onEditAnimal={onEditAnimal}
          onDeleteAnimal={onDeleteAnimal}
        />
      </Popover>

      {modalStack.map((modalState, index) => (
        <AnimalActionModalInstance
          key={modalState.id}
          type={modalState.type}
          mode={modalState.mode}
          animal={animal}
          currentUserId={currentUserId}
          editingItem={modalState.editingItem}
          zIndex={1200 + index * 10}
          onClose={() => handleCloseModal(modalState.id)}
          onRefreshParent={onRefresh}
        />
      ))}
      <AnimalExitModal open={isExitModalOpen} onClose={() => setIsExitModalOpen(false)} animal={animal} onSuccess={onRefresh} />
      <WeaningModal open={isWeaningModalOpen} onClose={() => setIsWeaningModalOpen(false)} animal={animal} onSuccess={onRefresh} />
    </>
  );
};
