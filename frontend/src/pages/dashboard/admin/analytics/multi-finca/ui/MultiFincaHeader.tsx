/**
 * Encabezado de la vista multi-finca.
 *
 * Tres decisiones que vienen de usarlo en el campo:
 *  - En el celular los botones van apilados y a todo el ancho. Repartidos en
 *    fila medían 91 px y el texto se salía de la caja a 320 px.
 *  - "Actualizar" es un botón de verdad con área táctil, no un enlace de 12 px.
 *  - Se avisa cuándo se consultaron los datos y si no hay señal, porque la
 *    consulta no se refresca sola y en el potrero la señal se cae.
 */
import { Building2, FileDown, Plus, RefreshCw, WifiOff } from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';
import { Button } from '@/shared/ui/button';

interface MultiFincaHeaderProps {
  farmCount: number;
  updatedAt: number;
  isFetching: boolean;
  isOnline: boolean;
  canExport: boolean;
  exporting: boolean;
  onRefresh: () => void;
  onCreateFinca: () => void;
  onExport: () => void;
}

const consultedAt = (updatedAt: number) =>
  new Date(updatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export const MultiFincaHeader = ({
  farmCount,
  updatedAt,
  isFetching,
  isOnline,
  canExport,
  exporting,
  onRefresh,
  onCreateFinca,
  onExport,
}: MultiFincaHeaderProps) => (
  <header className="space-y-4 border-b border-border pb-4">
    <div className="flex items-start gap-3">
      <span className="shrink-0 rounded-2xl border border-emerald-600/30 bg-emerald-600/10 p-2.5 text-emerald-700 dark:text-emerald-400">
        <Building2 className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <FitText as="h1" maxLines={2} className="text-2xl font-black leading-tight text-foreground sm:text-3xl">
          Mis fincas
        </FitText>
        <p className="text-sm text-muted-foreground">
          {farmCount === 1
            ? 'Resumen de tu finca: animales, leche, tierra y plata.'
            : `Resumen de tus ${farmCount} fincas juntas: animales, leche, tierra y plata.`}
        </p>
      </div>
    </div>

    {!isOnline && (
      <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-400/15 p-3 text-sm font-medium text-amber-900 dark:text-amber-200">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Estás sin internet. Ves los últimos números que alcanzaron a bajar.</span>
      </p>
    )}

    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {updatedAt > 0 && (
        <p className="text-xs text-muted-foreground">Números consultados a las {consultedAt(updatedAt)}</p>
      )}

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button onClick={onRefresh} loading={isFetching} variant="outline" size="lg" className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Actualizar
        </Button>
        <Button onClick={onCreateFinca} variant="outline" size="lg" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nueva finca
        </Button>
        <Button
          onClick={onExport}
          loading={exporting}
          disabled={!canExport}
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
        >
          <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
          Informe de todas
        </Button>
      </div>
    </div>
  </header>
);

export default MultiFincaHeader;
