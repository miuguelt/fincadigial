import { apiFetch } from '@/shared/api/apiFetch';

class RegulatoryReportsService {
  private base = 'regulatory-reports';

  /**
   * Descarga el reporte de inventario en formato CSV o PDF
   */
  async downloadInventoryReport(format: 'csv' | 'pdf' = 'csv'): Promise<void> {
    try {
      const response = await apiFetch({
        url: `${this.base}/inventory`,
        method: 'GET',
        params: { format },
        responseType: 'blob'
      });

      this.downloadFile((response as any).data, `reporte_inventario_ica.${format}`);
    } catch (error) {
      console.error(`Error downloading inventory ${format} report:`, error);
      throw error;
    }
  }

  /**
   * Alias para mantener compatibilidad con componentes existentes
   */
  async downloadInventoryReportPDF(): Promise<void> {
    return this.downloadInventoryReport('pdf');
  }

  /**
   * Descarga el reporte de movimientos en formato CSV o PDF
   */
  async downloadMovementsReport(startDate?: string, endDate?: string, format: 'csv' | 'pdf' = 'csv'): Promise<void> {
    try {
      const response = await apiFetch({
        url: `${this.base}/movements`,
        method: 'GET',
        params: {
          date_from: startDate,
          date_to: endDate,
          format
        },
        responseType: 'blob'
      });

      this.downloadFile((response as any).data, `reporte_movimientos_ica.${format}`);
    } catch (error) {
      console.error(`Error downloading movements ${format} report:`, error);
      throw error;
    }
  }

  /**
   * Alias para mantener compatibilidad
   */
  async downloadMovementsReportPDF(startDate?: string, endDate?: string): Promise<void> {
    return this.downloadMovementsReport(startDate, endDate, 'pdf');
  }

  /**
   * Descarga el reporte de sanidad en formato CSV o PDF
   */
  async downloadHealthReport(startDate?: string, endDate?: string, format: 'csv' | 'pdf' = 'csv'): Promise<void> {
    try {
      const response = await apiFetch({
        url: `${this.base}/health`,
        method: 'GET',
        params: {
          date_from: startDate,
          date_to: endDate,
          format
        },
        responseType: 'blob'
      });

      this.downloadFile((response as any).data, `reporte_sanidad_ica.${format}`);
    } catch (error) {
      console.error(`Error downloading health ${format} report:`, error);
      throw error;
    }
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(new Blob([blob], { type: blob.type }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const regulatoryReportsService = new RegulatoryReportsService();
