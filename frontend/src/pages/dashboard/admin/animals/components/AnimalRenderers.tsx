import type { NavigateFunction } from 'react-router-dom';
import { AnimalCard } from '@/widgets/dashboard/animals/AnimalCard';
import { AnimalModalContent } from '@/widgets/dashboard/animals/AnimalModalContent';
import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';

type AnimalRecord = AnimalResponse & { [key: string]: any };
type Option = { value: unknown; label: string };

const resolveLabel = (id: unknown, options: Option[], fallback: string) => options.find((option) => Number(option.value) === Number(id))?.label || fallback;

interface AnimalRendererOptions {
  breedOptions: Option[];
  fatherOptions: Option[];
  motherOptions: Option[];
  onOpenAnimal: (id: number) => void;
}

export function renderAnimalCard(item: AnimalRecord, options: AnimalRendererOptions) {
  const labels = getAnimalLabels(item, options);
  return <AnimalCard animal={item} {...labels} fieldName={item.current_field_name || null} alertCount={item.pending_alerts_count || 0} onFatherClick={options.onOpenAnimal} onMotherClick={options.onOpenAnimal} onCardClick={() => options.onOpenAnimal(Number(item.id))} hideFooterActions embedded />;
}

const getAnimalLabels = (item: AnimalRecord, options: AnimalRendererOptions) => {
  const breedId = item.breeds_id || item.breed_id;
  const fatherId = item.idFather || item.father_id;
  const motherId = item.idMother || item.mother_id;
  return {
    breedLabel: breedId ? resolveLabel(breedId, options.breedOptions, item.breed?.name || `ID ${breedId}`) : '-',
    fatherLabel: fatherId ? resolveLabel(fatherId, options.fatherOptions, `ID ${fatherId}`) : '-',
    motherLabel: motherId ? resolveLabel(motherId, options.motherOptions, `ID ${motherId}`) : '-',
  };
};

interface AnimalDetailRendererOptions extends AnimalRendererOptions {
  currentUserId?: number;
  navigate: NavigateFunction;
  onOpenHistory: (animal: AnimalRecord) => void;
  onOpenAncestors: (animal: AnimalRecord) => void;
  onOpenDescendants: (animal: AnimalRecord) => void;
  showToast: (message: string, type?: any) => void;
}

export function renderAnimalDetail(item: AnimalRecord, options: AnimalDetailRendererOptions) {
  const breedId = item.breeds_id || item.breed_id;
  const fatherId = item.idFather || item.father_id;
  const motherId = item.idMother || item.mother_id;
  const edit = (create = false) => {
    const search = new URLSearchParams(window.location.search);
    search.set(create ? 'create' : 'edit', create ? 'true' : String(item.id));
    search.delete('detail');
    options.navigate(`?${search.toString()}`);
    if (create) options.showToast('Modo creación iniciado. Ingrese los detalles del nuevo animal.', 'info');
  };
  return <AnimalModalContent animal={item} breedLabel={breedId ? resolveLabel(breedId, options.breedOptions, item.breed?.name || `ID ${breedId}`) : '-'} fatherLabel={fatherId ? resolveLabel(fatherId, options.fatherOptions, `ID ${fatherId}`) : '-'} motherLabel={motherId ? resolveLabel(motherId, options.motherOptions, `ID ${motherId}`) : '-'} onFatherClick={options.onOpenAnimal} onMotherClick={options.onOpenAnimal} currentUserId={options.currentUserId} onOpenHistory={() => options.onOpenHistory(item)} onOpenAncestorsTree={() => options.onOpenAncestors(item)} onOpenDescendantsTree={() => options.onOpenDescendants(item)} onEdit={() => edit()} onReplicate={() => edit(true)} />;
}
