import { Baby } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';
import { ReproductionBatchModal } from '@/widgets/reproduction/ReproductionBatchModal';
import { ReproductiveEventQuickModal, type EventTypeOption } from '@/widgets/reproduction/ReproductiveEventQuickModal';
import AssistedCalvingForm from '@/widgets/reproduction/AssistedCalvingForm';

interface ReproductionHubModalsProps {
  isCalvingModalOpen: boolean;
  setIsCalvingModalOpen: (open: boolean) => void;
  isBatchModalOpen: boolean;
  setIsBatchModalOpen: (open: boolean) => void;
  isQuickEventModalOpen: boolean;
  setIsQuickEventModalOpen: (open: boolean) => void;
  quickEventAnimalId: number | null;
  quickEventAnimalRecord: string | null;
  quickEventDefaultType: EventTypeOption;
  handleDataRefresh: () => void;
  selectedAnimalId: number | null;
  setSelectedAnimalId: (id: number | null) => void;
}

export function ReproductionHubModals({
  isCalvingModalOpen, setIsCalvingModalOpen, isBatchModalOpen, setIsBatchModalOpen, isQuickEventModalOpen,
  setIsQuickEventModalOpen, quickEventAnimalId, quickEventAnimalRecord, quickEventDefaultType, handleDataRefresh,
  selectedAnimalId, setSelectedAnimalId,
}: ReproductionHubModalsProps) {
  return (
    <>
      {/* Modal: Parto Asistido */}
      <Dialog open={isCalvingModalOpen} onOpenChange={setIsCalvingModalOpen}>
        <DialogContent
          fullWidth
          className="assisted-calving-dialog flex max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[1180px] flex-col gap-0 overflow-hidden rounded-2xl border border-border p-0 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
        >
          <DialogHeader className="shrink-0 border-b border-border bg-card p-4 pb-3 pr-14 text-left text-foreground sm:p-5 sm:pr-16 lg:px-6 lg:py-5">
            <DialogTitle className="flex items-start gap-2 text-lg font-bold leading-tight text-foreground sm:items-center sm:text-xl">
              <Baby className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
              Registrar Parto Asistido & Cría
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
              Protocolo veterinario post-parto, atención del neonato y alta en inventario
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6">
            <AssistedCalvingForm
              onComplete={() => {
                setIsCalvingModalOpen(false);
                handleDataRefresh();
              }}
              onCancel={() => setIsCalvingModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Registro Masivo por Lote */}
      <ReproductionBatchModal
        isOpen={isBatchModalOpen}
        onOpenChange={setIsBatchModalOpen}
        onSuccess={() => handleDataRefresh()}
      />

      {/* Modal Rápido de Novedad Reproductiva */}
      <ReproductiveEventQuickModal
        isOpen={isQuickEventModalOpen}
        onOpenChange={setIsQuickEventModalOpen}
        defaultAnimalId={quickEventAnimalId}
        defaultAnimalRecord={quickEventAnimalRecord}
        defaultEventType={quickEventDefaultType}
        onSuccess={() => handleDataRefresh()}
      />

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </>
  );
}
