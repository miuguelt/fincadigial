import { CloudSun } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Pie del banner: origen del dato y salida al panel de clima completo. */
export function HeroFooter() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
      <p className="text-[11px] text-muted-foreground">
        Clima de Open-Meteo para las coordenadas de la finca.
      </p>
      <Link
        to="/campesino/weather"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
      >
        <CloudSun className="h-4 w-4" aria-hidden="true" />
        Ver clima completo
      </Link>
    </div>
  );
}
