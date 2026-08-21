import { AnimalDetailModal, type AnimalDetailModalProps } from './AnimalDetailModal';

export type AnimalModalProps = AnimalDetailModalProps;

/**
 * Modal universal estandarizado para animales en Villaluz.
 * Re-exporta el componente canónico `AnimalDetailModal`.
 */
export function AnimalModal(props: AnimalModalProps) {
  return <AnimalDetailModal {...props} />;
}

export default AnimalModal;
