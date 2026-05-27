import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { regulatoryApi, ReportType } from '../api/regulatoryApi';
// import { regulatoryReportsService } from '../api/regulatoryReports.service';
import { useToast } from '@/app/providers/ToastContext';
import { FileDown, FileText, Calendar, Activity, ShieldCheck, Loader2, FileText as FilePdf } from 'lucide-react';
export const RegulatoryReportsDashboard: React.FC = () => {
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
      icon: <FileText className="h-6 w-6 text-info" />,
      color: 'bg-info/5'
    },
    {
      id: 'movements' as ReportType,
      title: 'Movimientos de Ganado',
      description: 'Reporte consolidado de nacimientos, muertes y ventas requeridos para trazabilidad.',
      icon: <Activity className="h-6 w-6 text-orange-500" />,
      color: 'bg-orange-50'
    },
    {
      id: 'health' as ReportType,
      title: 'Sanidad y Bienestar',
      description: 'Registros de vacunaciones, tratamientos veterinarios y controles sanitarios.',
      icon: <ShieldCheck className="h-6 w-6 text-success" />,
      color: 'bg-success/5'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reportes Regulatorios (ICA / SENA)</h1>
        <p className="text-muted-foreground">
          Genera y descarga los documentos legales necesarios para el cumplimiento normativo de tu finca.
        </p>
      </div>

      <Card className="bg-card shadow-sm border border-border rounded-xl overflow-hidden mb-8">
        <div className="bg-muted/30 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl">Filtros de Período</CardTitle>
            </div>
            <CardDescription>Selecciona el rango de fechas para generar los reportes.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto bg-background/50 p-3 rounded-xl border border-border/50">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Label htmlFor="date-from" className="text-sm font-medium whitespace-nowrap text-muted-foreground">Desde</Label>
              <Input 
                id="date-from" 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-background shadow-sm border-border/80 w-full sm:w-[160px]"
              />
            </div>
            <div className="hidden sm:block w-px h-8 bg-border"></div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Label htmlFor="date-to" className="text-sm font-medium whitespace-nowrap text-muted-foreground">Hasta</Label>
              <Input 
                id="date-to" 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-background shadow-sm border-border/80 w-full sm:w-[160px]"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col bg-card shadow-sm hover:shadow-md transition-all duration-300 border border-border/60 rounded-xl group overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <div className={`w-14 h-14 rounded-xl ${report.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-black/5 dark:border-white/5`}>
                {report.icon}
              </div>
              <CardTitle className="text-xl tracking-tight mb-2">{report.title}</CardTitle>
              <CardDescription className="min-h-[60px] text-sm leading-relaxed">{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-0 flex-1">
              <div className="text-xs text-muted-foreground space-y-2 p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span> Formato: CSV / Excel / PDF
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span> Cumplimiento: Resolución ICA 1234
                </p>
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-5 flex gap-3">
              <Button 
                className="flex-1 gap-2 bg-background hover:bg-muted border-border/80 shadow-sm transition-colors" 
                onClick={() => handleDownload(report.id, 'csv')}
                disabled={loading}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <FileDown className="h-4 w-4 text-muted-foreground" />}
                CSV
              </Button>
              <Button 
                className="flex-1 gap-2 shadow-sm transition-all" 
                onClick={() => handleDownload(report.id, 'pdf')}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePdf className="h-4 w-4" />}
                PDF
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="py-6 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Certificación Sanitaria Automática</h4>
            <p className="text-xs text-muted-foreground">
              Estos reportes están sincronizados con la base de datos central de la finca. 
              Asegúrate de que todos los eventos (vacunas, muertes, ventas) estén registrados en el sistema antes de exportar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
