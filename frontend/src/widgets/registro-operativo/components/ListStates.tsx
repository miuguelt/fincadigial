import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';

/** Esqueletos de carga, estados vacío y de error compartidos entre pestañas. */
export function ListSkeleton({ rows = 3, className = 'h-16' }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`rounded-lg bg-muted animate-pulse ${className}`} />
      ))}
    </div>
  );
}

export function ListEmpty({
  emoji,
  title,
  hint,
  children,
}: {
  emoji: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="text-center py-14 space-y-2.5">
      <span className="text-5xl select-none" aria-hidden="true">{emoji}</span>
      <p className="text-muted-foreground font-medium">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export function ListError({ onRetry, title, hint }: { onRetry?: () => void; title?: string; hint?: string }) {
  return (
    <div className="text-center py-14 space-y-2.5" role="alert">
      <span className="text-5xl select-none" aria-hidden="true">⚠️</span>
      <p className="text-muted-foreground font-medium">{title ?? 'No se pudieron cargar los datos'}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry} className="mx-auto mt-1 gap-2">
          <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reintentar
        </Button>
      )}
    </div>
  );
}
