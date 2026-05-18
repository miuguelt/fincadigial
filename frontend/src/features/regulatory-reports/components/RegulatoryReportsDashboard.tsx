import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { regulatoryApi, ReportType } from '../api/regulatoryApi';
import { regulatoryReportsService } from '../api/regulatoryReports.service';
import { useToast } from '@/app/providers/ToastContext';
import { FileDown, FileText, Calendar, Activity, ShieldCheck, Loader2, FileText as FilePdf } from 'lucide-react';
import { useAuth } from '@/features/auth/model/useAuth';

export const RegulatoryReportsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleDownload = async (type: ReportType, format: 'csv' | 'pdf' = 'csv') => {
    if (user?.finca_name?.includes('Educativa') || (user as any)?.finca_type === 'Educativa') {
      showToast('Los reportes regulatorios solo están disponibles para fincas Tradicionales (Producción).', 'warning');
      return;
    }

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
      icon: <FileText className="h-6 w-6 text-blue-500" />,
      color: 'bg-blue-50'
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
      icon: <ShieldCheck className="h-6 w-6 text-green-500" />,
      color: 'bg-green-50'
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

      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Filtros de Período</CardTitle>
          </div>
          <CardDescription>Selecciona el rango de fechas para los reportes.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">Desde</Label>
              <Input 
                id="date-from" 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Hasta</Label>
              <Input 
                id="date-to" 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center mb-2`}>
                {report.icon}
              </div>
              <CardTitle className="text-xl">{report.title}</CardTitle>
              <CardDescription className="min-h-[60px]">{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Formato: CSV / Excel / PDF</p>
                <p>• Cumplimiento: Resolución ICA 1234</p>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex gap-2">
              <Button 
                className="flex-1 gap-2" 
                onClick={() => handleDownload(report.id, 'csv')}
                disabled={loading}
                variant="outline"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                CSV
              </Button>
              <Button 
                className="flex-1 gap-2" 
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
