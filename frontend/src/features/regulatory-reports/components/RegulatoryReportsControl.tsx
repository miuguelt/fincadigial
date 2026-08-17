import React, { useState } from 'react';
import {  FileSpreadsheet, Calendar, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { regulatoryReportsService } from '../api/regulatoryReports.service';
import { useToast } from '@/app/providers/ToastContext';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export const RegulatoryReportsControl: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(getTodayColombia());

  const handleDownloadInventory = async (format: 'csv' | 'pdf' = 'csv') => {
    setLoading(`inventory-${format}`);
    try {
      await regulatoryReportsService.downloadInventoryReport(format);
      showToast(`Reporte de inventario ${format.toUpperCase()} descargado correctamente`, 'success');
    } catch (error: any) {
      showToast(`Error al descargar reporte de inventario ${format.toUpperCase()}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadMovements = async (format: 'csv' | 'pdf' = 'csv') => {
    setLoading(`movements-${format}`);
    try {
      await regulatoryReportsService.downloadMovementsReport(startDate, endDate, format);
      showToast(`Reporte de movimientos ${format.toUpperCase()} descargado correctamente`, 'success');
    } catch (error: any) {
      showToast(`Error al descargar reporte de movimientos ${format.toUpperCase()}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden mb-6">
      <div className="bg-muted/30 p-5 border-b border-border/50">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="bg-primary/10 p-2 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Reportes Regulatorios (ICA / SENA)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Generación de archivos CSV y PDF compatibles con los formatos oficiales de trazabilidad.
        </p>
      </div>

      <div className="p-5 space-y-6 bg-background/50">
        {/* Inventario */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-5 rounded-xl bg-card shadow-sm border border-border/60 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex-shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Inventario de Existencias</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Listado completo de animales activos con datos de registro ICA.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleDownloadInventory('csv')}
              disabled={loading !== null}
              className="flex-1 sm:flex-none gap-2"
              variant="primary"
            >
              {loading === 'inventory-csv' ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              CSV
            </Button>
            <Button
              onClick={() => handleDownloadInventory('pdf')}
              disabled={loading !== null}
              className="flex-1 sm:flex-none gap-2"
              variant="outline"
            >
              {loading === 'inventory-pdf' ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {/* Movimientos */}
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-card shadow-sm border border-border/60 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-info/10 p-3 rounded-xl border border-info/20 flex-shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-info" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Registro de Movimientos</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Ingresos, egresos, compras y ventas por rango de fechas.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-muted/20 p-4 rounded-lg border border-border/50">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border/80 shadow-sm rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-shadow"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-background border border-border/80 shadow-sm rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              onClick={() => handleDownloadMovements('csv')}
              disabled={loading !== null}
              className="flex-1 gap-2"
              variant="primary"
            >
              {loading === 'movements-csv' ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              CSV
            </Button>
            <Button
              onClick={() => handleDownloadMovements('pdf')}
              disabled={loading !== null}
              className="flex-1 gap-2"
              variant="outline"
            >
              {loading === 'movements-pdf' ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20 text-xs text-warning-700 dark:text-warning-300 italic shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span className="leading-relaxed">Asegúrese de haber completado las fechas de ingreso/compra en las fichas de los animales para que aparezcan en los reportes de movimientos.</span>
        </div>
      </div>
    </div>
  );
};
