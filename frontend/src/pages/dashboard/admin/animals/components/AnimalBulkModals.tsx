import { BatchFieldTransferModal, BatchWeightModal, BatchVaccinationModal, BulkTagPrintModal } from '@/features/animal-bulk-actions';

interface AnimalBulkModalsProps {
  bulkModal: 'transfer' | 'weight' | 'vaccinate' | 'print' | null;
  selectedIds: number[];
  selectedAnimals: any[];
  breedOptions: Array<{ value: unknown; label: string }>;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  clearSelection: () => void;
}

const getBreedLabel = (item: any, breedOptions: AnimalBulkModalsProps['breedOptions']) => {
  const breedId = item.breeds_id || item.breed_id;
  if (!breedId) return undefined;
  return breedOptions.find((breed) => Number(breed.value) === Number(breedId))?.label || item.breed?.name || `ID ${breedId}`;
};

const buildPrintAnimal = (item: any, breedOptions: AnimalBulkModalsProps['breedOptions']) => ({
  id: item.id,
  record: item.record || `ID-${item.id}`,
  breedLabel: getBreedLabel(item, breedOptions),
  gender: item.gender || item.sex || undefined,
  birthDate: item.birth_date ? new Date(item.birth_date).toLocaleDateString('es-CO') : undefined,
});

const buildPrintAnimals = (animals: any[], breedOptions: AnimalBulkModalsProps['breedOptions']) => animals.map((item) => buildPrintAnimal(item, breedOptions));

export function AnimalBulkModals({ bulkModal, selectedIds, selectedAnimals, breedOptions, onClose, onSuccess, clearSelection }: AnimalBulkModalsProps) {
  if (!bulkModal) return null;
  if (bulkModal === 'transfer') return <BatchFieldTransferModal isOpen onClose={onClose} selectedAnimalIds={selectedIds} onSuccess={() => { onClose(); clearSelection(); }} />;
  if (bulkModal === 'weight') return <BatchWeightModal isOpen onClose={onClose} selectedAnimalIds={selectedIds} onSuccess={() => { onClose(); clearSelection(); onSuccess('Pesaje masivo registrado'); }} />;
  if (bulkModal === 'vaccinate') return <BatchVaccinationModal isOpen onClose={onClose} selectedAnimalIds={selectedIds} onSuccess={() => { onClose(); clearSelection(); onSuccess('Vacunación masiva registrada'); }} />;
  return <BulkTagPrintModal isOpen onClose={onClose} animals={buildPrintAnimals(selectedAnimals, breedOptions)} onSuccess={() => { onClose(); clearSelection(); onSuccess('Etiquetas generadas'); }} />;
}
