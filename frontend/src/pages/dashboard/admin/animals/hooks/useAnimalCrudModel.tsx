import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { animalFields, initialFormData, mapResponseToForm, validateForm } from '../config/animals.config';
import { buildAnimalFormSections } from '../config/formSections';
import { buildAnimalColumns } from '../config/columns';
import { buildAnimalCrudConfig } from '../config/crud.config';
import { AnimalsViewSwitcher } from '../components/AnimalsViewSwitcher';
import { renderAnimalCard as renderCardContent, renderAnimalDetail as renderDetailContent } from '../components/AnimalRenderers';
import { createAnimalActions, createAnimalLifecycle, createBatchActions, preDeleteCheck } from '../config/crud.behavior';
import { buildAnimalPageOverlays } from './useAnimalPageOverlays';
import { useAnimalPageRuntime } from './useAnimalPageRuntime';

export function useAnimalCrudModel() {
  const runtime = useAnimalPageRuntime();
  const { breedOptions, fatherOptions, motherOptions } = runtime;
  const { ancestors, descendants, details, user, navigate, showToast } = runtime;
  const openAncestors = ancestors.open;
  const openDescendants = descendants.open;
  const formSections = buildAnimalFormSections({ breedOptions, fatherOptions, motherOptions });
  const columns = buildAnimalColumns({ breedOptions, fatherOptions, motherOptions });
  const rendererOptions = { breedOptions, fatherOptions, motherOptions, onOpenAnimal: details.openAnimal };
  const renderCard = (item: AnimalResponse & { [key: string]: any }) => renderCardContent(item, rendererOptions);
  const renderDetail = (item: AnimalResponse & { [key: string]: any }) => renderDetailContent(item, { ...rendererOptions, currentUserId: user?.id, navigate, onOpenHistory: details.openHistory, onOpenAncestors: openAncestors, onOpenDescendants: openDescendants, showToast });
  const config = buildAnimalCrudConfig({
    columns,
    formSections,
    viewMode: runtime.viewMode,
    defaultFields: animalFields,
    batchActions: createBatchActions({ clearSelectionRef: runtime.clearSelectionRef, selectedIdsRef: runtime.selectedIdsRef, setBulkModal: runtime.setBulkModal, setSelectedAnimals: runtime.setSelectedAnimalsForPrint, showToast }),
    renderCard,
    // Las columnas se calculan sobre el ancho real de la rejilla, no del
    // viewport: con el menú de la finca abierto los breakpoints seguían
    // pidiendo 4-5 columnas y las tarjetas quedaban estranguladas.
    cardGridClassName: '[grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]',
    defaultLimit: 25,
    customToolbar: <AnimalsViewSwitcher />,
    customActions: createAnimalActions(user?.id, details.openHistory, openAncestors, openDescendants),
    preDeleteCheck,
    ...createAnimalLifecycle(runtime.pendingImages, runtime.setPendingImages, runtime.refreshFathers, runtime.refreshMothers),
  });

  return {
    config,
    initialFormData,
    mapResponseToForm,
    validateForm,
    renderDetail,
    onFormDataChange: runtime.setFormData,
    pendingImages: runtime.pendingImages,
    setPendingImages: runtime.setPendingImages,
    overlays: buildAnimalPageOverlays(runtime),
  };
}
