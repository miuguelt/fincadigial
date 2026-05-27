import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';

export type ModalType =
  | 'genetic_improvement'
  | 'animal_disease'
  | 'animal_field'
  | 'vaccination'
  | 'treatment'
  | 'control'
  | 'milk_production'
  | 'reproduction_event'
  | 'alert'
  | 'task'
  | 'report'
  | null;

export type ModalMode = 'create' | 'list' | 'view' | 'edit';

export interface ModalState {
  id: string;
  type: ModalType;
  mode: ModalMode;
  editingItem: any | null;
}

export interface AnimalActionsMenuProps {
  animal: AnimalResponse;
  currentUserId?: number;
  onOpenHistory?: () => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
  onRefresh?: (type?: string) => void;
  externalOpenModal?: ModalType;
  externalModalMode?: ModalMode;
  externalEditingItem?: any;
  onModalClose?: () => void;
  onEditAnimal?: () => void;
  onDeleteAnimal?: () => void;
  className?: string;
}

export interface AnimalActionModalInstanceProps {
  type: ModalType;
  mode: ModalMode;
  animal: AnimalResponse;
  currentUserId?: number;
  editingItem: any | null;
  zIndex: number;
  onClose: () => void;
  onRefreshParent?: (type?: string) => void;
  diseaseOptions: any[];
  fieldOptions: any[];
  vaccineOptions: any[];
  userOptions: any[];
  loadOptions: () => void;
}
