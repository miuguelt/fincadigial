import React, { useState } from 'react';
import { Download, FileSpreadsheet, Calendar, AlertCircle, FileText } from 'lucide-react';
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
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Reportes Regulatorios (ICA / SENA)
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Generación de archivos CSV compatibles con los formatos oficiales de trazabilidad.
        </p>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Inventario */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div>
            <h4 className="font-semibold text-sm">Inventario de Existencias</h4>
            <p className="text-[11px] text-muted-foreground">Listado completo de animales activos con datos de registro ICA.</p>
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
        <div className="space-y-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Registro de Movimientos</h4>
              <p className="text-[11px] text-muted-foreground">Ingresos, egresos, compras y ventas por rango de fechas.</p>
            </div>
            <FileSpreadsheet className="h-5 w-5 text-blue-500 opacity-50" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Desde
              </label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Hasta
              </label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
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

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 italic">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Asegúrese de haber completado las fechas de ingreso/compra en las fichas de los animales para que aparezcan en los reportes de movimientos.</span>
        </div>
      </div>
    </div>
  );
};
