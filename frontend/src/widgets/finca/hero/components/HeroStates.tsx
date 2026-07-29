import { CloudOff, MapPinOff, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/ui/cn';

/** Esqueleto mientras llegan la ficha de la finca y la lectura del clima. */
export function HeroSkeleton() {
  return (
    <section className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="h-6 w-52 rounded-lg bg-muted" />
      <div className="mt-3 h-4 w-40 rounded-lg bg-muted" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </section>
  );
}

/** La finca no tiene coordenadas: sin ellas Open-Meteo no puede responder. */
export function MissingCoordinates({ fincaName }: { fincaName: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40 sm:flex-row sm:items-center">
      <MapPinOff className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
          Falta la ubicación de {fincaName}
        </p>
        <p className="text-xs leading-snug text-amber-800/90 dark:text-amber-200/80">
          Marca las coordenadas de la finca para ver lluvia, viento y alertas de tu vereda.
        </p>
      </div>
      <Link
        to="/campesino/weather"
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700"
      >
        Configurar ubicación
      </Link>
    </div>
  );
}

interface NoReadingProps {
  refreshing: boolean;
  onRefresh: () => void;
  failed: boolean;
}

/** Hay coordenadas pero todavía no se ha guardado ninguna lectura. */
export function MissingReading({ refreshing, onRefresh, failed }: NoReadingProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:flex-row sm:items-center">
      <CloudOff className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">
          {failed ? 'No se pudo leer el clima' : 'Aún no hay lecturas del clima'}
        </p>
        <p className="text-xs leading-snug text-muted-foreground">
          Toca actualizar para pedir los datos del momento a Open-Meteo.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        <RefreshCcw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        Actualizar clima
      </button>
    </div>
  );
}
