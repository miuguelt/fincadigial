import { Milk, Scale, Stethoscope } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { ControlEntryFormWidget } from '@/widgets/control';
import { MilkEntryFormWidget } from '@/widgets/milk';

/** Qué formulario rápido está abierto; null cuando no hay ninguno. */
export type ControlEntryModal = 'milk' | 'weight' | 'health' | null;

interface ControlEntryModalsProps {
  active: ControlEntryModal;
  /** Animal preseleccionado cuando la revisión se abrió desde una alerta. */
  healthAnimalId?: number;
  onClose: () => void;
  onMilkSaved: () => void;
  onControlSaved: () => void;
}

const BODY_CLASS =
  'flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-0 pt-3 sm:px-5 sm:pt-4';

/** Los tres formularios cortos del registro diario. */
export function ControlEntryModals({
  active,
  healthAnimalId,
  onClose,
  onMilkSaved,
  onControlSaved,
}: ControlEntryModalsProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <>
      <GenericModal
        isOpen={active === 'weight'}
        onOpenChange={handleOpenChange}
        title="Registrar peso"
        subtitle="Animal, peso y cómo se veía"
        description="Formulario corto para registrar el pesaje de un animal."
        icon={<Scale className="h-4 w-4 text-white" aria-hidden="true" />}
        themeColor="amber"
        size="md"
        variant="compact"
        bodyClassName={BODY_CLASS}
        enableBackdropBlur
      >
        <ControlEntryFormWidget mode="weight" onSuccess={onControlSaved} onCancel={onClose} />
      </GenericModal>

      <GenericModal
        isOpen={active === 'milk'}
        onOpenChange={handleOpenChange}
        title="Registrar ordeño"
        subtitle="Vaca, litros y turno"
        description="Formulario para registrar la producción de leche del día."
        icon={<Milk className="h-4 w-4 text-white" aria-hidden="true" />}
        themeColor="blue"
        size="md"
        variant="compact"
        bodyClassName={BODY_CLASS}
        enableBackdropBlur
      >
        <MilkEntryFormWidget onSuccess={onMilkSaved} onCancel={onClose} />
      </GenericModal>

      <GenericModal
        isOpen={active === 'health'}
        onOpenChange={handleOpenChange}
        title="Reportar novedad de salud"
        subtitle="Animal, estado y observación"
        description="Formulario corto para reportar síntomas o cambios de salud."
        icon={<Stethoscope className="h-4 w-4 text-white" aria-hidden="true" />}
        themeColor="emerald"
        size="md"
        variant="compact"
        bodyClassName={BODY_CLASS}
        enableBackdropBlur
      >
        {/* La clave remonta el formulario al cambiar de animal: si no, react-hook-form
            conserva los valores por defecto del animal anterior. */}
        <ControlEntryFormWidget
          key={healthAnimalId ?? 'sin-animal'}
          mode="health"
          defaultAnimalId={healthAnimalId}
          onSuccess={onControlSaved}
          onCancel={onClose}
        />
      </GenericModal>
    </>
  );
}
