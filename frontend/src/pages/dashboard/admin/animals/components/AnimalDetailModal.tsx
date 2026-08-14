import type { NavigateFunction } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { AnimalModalContent } from '@/widgets/dashboard/animals/AnimalModalContent';

interface AnimalDetailModalProps {
  isOpen: boolean;
  animal: any;
  animals: any[];
  breedOptions: Array<{ value: unknown; label: string }>;
  fatherOptions: Array<{ value: unknown; label: string }>;
  motherOptions: Array<{ value: unknown; label: string }>;
  currentUserId?: number;
  navigate: NavigateFunction;
  onOpenChange: (open: boolean) => void;
  onOpenHistory: (animal: any) => void;
  onOpenAncestors: (animal: any) => void;
  onOpenDescendants: (animal: any) => void;
  onOpenAnimal: (animalId: number) => void;
}

const findOptionLabel = (id: unknown, options: Array<{ value: unknown; label: string }>, fallback: string) => {
  if (!id) return '-';
  return options.find((option) => Number(option.value) === Number(id))?.label || fallback;
};

const getAnimalLabels = (animal: any, breedOptions: AnimalDetailModalProps['breedOptions'], fatherOptions: AnimalDetailModalProps['fatherOptions'], motherOptions: AnimalDetailModalProps['motherOptions']) => {
  const breedId = animal.breeds_id || animal.breed_id;
  const fatherId = animal.idFather || animal.father_id;
  const motherId = animal.idMother || animal.mother_id;
  return {
    breedLabel: findOptionLabel(breedId, breedOptions, animal.breed?.name || `ID ${breedId}`),
    fatherLabel: findOptionLabel(fatherId, fatherOptions, `ID ${fatherId}`),
    motherLabel: findOptionLabel(motherId, motherOptions, `ID ${motherId}`),
  };
};

function AnimalDetailFooter({ animal, animals, navigate, onClose, onOpenAnimal }: { animal: any; animals: any[]; navigate: NavigateFunction; onClose: () => void; onOpenAnimal: (id: number) => void }) {
  const index = animals.findIndex((item) => Number(item.id) === Number(animal.id));
  const hasPrevious = index > 0;
  const hasNext = index >= 0 && index < animals.length - 1;
  const editAnimal = () => {
    const search = new URLSearchParams(window.location.search);
    search.set('edit', String(animal.id));
    navigate(`?${search.toString()}`);
    onClose();
  };
  return (
    <div className="border-t border-border/40 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 px-4 sm:px-6 py-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex gap-2 sm:flex-1">
          <Button variant="outline" size="sm" type="button" disabled={!hasPrevious} onClick={() => hasPrevious && onOpenAnimal(Number(animals[index - 1].id))} className="flex-1 sm:flex-initial transition-all duration-150 hover:bg-muted/50 shadow-sm"><ChevronLeft className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Anterior</span></Button>
          <Button variant="outline" size="sm" type="button" disabled={!hasNext} onClick={() => hasNext && onOpenAnimal(Number(animals[index + 1].id))} className="flex-1 sm:flex-initial transition-all duration-150 hover:bg-muted/50 shadow-sm"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="h-4 w-4 sm:ml-1" /></Button>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button variant="outline" size="sm" type="button" onClick={onClose} className="flex-1 sm:flex-initial">Cerrar</Button>
          <Button size="sm" type="button" onClick={editAnimal} className="flex-1 sm:flex-initial"><Edit className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Editar</span></Button>
        </div>
      </div>
    </div>
  );
}

export function AnimalDetailModal({ isOpen, animal, animals, breedOptions, fatherOptions, motherOptions, currentUserId, navigate, onOpenChange, onOpenHistory, onOpenAncestors, onOpenDescendants, onOpenAnimal }: AnimalDetailModalProps) {
  if (!isOpen || !animal) return null;
  const labels = getAnimalLabels(animal, breedOptions, fatherOptions, motherOptions);
  return (
    <GenericModal isOpen={isOpen} onOpenChange={onOpenChange} title={`Detalle del Animal: ${animal.id}`} description="Información detallada del animal" size="full" variant="compact" enableBackdropBlur className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out" footer={<AnimalDetailFooter animal={animal} animals={animals} navigate={navigate} onClose={() => onOpenChange(false)} onOpenAnimal={onOpenAnimal} />}>
      <AnimalModalContent animal={animal} {...labels} onFatherClick={onOpenAnimal} onMotherClick={onOpenAnimal} currentUserId={currentUserId} onOpenHistory={() => onOpenHistory(animal)} onOpenAncestorsTree={() => onOpenAncestors(animal)} onOpenDescendantsTree={() => onOpenDescendants(animal)} />
    </GenericModal>
  );
}
