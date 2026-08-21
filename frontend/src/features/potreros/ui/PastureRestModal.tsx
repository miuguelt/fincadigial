import React from 'react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { SemaforoPotrerosCard } from './SemaforoPotrerosCard';

interface PastureRestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectField?: (fieldId: number) => void;
}

export const PastureRestModal: React.FC<PastureRestModalProps> = ({
  isOpen,
  onClose,
  onSelectField,
}) => {
  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Semáforo de Reposo y Rebrote de Potreros"
      subtitle="Estado de recuperación biológica y punto óptimo de pastoreo"
      description="Monitorea qué potreros están listos para recibir ganado según el tiempo de descanso zootécnico de cada pastura."
      size="xl"
    >
      <div className="py-2">
        <SemaforoPotrerosCard
          showTitle={false}
          onSelectField={(id) => {
            onSelectField?.(id);
            onClose();
          }}
        />
      </div>
    </GenericModal>
  );
};

export default PastureRestModal;
