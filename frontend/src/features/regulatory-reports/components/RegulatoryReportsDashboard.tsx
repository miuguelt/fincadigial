import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { regulatoryApi, ReportType } from '../api/regulatoryApi';
import { useToast } from '@/app/providers/ToastContext';
import { FileDown, FileText, Calendar, Activity, ShieldCheck, Loader2, FileText as FilePdf } from 'lucide-react';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';

export interface RegulatoryReportsDashboardProps {
  embedded?: boolean;
}

export const RegulatoryReportsDashboard: React.FC<RegulatoryReportsDashboardProps> = ({ embedded = false }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleDownload = async (type: ReportType, format: 'csv' | 'pdf' = 'csv') => {
    setLoading(true);
    try {
      await regulatoryApi.downloadReport(type, {
        date_from: dateFrom,
        date_to: dateTo,
        format: format
      });
      showToast(`Reporte ${format.toUpperCase()} generado y descargado exitosamente`, 'success');
    } catch (error: any) {
      console.error('Error descargando reporte:', error);
      showToast(error.response?.data?.message || 'No se pudo generar el reporte. Verifica tu conexión.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      id: 'inventory' as ReportType,
      title: 'Inventario de Ganado',
      description: 'Listado completo de animales activos, edades, pesos y ubicaciones para registros ICA.',
      icon: <FileText className="h-6 w-6 text-primary" />,
      color: 'bg-primary/10'
    },
    {
      id: 'movements' as ReportType,
      title: 'Movimientos de Ganado',
      description: 'Reporte consolidado de nacimientos, muertes y ventas requeridos para trazabilidad.',
      icon: <Activity className="h-6 w-6 text-amber-500" />,
      color: 'bg-amber-500/10'
    },
    {
      id: 'health' as ReportType,
      title: 'Sanidad y Bienestar',
      description: 'Registros de vacunaciones, tratamientos veterinarios y controles sanitarios.',
      icon: <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      color: 'bg-emerald-500/10'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {!embedded && (
        <DataScreenHeader
          icon={<FileText className="h-5 w-5 text-white" />}
          iconClassName="from-emerald-600 to-teal-700 shadow-emerald-600/20"
          title={<>Reportes Regulatorios <span className="text-primary">(ICA / SENA)</span></>}
          description="Genera y descarga los documentos legales requeridos para el cumplimiento normativo de tu finca"
        />
      )}

      <Card className="bg-card shadow-sm border border-border/80 rounded-2xl overflow-hidden mb-6">
        <div className="bg-muted/30 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="bg-primary/10 p-2 rounded-xl">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold">Filtros de Período</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Selecciona el rango de fechas para generar y acotar los reportes oficiales.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto bg-background/60 p-3 rounded-xl border border-border/50">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Label htmlFor="date-from" className="text-xs sm:text-sm font-semibold whitespace-nowrap text-muted-foreground">
                Desde
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-background shadow-sm border-border/80 w-full sm:w-[160px] h-9 text-xs sm:text-sm"
              />
            </div>
            <div className="hidden sm:block w-px h-8 bg-border"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Label htmlFor="date-to" className="text-xs sm:text-sm font-semibold whitespace-nowrap text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-background shadow-sm border-border/80 w-full sm:w-[160px] h-9 text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="flex flex-col bg-card shadow-sm hover:shadow-md transition-all duration-300 border border-border/70 rounded-2xl group overflow-hidden"
          >
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200 shadow-sm border border-black/5 dark:border-white/5`}>
                {report.icon}
              </div>
              <CardTitle className="text-lg font-bold tracking-tight mb-1">{report.title}</CardTitle>
              <CardDescription className="min-h-[48px] text-xs leading-relaxed text-muted-foreground">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 py-0 flex-1">
              <div className="text-xs text-muted-foreground space-y-1.5 p-3.5 bg-muted/30 rounded-xl border border-border/50">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Formatos disponibles: CSV / PDF
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Fuente: Registros sanitarios de la finca
                </p>
              </div>
            </CardContent>
            <CardFooter className="p-5 sm:p-6 pt-5 flex gap-3">
              <Button
                className="flex-1 gap-2 bg-background hover:bg-muted border border-border shadow-sm text-xs font-semibold h-9"
                onClick={() => handleDownload(report.id, 'csv')}
                disabled={loading}
                variant="outline"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 text-muted-foreground" />}
                CSV
              </Button>
              <Button
                className="flex-1 gap-2 shadow-sm text-xs font-bold h-9"
                onClick={() => handleDownload(report.id, 'pdf')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePdf className="h-3.5 w-3.5" />}
                PDF
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="bg-card/40 border border-dashed border-border/70 rounded-2xl">
        <CardContent className="p-5 sm:p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Sincronización Sanitaria Oficial</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estos reportes están sincronizados directamente con la base de datos de la finca.
              Asegúrate de que las vacunaciones, traslados y novedades estén registrados antes de exportar los documentos de control.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
