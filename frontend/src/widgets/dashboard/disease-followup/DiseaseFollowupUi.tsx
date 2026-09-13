import React from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

export const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50';
export const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1';

export function EmptyList({ message }: { message: string }) {
  return (
    <div className="text-center py-6 text-muted-foreground text-xs italic">
      {message}
    </div>
  );
}

interface SectionCardProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({ title, actions, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 dark:bg-card/40 p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
          {title}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function InlineForm({
  onSubmit,
  onCancel,
  saving,
  title,
  children,
}: {
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-background/60 dark:bg-card/60 p-3 space-y-2.5">
      <div className="text-xs font-bold text-primary">{title}</div>
      {children}
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={onCancel}
          className="h-8 rounded-lg text-xs font-semibold"
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="h-8 rounded-lg text-xs font-bold"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

export function statusBadge(status: string | undefined) {
  if (!status) return null;
  const resolved = ['Recuperado', 'Tratado', 'Curado'].includes(status);
  const critical = ['Crónico'].includes(status);
  return (
    <Badge
      variant={resolved ? 'default' : critical ? 'destructive' : 'secondary'}
      className={cn('text-[11px] h-4.5', resolved && 'bg-emerald-600 text-white')}
    >
      {status}
    </Badge>
  );
}

export function PlusButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      size="sm"
      type="button"
      onClick={onClick}
      className="h-8 px-3 rounded-lg text-xs font-bold gap-1"
    >
      <Plus className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Añadir</span>
    </Button>
  );
}
