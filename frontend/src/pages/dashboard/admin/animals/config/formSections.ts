import type { CRUDFormSection } from '@/shared/types/crud';
import type { AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { ANIMAL_GENDERS, ANIMAL_STATUS_OPTIONS } from './animals.config';

interface AnimalFormOptions {
  breedOptions: Array<{ value: string | number; label: string }>;
  fatherOptions: Array<{ value: string | number; label: string }>;
  motherOptions: Array<{ value: string | number; label: string }>;
}

export const buildAnimalFormSections = ({ breedOptions, fatherOptions, motherOptions }: AnimalFormOptions): CRUDFormSection<Partial<AnimalInput>>[] => [
  {
    title: 'Información Básica', gridCols: 3,
    fields: [
      { name: 'record', label: 'Registro', type: 'text', required: true, placeholder: 'Ej: REC0001' },
      { name: 'birth_date', label: 'Fecha de Nacimiento', type: 'date', required: true },
      { name: 'breeds_id', label: 'Raza', type: 'select', required: true, options: breedOptions, placeholder: 'Seleccionar raza' },
      { name: 'sex', label: 'Sexo', type: 'select', required: true, options: ANIMAL_GENDERS as any },
      { name: 'status', label: 'Estado', type: 'select', options: ANIMAL_STATUS_OPTIONS as any },
      {
        name: 'weight',
        label: 'Peso (kg)',
        type: 'number',
        required: true,
        placeholder: 'Ej: 250',
        suggestions: [
          { label: 'Nacimiento (35 kg)', value: 35 },
          { label: 'Destete (180 kg)', value: 180 },
          { label: 'Levante (250 kg)', value: 250 },
          { label: 'Ceba (380 kg)', value: 380 },
          { label: 'Cebado (480 kg)', value: 480 },
          { label: 'Adulto (520 kg)', value: 520 },
        ],
      },
    ],
  },
  {
    title: 'Genealogía y Adquisición', gridCols: 3,
    fields: [
      { name: 'idFather', label: 'Padre', type: 'select', options: fatherOptions, placeholder: 'Seleccionar padre', excludeSelf: true },
      { name: 'idMother', label: 'Madre', type: 'select', options: motherOptions, placeholder: 'Seleccionar madre', excludeSelf: true },
    ],
  },
  {
    title: 'Trazabilidad y Registro ICA', gridCols: 3,
    fields: [
      { name: 'entry_date', label: 'Fecha de Ingreso', type: 'date', placeholder: 'Fecha de llegada a la finca' },
      { name: 'purchase_date', label: 'Fecha de Compra', type: 'date', placeholder: 'Fecha de adquisición' },
      { name: 'exit_date', label: 'Fecha de Salida', type: 'date', placeholder: 'Fecha de egreso' },
      { name: 'sale_date', label: 'Fecha de Venta', type: 'date', placeholder: 'Fecha de comercialización' },
      {
        name: 'exit_reason',
        label: 'Motivo de Salida',
        type: 'text',
        placeholder: 'Ej: Venta, Traslado, Muerte',
        suggestions: [
          'Venta en báscula',
          'Venta para cría',
          'Traslado de potrero/finca',
          'Muerte natural / vejez',
          'Muerte por enfermedad',
          'Descarte zootécnico',
          'Sacrificio',
        ],
      },
    ],
  },
  {
    title: 'Transferencia e historial', gridCols: 3,
    fields: [
      {
        name: 'claim_code',
        label: 'Código privado del vendedor (opcional)',
        type: 'text',
        placeholder: 'Ej: VL-ABC123...',
        showIf: (data: any) => !data?.id,
        helperText: 'Si recibió un código al comprar el animal, introdúzcalo para solicitar la asociación del historial.',
      },
      {
        name: 'request_history',
        label: 'Buscar una venta coincidente antes de crear otro animal',
        type: 'checkbox',
        placeholder: 'Solicitar al propietario original compartir el historial',
        showIf: (data: any) => !data?.id,
        helperText: 'La finca de origen recibirá una notificación y decidirá si acepta la transferencia.',
      },
      {
        name: 'official_code',
        label: 'Código oficial ICA/SINIGAN (opcional)',
        type: 'text',
        placeholder: 'Se guardará como pendiente de verificación oficial',
        showIf: (data: any) => !data?.id,
        helperText: 'La consulta automática a la plataforma oficial queda preparada para una futura integración; nunca se marca como verificado por este dato solo.',
      },
      {
        name: 'nfc_uid',
        label: 'UID NFC / arete electrónico (opcional)',
        type: 'text',
        placeholder: 'Identificador leído del dispositivo',
        showIf: (data: any) => !data?.id,
      },
      {
        name: 'lf_tag_code',
        label: 'Código arete LF (opcional)',
        type: 'text',
        placeholder: 'Código del arete de baja frecuencia',
        showIf: (data: any) => !data?.id,
      },
    ],
  },
];
