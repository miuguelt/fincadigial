/**
 * Datos de la vista multi-finca: una consulta, las filas normalizadas y la
 * finca que el usuario tiene abierta.
 *
 * La consulta no se refresca sola. Se expone `updatedAt` para que la pantalla
 * diga de cuándo son los números en lugar de aparentar que están al segundo,
 * y `isOnline` para poder distinguir "se cayó el servidor" de "me quedé sin
 * señal en el potrero", que en el campo es el caso frecuente.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/api/client';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { consolidate, normalizeFincaRows, type FincaRow } from './fincaMetrics';

export interface MultiFincaReport {
  rows: FincaRow[];
  totals: ReturnType<typeof consolidate>;
  selectedFinca: FincaRow | null;
  selectedFincaId: number | null;
  selectFinca: (fincaId: number) => void;
  maxAnimals: number;
  maxMilk: number;
  isLoading: boolean;
  isFetching: boolean;
  isOnline: boolean;
  hasError: boolean;
  updatedAt: number;
  refetch: () => void;
}

export function useMultiFincaReport(): MultiFincaReport {
  const [selectedFincaId, setSelectedFincaId] = useState<number | null>(null);
  const { isOnline } = useOnlineStatus();

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery<unknown>({
    queryKey: ['multi_finca_compare'],
    queryFn: async () => unwrapApi(await apiFetch({ url: '/multi-finca/compare-kpis' } as any)),
  });

  const rows = useMemo(() => normalizeFincaRows(data), [data]);
  const totals = useMemo(() => consolidate(rows), [rows]);

  useEffect(() => {
    if (rows.length > 0 && selectedFincaId === null) setSelectedFincaId(rows[0].finca_id);
  }, [rows, selectedFincaId]);

  const maxAnimals = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.kpis.total_animals), 0),
    [rows],
  );
  const maxMilk = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.kpis.total_milk_liters), 0),
    [rows],
  );

  return {
    rows,
    totals,
    selectedFinca: rows.find((row) => row.finca_id === selectedFincaId) ?? null,
    selectedFincaId,
    selectFinca: setSelectedFincaId,
    maxAnimals,
    maxMilk,
    isLoading,
    isFetching,
    isOnline,
    hasError: Boolean(error) || (!isLoading && !Array.isArray(data)),
    updatedAt: dataUpdatedAt,
    refetch,
  };
}
