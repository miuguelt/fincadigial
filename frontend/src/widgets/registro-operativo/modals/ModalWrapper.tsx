import { GenericModal } from '@/shared/ui/common/GenericModal';

interface ModalWrapperProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModalWrapper({ open, onClose, title, children }: ModalWrapperProps) {
  return (
    <GenericModal
      isOpen={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
      title={title}
      size="md"
      enableBackdropBlur
    >
      <div className="space-y-4 pt-2 pb-4">
        {children}
      </div>
    </GenericModal>
  );
}
