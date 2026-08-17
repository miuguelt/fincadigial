/**
 * Descarga del libro financiero en Excel y en PDF.
 *
 * Cada formato lleva su propio estado de carga para que pedir uno no bloquee
 * el botón del otro.
 */
import { useCallback, useState } from 'react';
import { apiClient } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';

const fileDate = () => new Date().toISOString().split('T')[0];

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export function useFinancialExports() {
  const { showToast } = useToast();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const download = useCallback(
    async (endpoint: string, filename: string, label: string, setBusy: (busy: boolean) => void) => {
      setBusy(true);
      try {
        const response = await apiClient.get(endpoint, { responseType: 'blob' } as any);
        saveBlob((response as any).data, filename);
        showToast(`${label} descargado`, 'success');
      } catch (err) {
        console.error(err);
        showToast(`No se pudo descargar el ${label.toLowerCase()}`, 'error');
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  return {
    exportingExcel,
    exportingPdf,
    exportExcel: () =>
      download(
        '/exports/financials.xlsx',
        `transacciones_financieras_${fileDate()}.xlsx`,
        'Libro en Excel',
        setExportingExcel,
      ),
    exportPdf: () =>
      download(
        '/exports/financial-report.pdf',
        `reporte_financiero_${fileDate()}.pdf`,
        'Informe en PDF',
        setExportingPdf,
      ),
  };
}
