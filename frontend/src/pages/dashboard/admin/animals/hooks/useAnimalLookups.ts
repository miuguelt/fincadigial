import { breedsService } from '@/entities/breed/api/breeds.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';

const parentQuery = (sex: 'Macho' | 'Hembra') => (params: Record<string, unknown> = {}) => animalsService.getAnimalsPaginated({ ...params, sex, fields: 'id,record,sex', limit: 50 });
const mapAnimalOption = (animal: { id: number; record: string }) => ({ value: animal.id, label: animal.record ? animal.record : `ID ${animal.id}` });

export function useAnimalLookups() {
  const breeds = useForeignKeySelect((params) => breedsService.getPaginated({ ...params, limit: 100 }), (breed: { id: number; name: string }) => ({ value: breed.id, label: breed.name }), undefined, 100);
  const fathers = useForeignKeySelect(parentQuery('Macho'), mapAnimalOption, undefined, 50);
  const mothers = useForeignKeySelect(parentQuery('Hembra'), mapAnimalOption, undefined, 50);
  return { breedOptions: breeds.options, fatherOptions: fathers.options, motherOptions: mothers.options, refreshFathers: fathers.refresh, refreshMothers: mothers.refresh };
}
