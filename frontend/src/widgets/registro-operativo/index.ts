export { useRegistroOperativo } from './hooks/useRegistroOperativo';
export { AgricultureTab } from './tabs/AgricultureTab';
export { LivestockTab } from './tabs/LivestockTab';
export { HistoryTab } from './tabs/HistoryTab';
export { ResumenOperativo } from './components/ResumenOperativo';
export { RegistroOperativoIntro } from './components/RegistroOperativoIntro';
export { AnimalSelect, animalLabel } from './components/AnimalSelect';
export { CropActivityModal } from './modals/CropActivityModal';
export { MilkModal } from './modals/MilkModal';
export { TransferModal } from './modals/TransferModal';
export { DiseaseModal } from './modals/DiseaseModal';
export { TreatmentModal } from './modals/TreatmentModal';
export { FinanceModal } from './modals/FinanceModal';
export { ControlModal } from './modals/ControlModal';
export { CorralRapidoModal } from './modals/CorralRapidoModal';
export { AnimalExitModal } from '@/widgets/animals/AnimalExitModal';
export {
  ACTIVITY_TYPES, getActivityCfg,
  CATEGORIAS_INGRESO, CATEGORIAS_GASTO, getFinanceCategories,
  TREATMENT_FREQUENCIES, HEALTH_STATUS_OPTIONS, DISEASE_STATUS_OPTIONS,
} from './constants';
export type {
  CropFormData, MilkFormData, TransferFormData,
  DiseaseFormData, TreatmentFormData, ActivityConfig, HistoryRecord,
  FinanceFormData, ControlFormData
} from './types';
