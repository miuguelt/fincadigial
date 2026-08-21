import { useEffect, useState } from 'react';
import { milkService } from '@/entities/milk/api/milk.service';
import { buildMilkReport, type MilkReport } from './milkReport';
import type { PeriodRange } from './reportPeriod';



/**
 * Trae el desglose diario de ordeño del periodo. La semana usa el resumen
 * semanal anclado al primer día del rango; el mes usa el resumen mensual y se
 * recorta a los días ya transcurridos dentro de buildMilkReport.
 */
export function useMilkPeriodReport(
  fincaId: number,
  range: PeriodRange,
  reloadToken = 0,
): { report: MilkReport; loading: boolean } {
  const [report, setReport] = useState<MilkReport>(() => buildMilkReport(null, range));
  const [loading, setLoading] = useState(true);
  // Se depende de los campos, no del objeto: así el efecto no se vuelve a
  // disparar si quien llama construye un rango nuevo en cada render.
  const { period, start, end, label } = range;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const currentRange: PeriodRange = { period, start, end, label };

    const fetchSummary = () => {
      if (period === 'mes') {
        const [year, month] = start.split('-').map(Number);
        return milkService.getMonthlySummary(fincaId, year, month);
      }
      return milkService.getWeeklySummary(fincaId, start);
    };

    fetchSummary()
      .then((raw) => {
        if (mounted) setReport(buildMilkReport(raw, currentRange));
      })
      .catch(() => {
        if (mounted) setReport(buildMilkReport(null, currentRange));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fincaId, period, start, end, label, reloadToken]);

  return { report, loading };
}
