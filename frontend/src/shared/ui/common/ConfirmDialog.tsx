import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmVariant?: 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  detailedMessage?: string;
  showWarningIcon?: boolean;
  icon?: ReactNode;
  /** Impide confirmar cuando ya se sabe que la acción no es posible. */
  confirmDisabled?: boolean;
}

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-xl',
  icon: 'sm:max-w-md',
} as const;

type ConfirmVariant = NonNullable<ConfirmDialogProps['confirmVariant']>;

function ConfirmDialogHeader({
  title,
  description,
  intentIcon,
}: Pick<ConfirmDialogProps, 'title' | 'description'> & { intentIcon: ReactNode }) {
  return (
    <DialogHeader className="pr-9 sm:pr-10 text-left">
      <div className="flex items-start gap-4">
        {intentIcon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/[0.04]">
            {intentIcon}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <DialogTitle className="break-words text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2 break-words text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {description}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}

function ConfirmDialogActions({
  confirmLabel,
  cancelLabel,
  confirmVariant,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: ConfirmVariant;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogFooter className="gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full sm:w-auto"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={confirmVariant}
        size="lg"
        className="w-full sm:w-auto"
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        disabled={confirmDisabled}
      >
        {confirmVariant === 'destructive' && <Trash2 className="h-4 w-4" aria-hidden="true" />}
        {confirmLabel}
      </Button>
    </DialogFooter>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  confirmVariant = 'primary',
  size = 'sm',
  detailedMessage,
  showWarningIcon = confirmVariant === 'destructive',
  icon,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const intentIcon = icon ?? (showWarningIcon ? <AlertTriangle className="h-6 w-6" aria-hidden="true" /> : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-6 max-h-[90dvh]',
          sizeClasses[size],
        )}
      >
        <ConfirmDialogHeader title={title} description={description} intentIcon={intentIcon} />
        {detailedMessage && (
          <div className="max-h-[45dvh] overflow-y-auto overscroll-contain whitespace-pre-line break-words rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-5 text-muted-foreground">
            {detailedMessage.replaceAll('**', '')}
          </div>
        )}
        <ConfirmDialogActions
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          confirmVariant={confirmVariant}
          confirmDisabled={confirmDisabled}
          onCancel={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
