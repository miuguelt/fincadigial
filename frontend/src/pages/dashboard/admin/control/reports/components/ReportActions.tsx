import { ClipboardCheck, Download } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { buildReportCsv, buildReportText, type ReportSnapshot } from '../reportExport';

interface ReportActionsProps {
  snapshot: ReportSnapshot;
}

/** Copiar el resumen sirve en el celular; el CSV, en el computador. */
export function ReportActions({ snapshot }: ReportActionsProps) {
  const { showToast } = useToast();

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
    const blob = new Blob([`﻿${buildReportCsv(snapshot)}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordeno-${snapshot.range.start}-a-${snapshot.range.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-2 min-[420px]:grid-cols-2">
      <button
        type="button"
        onClick={copySummary}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
      >
        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        Copiar resumen
      </button>
      <button
        type="button"
        onClick={downloadCsv}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Descargar ordeño (CSV)
      </button>
    </div>
  );
}
