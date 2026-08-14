import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDColumn } from '@/shared/types/crud';
import { AnimalLink } from '@/entities/animal/ui';
import { BreedLink } from '@/entities/breed/ui';

type AnimalRecord = AnimalResponse & { [key: string]: any };

interface AnimalColumnOptions {
  breedOptions: Array<{ value: unknown; label: string }>;
  fatherOptions: Array<{ value: unknown; label: string }>;
  motherOptions: Array<{ value: unknown; label: string }>;
}

const formatDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('es-CO') : '-';
const optionLabel = (options: Array<{ value: unknown; label: string }>, id: unknown, fallback: string) => options.find((option) => Number(option.value) === Number(id))?.label || fallback;

export const buildAnimalColumns = ({ breedOptions, fatherOptions, motherOptions }: AnimalColumnOptions): CRUDColumn<AnimalRecord>[] => [
  { key: 'record', label: 'Registro', width: 15 },
  { key: 'sex', label: 'Sexo', render: (value, record) => value || record.sex || '-' },
  { key: 'status', label: 'Estado', render: (value) => value || '-' },
  {
    key: 'breeds_id', label: 'Raza', render: (value, record) => {
      const id = value || record.breeds_id || record.breed_id;
      return id ? <BreedLink id={Number(id)} label={optionLabel(breedOptions, id, `Raza ${id}`)} /> : '-';
    },
  },
  { key: 'birth_date', label: 'Nacimiento', render: formatDate },
  { key: 'weight', label: 'Peso (kg)', render: (value) => value ?? '-' },
  { key: 'age_in_months', label: 'Edad (meses)', render: (value) => value ?? '-' },
  { key: 'is_adult', label: 'Adulto', render: (value) => value === true ? 'Sí' : value === false ? 'No' : '-' },
  {
    key: 'idFather', label: 'Padre', render: (value, record) => {
      const id = value || record.idFather || record.father_id;
      return id ? <AnimalLink id={Number(id)} label={optionLabel(fatherOptions, id, `Animal ${id}`)} /> : '-';
    },
  },
  {
    key: 'idMother', label: 'Madre', render: (value, record) => {
      const id = value || record.idMother || record.mother_id;
      return id ? <AnimalLink id={Number(id)} label={optionLabel(motherOptions, id, `Animal ${id}`)} /> : '-';
    },
  },
  { key: 'created_at', label: 'Creado', render: formatDate },
];
