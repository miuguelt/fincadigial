import React, { useState, useRef, useEffect } from 'react';
import { motion } from "framer-motion";
import { useMutation } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { unwrapApi } from '@/shared/api/client';
import { apiFetch } from '@/shared/api/apiFetch';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

/**
 * Página para generar reportes personalizados
 * Consume el endpoint POST /api/analytics/reports/custom
 */
const CustomReports: React.FC = () => {
  const successRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState({
    period: '1y',
    metrics: ['animals' as string],
    groupBy: [] as string[],
    filters: {} as Record<string, any>,
  });

  const generateReport = useMutation({
    mutationFn: async (cfg: any) => {
      const res = await apiFetch({ url: '/analytics/reports/custom', method: 'POST', data: cfg } as any);
      return unwrapApi(res);
    },
    onError: (error: any) => {
      console.error('Report generation failed:', error);
    },
  });

  useEffect(() => {
    if (generateReport.isSuccess && successRef.current) {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        successRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [generateReport.isSuccess]);

  const handleGenerate = () => {
    generateReport.mutate(config);
  };

  const handleDownloadJSON = () => {
    if (!generateReport.data) return;
    const dataStr = JSON.stringify(generateReport.data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `reporte-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleDownloadCSV = () => {
    if (!generateReport.data) return;

    // Convertir datos a CSV (simplificado)
    let csv = 'Métrica,Valor\n';
    const flattenObject = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flattenObject(value, `${prefix}${key}.`);
        } else {
          csv += `${prefix}${key},${value}\n`;
        }
      }
    };
    flattenObject(generateReport.data);

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!generateReport.data) return;
    const report = (generateReport.data as any).report || {};
    const summary = report.summary || {};
    const details = report.details || {};
    const metadata = (generateReport.data as any).metadata || {};

    const doc = new jsPDF();
    const runAutoTable = (docObj: any, options: any) => {
      try {
        if (typeof autoTable === "function") autoTable(docObj, options);
        else if (typeof (autoTable as any).default === "function")
          (autoTable as any).default(docObj, options);
      } catch (e) {
        console.error(e);
      }
    };

    // Título y branding premium
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("REPORTE ANALÍTICO PERSONALIZADO", 20, 18);

    doc.setFontSize(9);
    doc.setTextColor(200, 200, 255);
    doc.text("Ecosistema Villa Luz OS - Gestión Inteligente de Hatos", 20, 27);

    // Metadatos
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generado por: ${metadata.user || 'Usuario'}`, 20, 45);
    doc.text(`Fecha del Reporte: ${new Date(metadata.generated_at).toLocaleString('es-CO')}`, 20, 52);
    doc.text(`Período de Análisis: ${periodOptions.find(p => p.value === config.period)?.label || 'N/A'}`, 20, 59);

    let currentY = 70;

    // Resumen Ejecutivo
    if (Object.keys(summary).length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("1. Resumen Ejecutivo (KPIs)", 20, currentY);
      currentY += 8;

      const summaryRows = Object.entries(summary).map(([key, val]: [string, any]) => [
        key.replace(/_/g, ' ').toUpperCase(),
        typeof val === 'number' && val % 1 !== 0 ? val.toFixed(1) : String(val)
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Indicador Clave", "Valor Medido"]],
        body: summaryRows,
        headStyles: { fillColor: [30, 41, 59] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Inventario de Animales
    if (details.inventario_animales) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("2. Distribución y Demografía del Hato", 20, currentY);
      currentY += 8;

      const estadoRows = Object.entries(details.inventario_animales.estados).map(([state, qty]: [string, any]) => [
        state.toUpperCase(),
        String(qty)
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Estado del Animal", "Cantidad"]],
        body: estadoRows,
        headStyles: { fillColor: [37, 99, 235] },
        theme: 'grid',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      const sexoRows = Object.entries(details.inventario_animales.sexo).map(([sex, qty]: [string, any]) => [
        sex.replace('_vivos', '').replace('_vivas', '').toUpperCase() + 'S',
        String(qty)
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Distribución por Sexo", "Cabezas Activas"]],
        body: sexoRows,
        headStyles: { fillColor: [14, 165, 233] },
        theme: 'grid',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Distribución por Razas
    if (details.distribucion_razas && Object.keys(details.distribucion_razas).length > 0) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("3. Distribución por Razas Predominantes", 20, currentY);
      currentY += 8;

      const breedRows = Object.entries(details.distribucion_razas).map(([breed, qty]: [string, any]) => [
        breed.toUpperCase(),
        String(qty)
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Raza del Ganado", "Cantidad de Cabezas"]],
        body: breedRows,
        headStyles: { fillColor: [139, 92, 246] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Historial Sanitario
    if (details.historial_salud) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("4. Historial Sanitario e Intervenciones", 20, currentY);
      currentY += 8;

      const saludRows = details.historial_salud.ultimos_tratamientos.map((t: any) => [
        t.fecha,
        t.descripcion,
        t.dosis,
        t.observaciones
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Fecha", "Descripción del Tratamiento", "Dosis", "Observaciones"]],
        body: saludRows.length > 0 ? saludRows : [["N/A", "Sin tratamientos registrados", "N/A", "N/A"]],
        headStyles: { fillColor: [5, 150, 105] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Controles Biométricos
    if (details.produccion_y_biometria) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("5. Controles Biométricos y de Peso Corporal", 20, currentY);
      currentY += 8;

      const pesoRows = details.produccion_y_biometria.ultimos_controles.map((c: any) => [
        c.fecha,
        `${c.peso_kg} kg`,
        `${c.altura_cm} cm`,
        c.estado_salud
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Fecha Control", "Peso Corporal", "Altura", "Estado de Salud"]],
        body: pesoRows.length > 0 ? pesoRows : [["N/A", "Sin controles registrados", "N/A", "N/A"]],
        headStyles: { fillColor: [234, 88, 12] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Gestión de Potreros
    if (details.gestion_potreros) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("6. Estado e Infraestructura de Potreros", 20, currentY);
      currentY += 8;

      const potreroRows = details.gestion_potreros.potreros.map((p: any) => [
        p.nombre,
        p.ubicacion || 'N/A',
        `${p.area_ha} Ha`,
        `${p.capacidad_cabezas} Cabezas`,
        p.estado
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Potrero", "Ubicación", "Área", "Capacidad Máx.", "Estado Actual"]],
        body: potreroRows.length > 0 ? potreroRows : [["N/A", "N/A", "N/A", "N/A", "N/A"]],
        headStyles: { fillColor: [16, 185, 129] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Finanzas
    if (details.finanzas_y_economia) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("7. Balance Financiero y Transacciones", 20, currentY);
      currentY += 8;

      const finRows = details.finanzas_y_economia.ultimos_movimientos.map((f: any) => [
        f.fecha,
        f.tipo,
        f.categoria,
        `$ ${f.monto}`,
        f.descripcion
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Fecha", "Tipo", "Categoría", "Monto", "Descripción"]],
        body: finRows.length > 0 ? finRows : [["N/A", "N/A", "N/A", "N/A", "N/A"]],
        headStyles: { fillColor: [79, 70, 229] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Lechería
    if (details.produccion_lechera) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("8. Producción Lechera y Ordeños", 20, currentY);
      currentY += 8;

      const milkRows = details.produccion_lechera.ultimos_ordenos.map((m: any) => [
        m.fecha,
        m.jornada,
        `${m.litros} L`,
        m.observaciones
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Fecha", "Jornada", "Litros Producidos", "Observaciones"]],
        body: milkRows.length > 0 ? milkRows : [["N/A", "N/A", "N/A", "N/A"]],
        headStyles: { fillColor: [56, 189, 248] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Detalle: Agricultura
    if (details.actividades_agricolas) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("9. Estado Agrícola y Cultivos", 20, currentY);
      currentY += 8;

      const cropRows = details.actividades_agricolas.ultimas_actividades.map((c: any) => [
        c.fecha,
        c.tipo,
        c.cultivo,
        `$ ${c.costo}`,
        c.observaciones
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [["Fecha", "Actividad", "Cultivo Relacionado", "Costo", "Observaciones"]],
        body: cropRows.length > 0 ? cropRows : [["N/A", "N/A", "N/A", "N/A", "N/A"]],
        headStyles: { fillColor: [101, 163, 13] },
        theme: 'striped',
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Firma y pie de página
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Este reporte ha sido certificado mediante cifrado digital y firma del operador en Villa Luz OS.", 20, currentY + 10);
    doc.text("Generado automáticamente por el subsistema analítico de Finca Digital.", 20, currentY + 15);

    doc.save(`VillaLuz_ReporteAnalitico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const metricsOptions = [
    { value: 'animals', label: 'Animales', description: 'Estadísticas de inventario de animales' },
    { value: 'health', label: 'Salud', description: 'Tratamientos, vacunaciones y enfermedades' },
    { value: 'production', label: 'Producción', description: 'Peso, GMD y productividad' },
    { value: 'fields', label: 'Campos', description: 'Ocupación y gestión de potreros' },
    { value: 'finance', label: 'Finanzas', description: 'Ingresos, Egresos y Balances' },
    { value: 'milk', label: 'Lechería', description: 'Control de ordeños y producción de leche' },
    { value: 'agriculture', label: 'Agricultura', description: 'Cosechas, cultivos e insumos' },
  ];

  const groupByOptions = [
    { value: 'breed', label: 'Raza' },
    { value: 'field', label: 'Campo/Potrero' },
    { value: 'species', label: 'Especie' },
    { value: 'month', label: 'Mes' },
    { value: 'health_status', label: 'Estado de Salud' },
  ];

  const periodOptions = [
    { value: '1m', label: '1 mes' },
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '1y', label: '1 año' },
    { value: '2y', label: '2 años' },
    { value: 'all', label: 'Todo el historial' },
  ];

  return (
    <div className="h-full overflow-auto bg-muted/50 p-6" tabIndex={0}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-info" />
          <h1 className="text-3xl font-bold text-foreground">Reportes Personalizados</h1>
        </div>
        <p className="text-muted-foreground">
          Genera reportes personalizados con las métricas y filtros que necesites
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuración del reporte */}
          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Configuración del Reporte</h2>
            </div>

            {/* Período */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Período de Análisis
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setConfig({ ...config, period: option.value })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${config.period === option.value
                        ? 'bg-info text-white'
                        : 'bg-muted text-foreground/80 hover:bg-secondary'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Métricas */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground/80 mb-3">
                Métricas a Incluir
              </label>
              <div className="space-y-3">
                {metricsOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${config.metrics.includes(option.value)
                        ? 'border-info bg-info/5'
                        : 'border-border hover:border-border'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={config.metrics.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig({
                            ...config,
                            metrics: [...config.metrics, option.value],
                          });
                        } else {
                          setConfig({
                            ...config,
                            metrics: config.metrics.filter((m) => m !== option.value),
                          });
                        }
                      }}
                      className="mt-1 mr-3 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                    </div>
                    {config.metrics.includes(option.value) && (
                      <CheckCircle className="w-5 h-5 text-info" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Agrupar Por */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground/80 mb-3">
                Agrupar Resultados Por (Opcional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groupByOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newGroupBy = config.groupBy.includes(option.value)
                        ? config.groupBy.filter((g) => g !== option.value)
                        : [...config.groupBy, option.value];
                      setConfig({ ...config, groupBy: newGroupBy });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${config.groupBy.includes(option.value)
                        ? 'bg-info text-white'
                        : 'bg-muted text-foreground/80 hover:bg-secondary'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón generar */}
            <button
              onClick={handleGenerate}
              disabled={generateReport.isPending || config.metrics.length === 0}
              className="w-full px-6 py-3 bg-info text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {generateReport.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generando Reporte...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  Generar Reporte
                </>
              )}
            </button>

            {config.metrics.length === 0 && (
              <p className="text-center text-sm text-destructive mt-2">
                Selecciona al menos una métrica para generar el reporte
              </p>
            )}
          </div>
        </div>

        {/* Panel de resultados */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow p-6 sticky top-6">
            <h3 className="font-semibold mb-4">Configuración Actual</h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Período:</span>
                <span className="ml-2 font-medium">
                  {periodOptions.find((p) => p.value === config.period)?.label}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">Métricas:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {config.metrics.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 bg-info/10 text-info text-xs rounded-full"
                    >
                      {metricsOptions.find((opt) => opt.value === m)?.label}
                    </span>
                  ))}
                  {config.metrics.length === 0 && (
                    <span className="text-muted-foreground text-xs">Ninguna seleccionada</span>
                  )}
                </div>
              </div>

              {config.groupBy.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Agrupar por:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {config.groupBy.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                      >
                        {groupByOptions.find((opt) => opt.value === g)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {generateReport.isSuccess && (
              <motion.div
                ref={successRef}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mt-6 pt-6 border-t border-border"
              >
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-sm text-success font-medium mb-3 flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Reporte Generado Exitosamente
                </motion.p>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } }, hidden: {} }}
                  className="grid grid-cols-3 gap-2"
                >
                  <motion.button
                    variants={{ hidden: { opacity: 0, y: 12, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                    onClick={handleDownloadJSON}
                    className="px-2 py-2.5 bg-muted hover:bg-secondary text-foreground/80 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-border shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    JSON
                  </motion.button>
                  <motion.button
                    variants={{ hidden: { opacity: 0, y: 12, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                    onClick={handleDownloadCSV}
                    className="px-2 py-2.5 bg-info/5 hover:bg-info/10 text-info rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-info/30 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </motion.button>
                  <motion.button
                    variants={{ hidden: { opacity: 0, y: 12, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                    onClick={handleDownloadPDF}
                    className="px-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-emerald-200 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {generateReport.isError && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-destructive font-medium bg-destructive/5 p-3 rounded-lg border border-red-150">
                  ⚠️ {(generateReport.error as any)?.message || 'Error al generar el reporte. Verifica la selección de filtros e intenta nuevamente.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Resultados Interactivos Avanzados */}
      {generateReport.isSuccess && generateReport.data && (() => {
        const report = (generateReport.data as any).report || {};
        const summary = report.summary || {};
        const details = report.details || {};
        const metadata = (generateReport.data as any).metadata || {};

        // Paletas de colores premium
        const COLORS_STATE = ['#10B981', '#3B82F6', '#EF4444'];
        const COLORS_SEX = ['#0EA5E9', '#EC4899'];
        const COLORS_BREEDS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#10B981', '#F59E0B', '#EF4444'];

        return (
          <div className="mt-8 bg-card rounded-xl shadow-lg border border-gray-150 overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
            {/* Header del Reporte */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 bg-card/10 rounded-full text-xs font-bold uppercase tracking-wider">
                  Reporte Analítico Personalizado
                </span>
                <h2 className="text-2xl font-bold mt-2">Resultados del Análisis</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Período analizado: <span className="font-semibold">{periodOptions.find(p => p.value === config.period)?.label}</span>
                </p>
              </div>
              <div className="text-right text-xs text-blue-200 md:border-l md:border-white/20 md:pl-6">
                <p>Generado por: <span className="font-semibold text-white">{metadata.user || 'Usuario'}</span></p>
                <p className="mt-1">Fecha: <span className="font-semibold text-white">{new Date(metadata.generated_at).toLocaleString('es-CO')}</span></p>
              </div>
            </div>

            {/* KPIs / Tarjetas Rápidas */}
            {Object.keys(summary).length > 0 && (
              <div className="p-6 bg-muted/50 border-b border-gray-150">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Indicadores Clave de Desempeño</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(summary).map(([key, val]: [string, any]) => (
                    <div key={key} className="bg-card p-4 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {typeof val === 'number' && val % 1 !== 0 ? val.toFixed(1) : val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visualizaciones Detalladas y Gráficos por Métrica */}
            <div className="p-6 space-y-12">
              {/* 1. Inventario de animales */}
              {details.inventario_animales && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-info"></span>
                    Distribución del Inventario y Demografía
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Estados del Animal */}
                    <div className="bg-secondary/30/50 p-6 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full">
                        <h5 className="text-sm font-bold text-foreground/80 mb-3">Estado de los Animales</h5>
                        <div className="border border-border bg-card rounded-lg overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                              <tr>
                                <th className="p-3">Estado</th>
                                <th className="p-3 text-right">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {Object.entries(details.inventario_animales.estados).map(([state, qty]: [string, any]) => (
                                <tr key={state} className="hover:bg-muted/50">
                                  <td className="p-3 capitalize font-medium text-foreground/80">{state}</td>
                                  <td className="p-3 text-right font-bold text-foreground">{qty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="w-full md:w-44 h-44 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(details.inventario_animales.estados).map(([key, val]) => ({ name: key, value: val }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {Object.entries(details.inventario_animales.estados).map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_STATE[index % COLORS_STATE.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Distribución por Sexo */}
                    <div className="bg-secondary/30/50 p-6 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full">
                        <h5 className="text-sm font-bold text-foreground/80 mb-3">Distribución por Sexo</h5>
                        <div className="border border-border bg-card rounded-lg overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                              <tr>
                                <th className="p-3">Sexo</th>
                                <th className="p-3 text-right">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {Object.entries(details.inventario_animales.sexo).map(([sex, qty]: [string, any]) => (
                                <tr key={sex} className="hover:bg-muted/50">
                                  <td className="p-3 capitalize font-medium text-foreground/80">{sex.replace('_vivos', '').replace('_vivas', '')}s</td>
                                  <td className="p-3 text-right font-bold text-foreground">{qty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="w-full md:w-44 h-44 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(details.inventario_animales.sexo).map(([key, val]) => ({ name: key.replace('_vivos', '').replace('_vivas', ''), value: val }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {Object.entries(details.inventario_animales.sexo).map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_SEX[index % COLORS_SEX.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Distribución por Razas */}
              {details.distribucion_razas && Object.keys(details.distribucion_razas).length > 0 && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    Razas Predominantes (Ganado Activo)
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Raza</th>
                            <th className="p-3 text-right">Cabezas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Object.entries(details.distribucion_razas).map(([breed, qty]: [string, any]) => (
                            <tr key={breed} className="hover:bg-muted/50">
                              <td className="p-3 font-semibold text-foreground">{breed}</td>
                              <td className="p-3 text-right font-bold text-foreground">{qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="h-64 w-full bg-secondary/30/50 p-4 rounded-xl border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(details.distribucion_razas).map(([key, val]) => ({ name: key, Cabezas: val }))}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={90} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <ChartTooltip />
                          <Bar dataKey="Cabezas" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                            {Object.entries(details.distribucion_razas).map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_BREEDS[index % COLORS_BREEDS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Historial de salud */}
              {details.historial_salud && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                    Últimos Tratamientos Clínicos e Historial Sanitario
                  </h4>
                  
                  {/* Gráfico Comparativo Sanitario */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Descripción</th>
                            <th className="p-3">Dosis</th>
                            <th className="p-3">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {details.historial_salud.ultimos_tratamientos.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">Sin tratamientos registrados en este período.</td>
                            </tr>
                          ) : (
                            details.historial_salud.ultimos_tratamientos.map((t: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/50">
                                <td className="p-3 whitespace-nowrap text-muted-foreground font-medium">{t.fecha}</td>
                                <td className="p-3 font-semibold text-foreground">{t.descripcion}</td>
                                <td className="p-3 text-foreground/80">{t.dosis}</td>
                                <td className="p-3 text-muted-foreground text-xs">{t.observaciones}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-4">Balance de Gestión Sanitaria</h5>
                        <div className="space-y-6">
                          <div>
                            <p className="text-3xl font-extrabold text-emerald-900">{details.historial_salud.total_vacunaciones || 0}</p>
                            <p className="text-xs font-semibold text-emerald-700 mt-1 uppercase tracking-wider">Vacunaciones en el período</p>
                            <div className="w-full bg-emerald-200/50 h-1.5 rounded-full mt-2">
                              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((details.historial_salud.total_vacunaciones || 0) * 10))}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <p className="text-3xl font-extrabold text-teal-900">{details.historial_salud.total_tratamientos || 0}</p>
                            <p className="text-xs font-semibold text-teal-700 mt-1 uppercase tracking-wider">Tratamientos Clínicos</p>
                            <div className="w-full bg-teal-200/50 h-1.5 rounded-full mt-2">
                              <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((details.historial_salud.total_tratamientos || 0) * 10))}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-emerald-600 font-medium mt-6 pt-4 border-t border-emerald-100">
                        * Mide la proactividad e intervenciones aplicadas para mantener el bienestar de tu hato.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Producción y biometría */}
              {details.produccion_y_biometria && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                    Registros Recientes de Controles Biométricos
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Gráfico de Evolución del Peso */}
                    <div className="h-64 w-full bg-secondary/30/50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Evolución de Pesajes en los Controles</h5>
                      {details.produccion_y_biometria.ultimos_controles.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">Sin datos de peso para graficar</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="90%">
                          <AreaChart
                            data={[...details.produccion_y_biometria.ultimos_controles].reverse().map((c: any) => ({
                              fecha: c.fecha,
                              Peso: c.peso_kg
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="fecha" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <ChartTooltip />
                            <Area type="monotone" dataKey="Peso" stroke="#EA580C" strokeWidth={2} fillOpacity={1} fill="url(#colorPeso)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3 text-right">Peso</th>
                            <th className="p-3 text-right">Altura</th>
                            <th className="p-3 text-center">Estado Sanitario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {details.produccion_y_biometria.ultimos_controles.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">Sin controles biométricos registrados.</td>
                            </tr>
                          ) : (
                            details.produccion_y_biometria.ultimos_controles.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/50">
                                <td className="p-3 whitespace-nowrap text-muted-foreground font-medium">{c.fecha}</td>
                                <td className="p-3 text-right font-bold text-foreground">{c.peso_kg} kg</td>
                                <td className="p-3 text-right text-foreground/80">{c.altura_cm} cm</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    c.estado_salud === 'Sano' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                  }`}>
                                    {c.estado_salud}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Gestión de potreros */}
              {details.gestion_potreros && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    Estado Actual de Potreros e Infraestructura
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Potrero</th>
                            <th className="p-3 text-right">Área</th>
                            <th className="p-3 text-right">Capacidad Máxima</th>
                            <th className="p-3 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {details.gestion_potreros.potreros.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-muted-foreground">Sin potreros registrados en esta finca.</td>
                            </tr>
                          ) : (
                            details.gestion_potreros.potreros.map((p: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/50">
                                <td className="p-3 font-semibold text-foreground">{p.nombre}</td>
                                <td className="p-3 text-right text-foreground/80">{p.area_ha} Ha</td>
                                <td className="p-3 text-right font-medium text-foreground/80">{p.capacidad_cabezas} Cabezas</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    p.estado === 'Disponible' || p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-warning/10 text-warning'
                                  }`}>
                                    {p.estado}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="h-64 bg-secondary/30/50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Capacidad y Área de Potreros</h5>
                      {details.gestion_potreros.potreros.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">Sin potreros para graficar</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="90%">
                          <BarChart
                            data={details.gestion_potreros.potreros.map((p: any) => ({
                              name: p.nombre,
                              Capacidad: parseInt(p.capacidad_cabezas || '0', 10),
                              Area: parseFloat(p.area_ha || '0')
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" style={{ fontSize: '9px' }} />
                            <YAxis style={{ fontSize: '9px' }} />
                            <ChartTooltip />
                            <Bar dataKey="Capacidad" fill="#059669" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* 6. Finanzas */}
              {details.finanzas_y_economia && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    Estado Financiero y Economía
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3 text-right">Monto</th>
                            <th className="p-3">Categoría</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {details.finanzas_y_economia.ultimos_movimientos.slice(0, 5).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/50">
                              <td className="p-3 font-medium text-foreground">{m.fecha}</td>
                              <td className="p-3 text-foreground/80">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.tipo === 'INGRESO' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                  {m.tipo}
                                </span>
                              </td>
                              <td className="p-3 text-right font-medium text-foreground/80">${m.monto}</td>
                              <td className="p-3 text-foreground/80">{m.categoria}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="h-64 bg-secondary/30/50 p-4 rounded-xl border border-slate-100">
                       <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Balance General</h5>
                       <ResponsiveContainer width="100%" height="90%">
                          <BarChart data={[
                            { name: 'Ingresos', Monto: details.finanzas_y_economia.ingresos },
                            { name: 'Egresos', Monto: details.finanzas_y_economia.egresos },
                            { name: 'Balance', Monto: details.finanzas_y_economia.balance }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <ChartTooltip />
                            <Bar dataKey="Monto">
                              <Cell fill="#10B981" />
                              <Cell fill="#EF4444" />
                              <Cell fill="#6366F1" />
                            </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Lechería */}
              {details.produccion_lechera && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                    Producción Lechera
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="h-64 bg-secondary/30/50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Litros Producidos por Jornada</h5>
                      <ResponsiveContainer width="100%" height="90%">
                          <AreaChart data={[...details.produccion_lechera.ultimos_ordenos].reverse().map((c: any) => ({
                              fecha: c.fecha,
                              Litros: c.litros
                            }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="fecha" style={{ fontSize: '10px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <ChartTooltip />
                            <Area type="monotone" dataKey="Litros" stroke="#38BDF8" strokeWidth={2} fillOpacity={0.2} fill="#38BDF8" />
                          </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Jornada</th>
                            <th className="p-3 text-right">Litros</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {details.produccion_lechera.ultimos_ordenos.slice(0, 5).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/50">
                              <td className="p-3 font-medium text-foreground">{m.fecha}</td>
                              <td className="p-3 text-foreground/80">{m.jornada}</td>
                              <td className="p-3 text-right font-medium text-sky-600">{m.litros} L</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {/* 8. Agricultura */}
              {details.actividades_agricolas && (
                <div className="space-y-6">
                  <h4 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-lime-500"></span>
                    Estado Agrícola y Cultivos
                  </h4>
                  <div className="grid grid-cols-1 gap-8 items-center">
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Actividad</th>
                            <th className="p-3">Cultivo</th>
                            <th className="p-3 text-right">Costo</th>
                            <th className="p-3">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {details.actividades_agricolas.ultimas_actividades.length === 0 ? (
                            <tr>
                               <td colSpan={5} className="p-4 text-center text-muted-foreground">Sin actividades agrícolas recientes.</td>
                            </tr>
                          ) : (
                            details.actividades_agricolas.ultimas_actividades.slice(0, 5).map((a: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/50">
                                <td className="p-3 font-medium text-foreground">{a.fecha}</td>
                                <td className="p-3 text-foreground/80">{a.tipo}</td>
                                <td className="p-3 font-medium text-lime-600">{a.cultivo}</td>
                                <td className="p-3 text-right text-foreground/80">${a.costo}</td>
                                <td className="p-3 text-foreground/80 text-xs truncate max-w-[150px]">{a.observaciones}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vista Técnica (JSON Acordeón) */}
            <div className="border-t border-gray-150 bg-muted/50 p-4">
              <details className="cursor-pointer group">
                <summary className="text-xs font-bold text-muted-foreground uppercase select-none outline-none flex items-center justify-between">
                  <span>Ver Payload Técnico Completo (JSON)</span>
                  <span className="text-lg transition-transform group-open:rotate-185">▼</span>
                </summary>
                <div className="mt-4 bg-foreground text-blue-300 p-4 rounded-lg overflow-auto max-h-72 text-left shadow-inner">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(generateReport.data, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CustomReports;
