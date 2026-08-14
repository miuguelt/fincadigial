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
    <DialogHeader className="space-y-0 border-b border-border/70 bg-card px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start gap-4 pr-8">
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
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant: ConfirmVariant;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogFooter className="mt-5 gap-2 border-t border-border/70 px-5 py-4 sm:mt-6 sm:flex-row sm:px-6 sm:py-5">
      <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="button" variant={confirmVariant} size="lg" className="w-full sm:w-auto" onClick={onConfirm}>
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
}: ConfirmDialogProps) {
  const intentIcon = icon ?? (showWarningIcon ? <AlertTriangle className="h-6 w-6" aria-hidden="true" /> : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border-border/80 bg-card p-0 text-card-foreground',
          'shadow-[0_24px_70px_hsl(223_47%_11%_/_0.25),0_8px_24px_hsl(223_47%_11%_/_0.12)]',
          sizeClasses[size],
        )}
      >
        <ConfirmDialogHeader title={title} description={description} intentIcon={intentIcon} />
        {detailedMessage && (
          <div className="mx-5 mt-5 max-h-[45dvh] overflow-y-auto overscroll-contain whitespace-pre-line break-words rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm leading-5 text-muted-foreground sm:mx-6">
            {detailedMessage.replaceAll('**', '')}
          </div>
        )}
        <ConfirmDialogActions
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          confirmVariant={confirmVariant}
          onCancel={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
