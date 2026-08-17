import { EmptyState } from '@/widgets/feedback/EmptyState';
import { ErrorState } from '@/widgets/feedback/ErrorState';
import { SkeletonTable } from '@/widgets/feedback/SkeletonTable';

/** Esqueleto con la forma real de la tabla, para que no salte al cargar. */
export const CRUDLoadingState = ({ config }: { config: any }) => (
  <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg overflow-hidden">
    <SkeletonTable
      columnLabels={config.columns.map((c: any) => c.label)}
      columnWidths={config.columns.map((c: any) => c.width)}
      rows={8}
    />
  </div>
);

/**
 * Sin datos y sin red no es un error: es que nunca se precargó nada en este
 * dispositivo. Se distingue del fallo real porque la acción a tomar es otra.
 */
export const CRUDErrorState = ({
  isOffline,
  error,
  onRetry,
}: {
  isOffline: boolean;
  error: unknown;
  onRetry: () => void;
}) =>
  isOffline ? (
    <EmptyState
      title="Sin conexión al servidor"
      description="Actualmente no hay señal de internet y no se encontraron registros previos guardados en este dispositivo. Conéctese una vez para precargar la base de datos de la finca."
      action={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          Reintentar conexión
        </button>
      }
    />
  ) : (
    <ErrorState message={String(error)} onRetry={onRetry} />
  );

/** Aviso permanente mientras se trabaja con datos locales. */
export const CRUDOfflineBanner = () => (
  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm rounded-lg shadow-sm animate-in fade-in duration-300">
    <div className="flex items-center gap-2.5">
      <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
      <span>
        <strong>Modo de campo (Sin internet):</strong> Operando con datos guardados localmente. Los registros nuevos o modificaciones se guardarán en este dispositivo y se sincronizarán al recuperar cobertura.
      </span>
    </div>
  </div>
);
