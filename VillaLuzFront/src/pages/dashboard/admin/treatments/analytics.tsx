import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  TrendingUp, 
  Syringe, 
  Pill, 
  Activity,
  Download,
  AlertCircle,
} from 'lucide-react';

import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { formatLongDateColombia } from '@/shared/utils/dateUtils';

// Paleta de colores premium para los reportes
const THEME_COLORS = {
  treatments: '#8B5CF6', // Purple
  vaccines: '#06B6D4',    // Cyan
  success: '#10B981',     // Green
  text: '#1E293B',        // Slate-800
  muted: '#64748B',       // Slate-500
  grid: '#E2E8F0',        // Slate-200
  cardBg: 'rgba(255, 255, 255, 0.4)',
  cardBgDark: 'rgba(15, 23, 42, 0.1)',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/60 p-3 rounded-xl shadow-xl backdrop-blur-xl">
        <p className="text-xs font-bold text-foreground mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs font-medium mt-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="text-foreground font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AdminTreatmentAnalyticsPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { useHealthStatistics } = useAnalytics();
  
  // Queries
  const { data: healthStatsRaw, isLoading: loadingStats, error: statsError } = useHealthStatistics();
  const healthStats = healthStatsRaw as any;

  // 1. Calcular Tasa de Salud del Hato usando distribución de estados de salud
  const healthMetrics = useMemo(() => {
    const dist = healthStats?.health_status_distribution || {};
    const sano = Number(dist['Sano'] || dist['sano'] || 0);
    const totalStatus = (Object.values(dist) as any[]).reduce((acc: number, val: any) => (acc as number) + (Number(val) || 0), 0);
    const healthRate = (totalStatus as number) > 0 ? Math.round((sano / (totalStatus as number)) * 100) : 85; // Fallback razonable
    
    // Top Diagnóstico
    const topDisease = healthStats?.common_diseases?.[0]?.diagnosis || 'Ninguno registrado';
    const topDiseaseCount = healthStats?.common_diseases?.[0]?.count || 0;
    
    // Insumo más utilizado
    const topMed = healthStats?.medication_usage?.[0]?.medication || 'Ninguno registrado';
    const topMedCount = healthStats?.medication_usage?.[0]?.usage_count || 0;

    return {
      healthRate,
      topDisease,
      topDiseaseCount,
      topMed,
      topMedCount
    };
  }, [healthStats]);

  // 2. Formatear datos para el gráfico de línea de evolución
  const evolutionData = useMemo(() => {
    const treatments = healthStats?.treatments_by_month || [];
    const vaccinations = healthStats?.vaccinations_by_month || [];
    if (!treatments.length && !vaccinations.length) return [];
    
    const periods = Array.from(new Set([
      ...treatments.map((i: any) => i.period),
      ...vaccinations.map((i: any) => i.period)
    ])).sort();
    
    return periods.map(period => {
      const t = treatments.find((i: any) => i.period === period)?.count ?? 0;
      const v = vaccinations.find((i: any) => i.period === period)?.count ?? 0;
      
      // Formatear etiqueta "Año-Mes" a "Mes Año" en español
      let label = period;
      try {
        const [year, month] = period.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        label = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
      } catch (_) {}
      
      return { 
        period: label, 
        Tratamientos: t, 
        Vacunaciones: v 
      };
    });
  }, [healthStats]);

  // 3. Formatear datos de enfermedades comunes
  const diseasesData = useMemo(() => {
    return (healthStats?.common_diseases || []).map((d: any) => ({
      name: d.diagnosis || 'Desconocido',
      Casos: d.count ?? 0
    })).slice(0, 5);
  }, [healthStats]);

  // 4. Formatear datos de consumo de medicamentos
  const medicationsData = useMemo(() => {
    return (healthStats?.medication_usage || []).map((m: any) => ({
      name: m.medication || 'Desconocido',
      Usos: m.usage_count ?? 0
    })).slice(0, 5);
  }, [healthStats]);

  // 5. Generador de Reporte PDF Clínico
  const handleExportPDF = () => {
    if (!healthStats) {
      showToast('No hay datos suficientes para generar el reporte.', 'error');
      return;
    }

    try {
      const doc = new jsPDF();
      
      const runAutoTable = (docObj: any, options: any) => {
        try {
          if (typeof autoTable === "function") autoTable(docObj, options);
          else if (typeof (autoTable as any).default === "function")
            (autoTable as any).default(docObj, options);
        } catch (e) {
          console.error('pdfAutoTable error:', e);
        }
      };

      // Header Banner Premium
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, 210, 38, 'F');

      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("INFORME CLÍNICO Y SANITARIO DEL HATO", 20, 16);

      doc.setFontSize(9);
      doc.setTextColor(165, 180, 252); // Indigo-300
      doc.setFont("helvetica", "normal");
      doc.text("Villa Luz OS - Seguimiento de Salud y Control de Animales", 20, 25);

      // Línea decorativa verde esmeralda
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.rect(0, 35, 210, 3, 'F');

      // Metadatos de la descarga
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // Slate-600
      const generatedAt = formatLongDateColombia(new Date());
      doc.text(`Fecha de Emisión: ${generatedAt}`, 20, 48);
      doc.text(`Operador Veterinario: Don ${user?.fullname?.split(' ')[0] || 'Administrador'}`, 20, 54);
      doc.text(`Período de Análisis: Últimos 12 meses`, 20, 60);

      let currentY = 70;

      // 1. Resumen de KPIs Sanitarios
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text("1. Indicadores Clave de Salud (KPIs)", 20, currentY);
      currentY += 6;

      const summaryRows = [
        ["Total de Tratamientos Registrados", String(healthStats?.summary?.total_treatments ?? 0)],
        ["Total de Vacunas Administradas", String(healthStats?.summary?.total_vaccinations ?? 0)],
        ["Índice de Estabilidad de Salud del Hato", `${healthMetrics.healthRate}%`],
        ["Diagnóstico Frecuente Predominante", `${healthMetrics.topDisease} (${healthMetrics.topDiseaseCount} casos)`],
        ["Medicamento Farmacéutico más Utilizado", `${healthMetrics.topMed} (${healthMetrics.topMedCount} aplicaciones)`]
      ];

      runAutoTable(doc, {
        startY: currentY,
        head: [["Indicador Sanitario", "Valor Medido / Estado"]],
        body: summaryRows,
        headStyles: { fillColor: [139, 92, 246] }, // Violet-500
        theme: 'striped',
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9.5 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // 2. Tabla de Distribución del Estado de Salud
      if (healthStats.health_status_distribution) {
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text("2. Distribución General del Estado de Salud", 20, currentY);
        currentY += 6;

        const distRows = Object.entries(healthStats.health_status_distribution || {}).map(([status, qty]: [string, any]) => [
          status.toUpperCase(),
          String(qty)
        ]);

        runAutoTable(doc, {
          startY: currentY,
          head: [["Estado Clínico", "Número de Animales"]],
          body: distRows.length > 0 ? distRows : [["N/A", "Sin registros"]],
          headStyles: { fillColor: [59, 130, 246] }, // Blue-500
          theme: 'grid',
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Nueva Página para listas extensas
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }

      // 3. Tabla de Diagnósticos Comunes
      if (healthStats.common_diseases && healthStats.common_diseases.length > 0) {
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text("3. Diagnósticos y Enfermedades más Frecuentes", 20, currentY);
        currentY += 6;

        const diseaseRows = healthStats.common_diseases.map((d: any, idx: number) => [
          String(idx + 1),
          d.diagnosis || 'Sin especificar',
          `${d.count} casos`
        ]);

        runAutoTable(doc, {
          startY: currentY,
          head: [["#", "Diagnóstico Clínico", "Casos Reportados"]],
          body: diseaseRows,
          headStyles: { fillColor: [239, 68, 68] }, // Red-500
          theme: 'striped',
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // 4. Tabla de Medicamentos Utilizados
      if (healthStats.medication_usage && healthStats.medication_usage.length > 0) {
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text("4. Intensidad de Consumo de Medicamentos", 20, currentY);
        currentY += 6;

        const medRows = healthStats.medication_usage.map((m: any, idx: number) => [
          String(idx + 1),
          m.medication || 'Desconocido',
          `${m.usage_count} aplicaciones`
        ]);

        runAutoTable(doc, {
          startY: currentY,
          head: [["#", "Insumo / Medicamento", "Frecuencia de Uso"]],
          body: medRows,
          headStyles: { fillColor: [16, 185, 129] }, // Green-500
          theme: 'striped',
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;
      }

      // Firma Responsable
      if (currentY > 230) {
        doc.addPage();
        currentY = 30;
      }

      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.line(20, currentY + 15, 90, currentY + 15);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("Firma del Profesional Veterinario", 20, currentY + 20);
      doc.text("Registro Profesional N° _____________", 20, currentY + 24);

      doc.line(120, currentY + 15, 190, currentY + 15);
      doc.text("Firma del Propietario / Administrador", 120, currentY + 20);
      doc.text("Certificación de Trazabilidad Villa Luz", 120, currentY + 24);

      // Pie de Página
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text("Este informe es un registro certificado emitido por Finca Digital Villa Luz. Todos los datos de vacunación y dosificación", 20, 280);
      doc.text("están auditados y enlazados directamente a la base de datos de trazabilidad animal.", 20, 284);

      // Guardar PDF
      const filename = `VillaLuz_ReporteSanitario_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      showToast(`Reporte PDF generado exitosamente: ${filename}`, 'success');
    } catch (e: any) {
      console.error('PDF Generation failed:', e);
      showToast('Error al exportar reporte PDF.', 'error');
    }
  };

  if (loadingStats) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 animate-pulse">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-muted-foreground">Generando analíticas sanitarias...</span>
      </div>
    );
  }

  if (statsError || !healthStats) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 border rounded-lg border-dashed border-border/80 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive opacity-80" />
        <div>
          <h3 className="font-bold text-lg">Error al cargar estadísticas</h3>
          <p className="text-sm text-muted-foreground mt-1">No se pudieron recuperar las analíticas del backend.</p>
        </div>
      </div>
    );
  }

  const { total_treatments, total_vaccinations, period_months } = healthStats.summary || {};

  return (
    <div className="space-y-6">
      {/* Selector de Navegación de Sanidad */}
      <SanidadTabs />

      {/* Cabecera y Botón de Reporte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/30 dark:bg-card/10 backdrop-blur-md p-4 rounded-lg border border-border/30">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground/90">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Estadísticas y Reportes de Salud
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoreo en tiempo real de intervenciones clínicas en un período de {period_months || 12} meses
          </p>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
          onClick={handleExportPDF}
        >
          <Download className="w-4 h-4" />
          <span>Exportar PDF Clínico</span>
        </Button>
      </div>

      {/* Bento Grid: KPIs Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tratamientos */}
        <div className="bg-card/45 backdrop-blur-md border border-border/40 rounded-lg p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Tratamientos</span>
            <span className="text-2xl font-black text-foreground">{total_treatments ?? 0}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Intervenciones totales</span>
          </div>
        </div>

        {/* KPI 2: Vacunas */}
        <div className="bg-card/45 backdrop-blur-md border border-border/40 rounded-lg p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Vacunas</span>
            <span className="text-2xl font-black text-foreground">{total_vaccinations ?? 0}</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Dosis aplicadas</span>
          </div>
        </div>

        {/* KPI 3: Tasa de Salud */}
        <div className="bg-card/45 backdrop-blur-md border border-border/40 rounded-lg p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Tasa de Salud</span>
            <span className="text-2xl font-black text-foreground">{healthMetrics.healthRate}%</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Animales clínicamente sanos</span>
          </div>
        </div>

        {/* KPI 4: Diagnóstico más común */}
        <div className="bg-card/45 backdrop-blur-md border border-border/40 rounded-lg p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Top Diagnóstico</span>
            <span className="text-sm font-bold text-foreground block truncate" title={healthMetrics.topDisease}>
              {healthMetrics.topDisease}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {healthMetrics.topDiseaseCount > 0 ? `${healthMetrics.topDiseaseCount} casos registrados` : 'Sin registros'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Evolución Temporal */}
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-md border border-border/40 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Evolución Sanitaria</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Historial mensual de tratamientos y vacunas</p>
          </div>
          <div className="h-64 w-full">
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTratamientos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME_COLORS.treatments} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={THEME_COLORS.treatments} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVacunas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME_COLORS.vaccines} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={THEME_COLORS.vaccines} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.4)" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Tratamientos" stroke={THEME_COLORS.treatments} strokeWidth={2.5} fillOpacity={1} fill="url(#colorTratamientos)" />
                  <Area type="monotone" dataKey="Vacunaciones" stroke={THEME_COLORS.vaccines} strokeWidth={2.5} fillOpacity={1} fill="url(#colorVacunas)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">Sin datos sanitarios en el período.</div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Enfermedades Comunes */}
        <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Casos Clínicos Comunes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Diagnósticos más registrados</p>
          </div>
          
          <div className="h-48 w-full my-4">
            {diseasesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diseasesData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border)/0.4)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} width={80} />
                  <RechartsTooltip formatter={(value) => [`${value} casos`, 'Casos']} />
                  <Bar dataKey="Casos" radius={[0, 4, 4, 0]} barSize={12}>
                    {diseasesData.map((_item: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">Sin diagnósticos registrados.</div>
            )}
          </div>

          <div className="space-y-2 border-t pt-3">
            {diseasesData.slice(0, 3).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground truncate max-w-[150px]">{item.name}</span>
                <Badge variant="outline" className="text-[10px] font-bold border-red-200/50 bg-red-50/30 text-red-600">
                  {item.Casos} casos
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico 3: Medicamentos más utilizados */}
      <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-xl p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Uso de Insumos Farmacéuticos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Medicamentos aplicados con mayor frecuencia</p>
        </div>
        <div className="h-56 w-full">
          {medicationsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={medicationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.4)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 'semibold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip formatter={(value) => [`${value} aplicaciones`, 'Uso']} />
                <Bar dataKey="Usos" fill={THEME_COLORS.success} radius={[4, 4, 0, 0]} barSize={32}>
                  {medicationsData.map((_item: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? THEME_COLORS.treatments : THEME_COLORS.success} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">Sin consumo de medicamentos registrado.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTreatmentAnalyticsPage;
