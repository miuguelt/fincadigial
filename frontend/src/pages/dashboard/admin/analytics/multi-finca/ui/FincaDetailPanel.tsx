/**
 * Detalle de la finca abierta.
 *
 * Responde en orden lo que se pregunta quien administra: dónde queda, cuántos
 * animales tiene, cuánta tierra y cómo va la plata. Las cifras de dinero se
 * escriben completas pero sin centavos, y el desglose entró/salió está junto
 * al balance para que el número no aparezca sin explicación.
 */
import { Download, MapPin, Tractor, TrendingDown, TrendingUp } from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import {
  averageFieldArea,
  fincaLocation,
  formatArea,
  formatCount,
  formatMoneyExact,
  type FincaRow,
} from '../model/fincaMetrics';

interface FincaDetailPanelProps {
  finca: FincaRow;
  onActivate: () => void;
  onDownload: () => void;
  activating: boolean;
  downloading: boolean;
}

const DataLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
    <FitText as="span" className="min-w-0 text-right text-sm font-semibold text-foreground">
      {value}
    </FitText>
  </div>
);

export const FincaDetailPanel = ({ finca, onActivate, onDownload, activating, downloading }: FincaDetailPanelProps) => {
  const { kpis } = finca;
  const location = fincaLocation(finca);
  const balancePositive = kpis.net_balance >= 0;
  const femalesShare = kpis.total_animals > 0 ? (kpis.total_animals_females / kpis.total_animals) * 100 : 0;
  const malesShare = kpis.total_animals > 0 ? (kpis.total_animals_males / kpis.total_animals) * 100 : 0;

  return (
    <section aria-label={`Detalle de ${finca.finca_name}`} className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border-2 border-primary bg-card p-4 shadow-sm sm:p-5">
        {/* `text-primary` da 2,8:1 sobre la tarjeta blanca; emerald-700 sube a 5,4:1. */}
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Estás viendo
        </p>
        <FitText as="h2" maxLines={2} className="mt-1 text-xl font-black leading-tight text-foreground sm:text-2xl">
          {finca.finca_name}
        </FitText>

        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{location ?? 'Falta registrar el municipio y el departamento'}</span>
        </p>

        <div className="mt-4 divide-y divide-border border-t border-border">
          <DataLine label="Tipo" value={finca.finca_type} />
          <DataLine label="Tu rol" value={finca.role} />
          <DataLine label="Potreros" value={formatCount(kpis.total_fields)} />
          <DataLine label="Tierra" value={formatArea(kpis.total_fields_area)} />
          <DataLine label="Promedio por potrero" value={formatArea(averageFieldArea(kpis))} />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={onActivate} loading={activating} size="lg" className="w-full">
            <Tractor className="mr-2 h-4 w-4" aria-hidden="true" />
            Trabajar en esta finca
          </Button>
          <Button onClick={onDownload} loading={downloading} variant="outline" size="lg" className="w-full">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Descargar informe
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:col-span-2 lg:content-start">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-foreground">Animales vivos</h3>
          <p className="mt-1 text-3xl font-black text-foreground">{formatCount(kpis.total_animals)}</p>

          {kpis.total_animals > 0 ? (
            <>
              <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <span className="h-full bg-pink-500" style={{ width: `${femalesShare}%` }} />
                <span className="h-full bg-sky-600" style={{ width: `${malesShare}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-500" aria-hidden="true" />
                  Hembras: {formatCount(kpis.total_animals_females)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-600" aria-hidden="true" />
                  Machos: {formatCount(kpis.total_animals_males)}
                </span>
              </div>
            </>
          ) : (
            /* Sin animales la barra queda vacía: pintar mitad y mitad sugeriría
               una distribución de sexos que no existe en la base. */
            <p className="mt-2 text-sm text-muted-foreground">Todavía no hay animales vivos registrados.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-foreground">Plata de esta finca</h3>
          <div className="mt-1 flex items-center gap-2">
            <FitText
              as="p"
              minScale={0.6}
              className={cn(
                'min-w-0 flex-1 text-3xl font-black leading-tight',
                balancePositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive',
              )}
            >
              {formatMoneyExact(kpis.net_balance)}
            </FitText>
            {balancePositive ? (
              <TrendingUp className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-6 w-6 shrink-0 text-destructive" aria-hidden="true" />
            )}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            {balancePositive ? 'Entró más de lo que salió' : 'Salió más de lo que entró'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Entró</p>
              <FitText as="p" className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatMoneyExact(kpis.total_income)}
              </FitText>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Salió</p>
              <FitText as="p" className="text-lg font-bold text-destructive">
                {formatMoneyExact(kpis.total_expenses)}
              </FitText>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FincaDetailPanel;
