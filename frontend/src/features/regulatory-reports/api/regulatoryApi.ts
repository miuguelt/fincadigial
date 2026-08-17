import { apiClient } from '@/shared/api/client';

export type ReportFormat = 'json' | 'csv' | 'pdf';
export type ReportType = 'inventory' | 'movements' | 'health';

export interface ReportParams {
  date_from?: string;
  date_to?: string;
  format?: ReportFormat;
  type?: string;
  species?: string;
}

export const regulatoryApi = {
  getInventory: (params: ReportParams) =>
    apiClient.get('/api/v1/regulatory-reports/inventory', { params }),

  getMovements: (params: ReportParams) =>
    apiClient.get('/api/v1/regulatory-reports/movements', { params }),

  getHealth: (params: ReportParams) =>
    apiClient.get('/api/v1/regulatory-reports/health', { params }),

  getFormats: () =>
    apiClient.get('/api/v1/regulatory-reports/formats'),

  downloadReport: async (reportType: ReportType, params: ReportParams) => {
    const format = params.format || 'csv';
    const response = await apiClient.get(`/api/v1/regulatory-reports/${reportType}`, {
      params: { ...params, format },
      responseType: 'blob'
    });

    // Crear link de descarga
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `reporte_${reportType}_${date}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
