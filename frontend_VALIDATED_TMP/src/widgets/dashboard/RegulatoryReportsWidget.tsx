import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { 
  FileText, 
  Download, 
  ClipboardList, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  FileDown,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { apiFetch } from '@/shared/api/apiFetch';
import { useT } from '@/shared/i18n';
import { motion } from 'framer-motion';
import { cn } from '@/shared/ui/cn.ts';

const RegulatoryReportsWidget: React.FC = () => {
  const t = useT();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const downloadReport = async (type: 'inventory' | 'movements' | 'health', format: 'pdf' | 'csv') => {
    setLoading(`${type}-${format}`);
    try {
      const response = await apiFetch({
        url: `/regulatory-reports/${type}`,
        method: 'GET',
        params: { format },
        responseType: 'blob'
      } as any);

      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `reporte_${type}_${date}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast('Reporte generado exitosamente', 'success');
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('Error al generar el reporte', 'error');
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      id: 'inventory',
      title: 'Inventario de Ganado',
      description: 'Listado completo de animales activos, edades y ubicación.',
      icon: <ClipboardList className="h-6 w-6" />,
      gradient: 'from-blue-500/10 to-blue-600/5',
      iconColor: 'text-blue-500',
      formats: ['pdf', 'csv'] as const,
    },
    {
      id: 'movements',
      title: 'Trazabilidad',
      description: 'Historial de nacimientos, muertes y ventas en el periodo.',
      icon: <RefreshCw className="h-6 w-6" />,
      gradient: 'from-orange-500/10 to-orange-600/5',
      iconColor: 'text-orange-500',
      formats: ['pdf', 'csv'] as const,
    },
    {
      id: 'health',
      title: 'Sanidad y Vacunas',
      description: 'Registros de vacunación, tratamientos y controles.',
      icon: <FileText className="h-6 w-6" />,
      gradient: 'from-emerald-500/10 to-emerald-600/5',
      iconColor: 'text-emerald-500',
      formats: ['pdf', 'csv'] as const,
    }
  ];

  return (
    <Card className="border-none shadow-2xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <FileDown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tighter">
                Módulo de Cumplimiento
              </CardTitle>
              <CardDescription className="font-bold uppercase tracking-widest text-[9px] opacity-60">
                Reportes Oficiales ICA / SENA
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black uppercase tracking-widest text-[10px] h-8 px-4">
            Normativa Certificada
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => (
            <motion.div 
              key={report.id}
              whileHover={{ translateY: -5 }}
              className={cn(
                "group relative p-6 rounded-[2rem] border border-white/5 bg-gradient-to-br transition-all duration-300",
                report.gradient
              )}
            >
              <div className="flex flex-col gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center bg-card shadow-sm group-hover:scale-110 transition-transform",
                  report.iconColor
                )}>
                  {report.icon}
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-tight mb-1">{report.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                {report.formats.map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    className="h-10 flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border border-white/5 hover:bg-primary hover:text-white transition-all"
                    disabled={!!loading}
                    onClick={() => downloadReport(report.id as any, format)}
                  >
                    {loading === `${report.id}-${format}` ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {format}
                  </Button>
                ))}
              </div>

              <div className="absolute top-4 right-4">
                <ShieldCheck className="h-4 w-4 text-primary/30" />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1">Nota Técnica Importante</p>
              <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                Estos reportes están diseñados para cumplir con los requerimientos técnicos del ICA. 
                Asegúrese de validar la <strong>trazabilidad completa</strong> y los <strong>registros de vacunación</strong> antes de proceder con el reporte final.
              </p>
            </div>
          </div>
          {/* Decorative blur */}
          <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-amber-500/10 rounded-full blur-3xl" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RegulatoryReportsWidget;
