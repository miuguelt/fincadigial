import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

import type { DeletionErrorInfo } from '@/shared/api/deletion-error';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

interface DeletionBlockedDialogProps {
  info: DeletionErrorInfo | null;
  entityName: string;
  onClose: () => void;
}

const SAMPLES_SHOWN = 3;

/**
 * Explica por qué un registro no se puede eliminar.
 *
 * El motivo no puede vivir en un aviso pasajero: el usuario necesita leer qué
 * registros dependen del dato para poder resolverlo.
 */
export const DeletionBlockedDialog = memo<DeletionBlockedDialogProps>(({ info, entityName, onClose }) => {
  if (!info) return null;

  const encabezado = info.message.split('\n')[0];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border-border/80 bg-card p-0 text-card-foreground sm:max-w-lg">
        <DialogHeader className="space-y-0 border-b border-border/70 bg-card px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-4 pr-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/[0.04]">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="break-words text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
                No se puede eliminar {entityName.toLowerCase()}
              </DialogTitle>
              <DialogDescription className="mt-2 break-words text-sm leading-6 text-muted-foreground sm:text-[15px]">
                {encabezado}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mx-5 mt-5 max-h-[45dvh] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-5 text-muted-foreground sm:mx-6">
          {info.blocking.length === 0 && <p>{info.message}</p>}
          {info.blocking.map((dependency) => (
            <div key={`${dependency.table ?? dependency.label}`}>
              <p className="font-semibold text-foreground">{dependency.label}</p>
              <p>{dependency.message}</p>
              {dependency.samples && dependency.samples.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {dependency.samples.slice(0, SAMPLES_SHOWN).map((sample) => (
                    <li key={String(sample.id)}>{sample.name}</li>
                  ))}
                  {dependency.count !== null && dependency.count > SAMPLES_SHOWN && (
                    <li>y {dependency.count - SAMPLES_SHOWN} más</li>
                  )}
                </ul>
              )}
            </div>
          ))}
          <p className="pt-1 text-xs">
            La base de datos conserva estos vínculos para que la información siga siendo
            consistente. Elimine o reasigne esos registros y vuelva a intentarlo.
          </p>
        </div>

        <DialogFooter className="mt-5 gap-2 border-t border-border/70 px-5 py-4 sm:mt-6 sm:flex-row sm:px-6 sm:py-5">
          <Button type="button" variant="primary" size="lg" className="w-full sm:w-auto" onClick={onClose}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

DeletionBlockedDialog.displayName = 'DeletionBlockedDialog';
