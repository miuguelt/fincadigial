import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/ui/cn";

/**
 * ErrorState: bloque de error estilizado y amigable con acción de reintento opcional.
 *
 * @example
 * ```tsx
 * <ErrorState message="No se pudo cargar la información" onRetry={() => refetch()} />
 * ```
 */
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  actionLabel?: string;
}

export function ErrorState({
  title = "Error al cargar información",
  message = "Ocurrió un error inesperado al consultar los datos del servidor.",
  onRetry,
  className,
  actionLabel = "Reintentar",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12",
        "rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
        "w-full max-w-2xl mx-auto my-6 shadow-sm",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mb-4 shadow-sm">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-5 leading-relaxed">
        {message}
      </p>

      {onRetry ? (
        <Button
          variant="outline"
          onClick={onRetry}
          className="border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-foreground font-bold px-5 h-10"
          aria-label={actionLabel}
        >
          <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default ErrorState;
