import type { MilkDailyPoint } from '../milkReport';
import { formatDayShort, formatNumber } from '../reportExport';

interface MilkTrendChartProps {
  points: MilkDailyPoint[];
  /** Se resalta para que el operario ubique el mejor día sin leer números. */
  bestDate?: string;
}

const WEEKDAY = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];

/** Inicial del día de la semana, calculada en UTC para no correrse de fecha. */
function weekdayInitial(dateOnly: string): string {
  const ms = Date.parse(`${dateOnly}T00:00:00Z`);
  return Number.isNaN(ms) ? '' : WEEKDAY[new Date(ms).getUTCDay()];
}

/**
 * Barras de litros por día. Las barras se reparten el ancho disponible en vez
 * de desbordar: en un celular de 320 px con 31 días siguen siendo legibles.
 */
export function MilkTrendChart({ points, bestDate }: MilkTrendChartProps) {
  const maxLiters = points.reduce((max, point) => Math.max(max, point.liters), 0);
  const dense = points.length > 10;

  if (maxLiters === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Todavía no hay ordeños registrados en este periodo.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <div
        className="flex h-32 items-end gap-[3px] sm:h-40"
        role="img"
        aria-label={`Litros por día del ${formatDayShort(points[0]?.date ?? '')} al ${formatDayShort(points[points.length - 1]?.date ?? '')}. Máximo ${formatNumber(maxLiters)} litros.`}
      >
        {points.map((point) => {
          const height = maxLiters ? Math.max((point.liters / maxLiters) * 100, 2) : 2;
          const isBest = point.date === bestDate && point.liters > 0;
          return (
            <div
              key={point.date}
              title={`${formatDayShort(point.date)}: ${formatNumber(point.liters)} L`}
              className={`min-w-[4px] flex-1 rounded-t transition-colors ${
                point.liters === 0
                  ? 'bg-muted'
                  : isBest
                    ? 'bg-emerald-600 dark:bg-emerald-400'
                    : 'bg-blue-600/80 dark:bg-blue-400/80'
              }`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
        <span>{formatDayShort(points[0]?.date ?? '')}</span>
        {!dense && (
          <span className="flex flex-1 justify-around" aria-hidden="true">
            {points.map((point) => (
              <span key={point.date}>{weekdayInitial(point.date)}</span>
            ))}
          </span>
        )}
        <span>{formatDayShort(points[points.length - 1]?.date ?? '')}</span>
      </div>

      <figcaption className="mt-1 text-xs text-muted-foreground">
        Cada barra es un día. Las grises son días sin ordeño registrado.
      </figcaption>
    </figure>
  );
}
