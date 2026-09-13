import React from 'react';
import { HeartPulse } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { DiseaseFollowupContent } from './DiseaseFollowupContent';

interface DiseaseFollowupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  episodeId?: number | string | null;
  episodeLabel?: string;
  onEpisodeChange?: () => void;
  zIndex?: number;
  enableAnimalLink?: boolean;
}

/**
 * Modal del seguimiento de un episodio de enfermedad. Se abre desde el
 * detalle del animal (tarjetas de enfermedad) para ver y registrar la
 * evolución completa del caso: avances, tratamientos, vacunas, recomendaciones.
 */
export const DiseaseFollowupModal: React.FC<DiseaseFollowupModalProps> = ({
  isOpen,
  onOpenChange,
  episodeId,
  episodeLabel,
  onEpisodeChange,
  zIndex,
  enableAnimalLink = false,
}) => {
  return (
    <GenericModal
      isOpen={isOpen && !!episodeId}
      onOpenChange={onOpenChange}
      title={
        <span className="inline-flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-rose-500" />
          Seguimiento de la enfermedad
        </span>
      }
      subtitle={episodeLabel}
      size="4xl"
      variant="compact"
      allowFullScreenToggle
      enableBackdropBlur
      className="bg-card text-card-foreground border-border shadow-lg max-h-[92vh] overflow-hidden"
      zIndex={zIndex}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {episodeId ? (
          <DiseaseFollowupContent
            episodeId={episodeId}
            onEpisodeChange={onEpisodeChange}
            enableAnimalLink={enableAnimalLink}
          />
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            No hay un episodio seleccionado.
          </div>
        )}
      </div>
    </GenericModal>
  );
};
