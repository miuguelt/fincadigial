import { useState } from 'react';
import { ClipboardCheck, Download, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { buildReportCsv, buildReportText, exportPeriodReportPdf, type ReportSnapshot } from '../reportExport';

interface ReportActionsProps {
  snapshot: ReportSnapshot;
}

/** Acciones de exportación: Copiar texto para chat, CSV para Excel y PDF formal de alta calidad. */
export function ReportActions({ snapshot }: ReportActionsProps) {
  const { showToast } = useToast();
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const copySummary = async () => {
    const text = buildReportText(snapshot);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Resumen copiado. Pégalo donde lo necesites.', 'success');
    } catch {
      showToast('El navegador no permitió copiar el resumen.', 'error');
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([`\ufeff${buildReportCsv(snapshot)}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordeno-${snapshot.range.start}-a-${snapshot.range.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Archivo CSV descargado exitosamente.', 'success');
  };

  const downloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      await exportPeriodReportPdf(snapshot, 'Hacienda Villa Luz');
      showToast('Reporte ejecutivo PDF generado exitosamente.', 'success');
    } catch (err) {
      console.error('Error generando PDF de control:', err);
      showToast('No se pudo generar el reporte PDF.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <button
        type="button"
        onClick={copySummary}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-4 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        Copiar resumen
      </button>
      <button
        type="button"
        onClick={downloadCsv}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-4 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Download className="h-4 w-4 text-primary" aria-hidden="true" />
        Descargar ordeño (CSV)
      </button>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={generatingPdf}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-600/30 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 shadow-sm transition-all hover:bg-emerald-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
      >
        {generatingPdf ? (
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden="true" />
        ) : (
          <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        )}
        Descargar informe (PDF)
      </button>
    </div>
  );
}
