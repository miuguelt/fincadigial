import type { AnimalInput, AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';

export type AnimalRecord = AnimalResponse & { [key: string]: any };
export type AnimalCrudConfig = CRUDConfig<AnimalRecord, Partial<AnimalInput>>;
export type AnimalCrudOverrides = Pick<AnimalCrudConfig, 'viewMode' | 'columns' | 'formSections' | 'batchActions' | 'renderCard' | 'cardGridClassName' | 'defaultLimit' | 'defaultFields' | 'customToolbar' | 'toolbarPlacement' | 'customActions' | 'preDeleteCheck' | 'onAfterCreate' | 'onAfterUpdate'>;

export const buildAnimalCrudConfig = (overrides: AnimalCrudOverrides): AnimalCrudConfig => ({
  title: 'Animales',
  entityName: 'Animal',
  searchPlaceholder: 'Buscar animales...',
  emptyStateMessage: 'Aún no hay animales en tu finca',
  emptyStateDescription: 'Empieza creando tu primer animal: un arete, una raza y una fecha de nacimiento, y la app lleva el resto del historial.',
  emptyStateIcon: 'IconCow',
  enableDetailModal: false,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
  enableSelection: true,
  ...overrides,
});
