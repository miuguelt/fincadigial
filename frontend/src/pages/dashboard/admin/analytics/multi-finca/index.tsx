/**
 * Vista multi-finca: todo lo que tiene registrado quien administra varias
 * fincas, en un orden que responde preguntas de campo — cuánto tengo en total,
 * cómo va cada finca, y qué pasa con la que estoy mirando.
 *
 * Los números que llegan de `/multi-finca/compare-kpis` son acumulados desde
 * el primer registro, no del mes: eso se dice en pantalla en vez de dejar un
 * total grande sin periodo, que se lee como si fuera plata reciente.
 */
import { Beef, Building2, Milk, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMultiFinca } from '@/features/multi-finca/model/useMultiFinca';
import { EmptyState } from '@/widgets/feedback/EmptyState';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
import { formatCount, formatLiters } from './model/fincaMetrics';
import { useFincaPdf } from './model/useFincaPdf';
import { useMultiFincaReport } from './model/useMultiFincaReport';
import { ConsolidatedSummary } from './ui/ConsolidatedSummary';
import { FincaComparison } from './ui/FincaComparison';
import { FincaDetailPanel } from './ui/FincaDetailPanel';
import { FincaRankingCard } from './ui/FincaRankingCard';
import { MultiFincaHeader } from './ui/MultiFincaHeader';

const PAGE_CLASS = 'min-h-full space-y-6 overflow-x-hidden p-3 sm:p-5 lg:p-8';

const MultiFincaAnalytics = () => {
  const navigate = useNavigate();
  const { switchFinca, switching } = useMultiFinca();
  const report = useMultiFincaReport();
  const pdf = useFincaPdf(report.isOnline);

  const openCreateFinca = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('modal', 'create-finca');
    navigate(`${window.location.pathname}?${params.toString()}`);
  };

  if (report.isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Spinner size="lg" />
        <p className="text-base font-medium text-muted-foreground">Buscando los números de tus fincas…</p>
      </div>
    );
  }

  /* "Sin señal" y "falló el servidor" se arreglan de maneras distintas, así que
     no pueden compartir el mismo mensaje genérico. */
  if (report.hasError) {
    return (
      <div className="mx-auto max-w-md p-6 text-center sm:p-12">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {report.isOnline ? <Building2 className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
        </span>
        <h1 className="mb-2 text-xl font-bold text-foreground">
          {report.isOnline ? 'No pudimos traer los números' : 'No hay internet'}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {report.isOnline
            ? 'El servidor no respondió. Vuelve a intentarlo en un momento.'
            : 'Búscate un punto con señal y vuelve a intentarlo. Lo que registres mientras tanto se guarda en el celular.'}
        </p>
        <Button onClick={report.refetch} loading={report.isFetching} variant="outline" size="lg">
          Reintentar
        </Button>
      </div>
    );
  }

  const header = (
    <MultiFincaHeader
      farmCount={report.totals.farms}
      updatedAt={report.updatedAt}
      isFetching={report.isFetching}
      isOnline={report.isOnline}
      canExport={report.rows.length > 0}
      exporting={pdf.downloadingGeneral}
      onRefresh={report.refetch}
      onCreateFinca={openCreateFinca}
      onExport={pdf.downloadGeneral}
    />
  );

  if (report.rows.length === 0) {
    return (
      <div className={PAGE_CLASS}>
        {header}
        <EmptyState
          icon={<Building2 className="h-10 w-10 text-primary opacity-80" />}
          title="Todavía no hay fincas para comparar"
          description="Cuando registres tu primera finca verás aquí los animales, la leche y la plata de todos tus predios juntos."
          actionLabel="Crear finca"
          onAction={openCreateFinca}
        />
      </div>
    );
  }

  return (
    <div className={PAGE_CLASS}>
      {header}

      <ConsolidatedSummary totals={report.totals} />

      <p className="rounded-xl border border-border bg-muted/60 p-3 text-xs font-medium text-muted-foreground">
        Estos totales son de <strong className="text-foreground">todo lo registrado hasta hoy</strong>, no del mes.
        Para ver un periodo concreto abre el informe de la finca.
      </p>

      <FincaComparison
        rows={report.rows}
        selectedFincaId={report.selectedFincaId}
        onSelect={report.selectFinca}
      />

      {report.selectedFinca && (
        <FincaDetailPanel
          finca={report.selectedFinca}
          activating={switching}
          downloading={pdf.downloadingFinca}
          onActivate={() => switchFinca(report.selectedFinca!.finca_id)}
          onDownload={() => pdf.downloadFinca(report.selectedFinca!.finca_id, report.selectedFinca!.finca_name)}
        />
      )}

      {report.rows.length > 1 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <FincaRankingCard
            title="¿Dónde hay más animales?"
            description="Animales vivos por finca"
            icon={Beef}
            rows={report.rows}
            max={report.maxAnimals}
            selectedFincaId={report.selectedFincaId}
            onSelect={report.selectFinca}
            valueOf={(row) => row.kpis.total_animals}
            formatValue={formatCount}
            accentClassName="text-amber-700 dark:text-amber-400"
            barClassName="bg-amber-500"
          />
          <FincaRankingCard
            title="¿Dónde se ordeña más?"
            description="Litros registrados por finca"
            icon={Milk}
            rows={report.rows}
            max={report.maxMilk}
            selectedFincaId={report.selectedFincaId}
            onSelect={report.selectFinca}
            valueOf={(row) => row.kpis.total_milk_liters}
            formatValue={formatLiters}
            accentClassName="text-sky-700 dark:text-sky-400"
            barClassName="bg-sky-500"
          />
        </div>
      )}
    </div>
  );
};

export default MultiFincaAnalytics;
