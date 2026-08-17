/**
 * Descarga de los informes en PDF de la vista multi-finca.
 *
 * Se mantiene separado de los datos porque son efectos con su propio estado de
 * carga y sus propios mensajes de error, y porque la pantalla ofrece dos
 * botones distintos (el consolidado y el de una finca) que no deben bloquearse
 * entre sí.
 */
import { useCallback, useState } from 'react';
import { apiClient } from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';

/** Fecha del archivo en formato AAAA-MM-DD, estable para ordenar descargas. */
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

export interface FincaPdfDownloads {
  downloadingGeneral: boolean;
  downloadingFinca: boolean;
  downloadGeneral: () => Promise<void>;
  downloadFinca: (fincaId: number, fincaName: string) => Promise<void>;
}

export function useFincaPdf(isOnline: boolean): FincaPdfDownloads {
  const { showToast } = useToast();
  const [downloadingGeneral, setDownloadingGeneral] = useState(false);
  const [downloadingFinca, setDownloadingFinca] = useState(false);

  const guardOffline = useCallback(() => {
    if (isOnline) return false;
    showToast('Sin internet no se puede armar el PDF. Inténtalo cuando vuelva la señal.', 'error');
    return true;
  }, [isOnline, showToast]);

  const downloadGeneral = useCallback(async () => {
    if (guardOffline()) return;
    setDownloadingGeneral(true);
    try {
      const response = await apiClient.get('/exports/multi-finca-general.pdf', { responseType: 'blob' } as any);
      saveBlob((response as any).data, `reporte_general_multi_finca_${fileDate()}.pdf`);
      showToast('Informe de todas las fincas descargado', 'success');
    } catch (err) {
      console.error(err);
      showToast('No se pudo descargar el informe general', 'error');
    } finally {
      setDownloadingGeneral(false);
    }
  }, [guardOffline, showToast]);

  const downloadFinca = useCallback(
    async (fincaId: number, fincaName: string) => {
      if (guardOffline()) return;
      setDownloadingFinca(true);
      try {
        const response = await apiClient.get(`/exports/finca/${fincaId}/report.pdf`, { responseType: 'blob' } as any);
        saveBlob((response as any).data, `reporte_finca_${fincaName.replace(/\s+/g, '_')}_${fileDate()}.pdf`);
        showToast(`Informe de ${fincaName} descargado`, 'success');
      } catch (err) {
        console.error(err);
        showToast(`No se pudo descargar el informe de ${fincaName}`, 'error');
      } finally {
        setDownloadingFinca(false);
      }
    },
    [guardOffline, showToast],
  );

  return { downloadingGeneral, downloadingFinca, downloadGeneral, downloadFinca };
}
