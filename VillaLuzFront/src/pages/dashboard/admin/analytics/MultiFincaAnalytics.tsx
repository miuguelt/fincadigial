import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  BarChart3, 
  MapPin, 
  TrendingUp, 
  Trees, 
  Milk, 
  FileText, 
  Sparkles, 
  UserCheck, 
  Download, 
  Loader2, 
  ChevronRight,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi, apiClient } from '@/shared/api/client';
import { useMultiFinca } from '@/features/multi-finca/model/useMultiFinca';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

const MultiFincaAnalytics = () => {
  const { showToast } = useToast();
  const { switchFinca, switching } = useMultiFinca();
  const [selectedFincaId, setSelectedFincaId] = useState<number | null>(null);
  const [downloadingGeneral, setDownloadingGeneral] = useState(false);
  const [downloadingFinca, setDownloadingFinca] = useState(false);

  const { data: fincas, isLoading, error } = useQuery<any[]>({
    queryKey: ['multi_finca_compare'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/multi-finca/compare-kpis' } as any);
      return unwrapApi(res);
    },
  });

  useEffect(() => {
    if (fincas && fincas.length > 0 && selectedFincaId === null) {
      setSelectedFincaId(fincas[0].finca_id);
    }
  }, [fincas, selectedFincaId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-[60vh] text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium animate-pulse">Cargando métricas multi-finca...</p>
      </div>
    );
  }

  if (error || !fincas) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Error al cargar datos</h2>
        <p className="text-muted-foreground mb-6">No pudimos cargar los KPIs comparativos de las fincas en este momento.</p>
      </div>
    );
  }

  const selectedFinca = fincas.find((f) => f.finca_id === selectedFincaId);

  // Encontrar el máximo para graficar barras relativas
  const maxAnimals = Math.max(...fincas.map((f: any) => f.kpis.total_animals), 1);
  const maxMilk = Math.max(...fincas.map((f: any) => f.kpis.total_milk_liters), 1);

  const handleDownloadGeneral = async () => {
    setDownloadingGeneral(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `reporte_general_multi_finca_${dateStr}.pdf`;
      const response = await apiClient.get('/exports/multi-finca-general.pdf', { responseType: 'blob' } as any);
      const blob = (response as any).data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Reporte general descargado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al descargar el reporte general', 'error');
    } finally {
      setDownloadingGeneral(false);
    }
  };

  const handleDownloadFinca = async (fincaId: number, fincaName: string) => {
    setDownloadingFinca(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const cleanFincaName = fincaName.replace(/\s+/g, '_');
      const filename = `reporte_finca_${cleanFincaName}_${dateStr}.pdf`;
      const response = await apiClient.get(`/exports/finca/${fincaId}/report.pdf`, { responseType: 'blob' } as any);
      const blob = (response as any).data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Reporte de finca ${fincaName} descargado con éxito`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al descargar el reporte de finca', 'error');
    } finally {
      setDownloadingFinca(false);
    }
  };

  return (
    <div className="p-6 space-y-8 h-full overflow-auto bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 text-primary p-2 rounded-xl">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Analítica Multi-Finca</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Compara rendimientos, inventarios y finanzas en tiempo real de todas tus fincas activas. Selecciona una finca para ver su detalle ejecutivo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button 
            onClick={handleDownloadGeneral} 
            loading={downloadingGeneral}
            variant="outline"
            className="flex-1 md:flex-none gap-2 hover:bg-muted/50 border-primary/20 hover:border-primary"
            size="sm"
          >
            <Download className="w-4 h-4 text-primary" />
            Reporte General PDF
          </Button>
          <Button 
            onClick={() => selectedFinca && handleDownloadFinca(selectedFinca.finca_id, selectedFinca.finca_name)} 
            loading={downloadingFinca}
            disabled={!selectedFincaId}
            className="flex-1 md:flex-none gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            size="sm"
          >
            <FileText className="w-4 h-4" />
            PDF Finca Seleccionada
          </Button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Animal Inventory */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10 text-info">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Total Animales Activos</CardTitle>
                <CardDescription>Distribución comparativa de animales vivos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {fincas.map((finca: any) => (
              <div 
                key={`anim-${finca.finca_id}`}
                onClick={() => setSelectedFincaId(finca.finca_id)}
                className={cn(
                  "p-3 rounded-lg border border-transparent transition-all cursor-pointer",
                  selectedFincaId === finca.finca_id 
                    ? "bg-primary/5 border-primary/20 shadow-sm" 
                    : "hover:bg-muted/40"
                )}
              >
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-foreground/80 flex items-center gap-1.5">
                    {finca.finca_name}
                    {selectedFincaId === finca.finca_id && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    )}
                  </span>
                  <span className="text-info font-semibold">{finca.kpis.total_animals} cabezas</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div 
                    className="bg-info h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(finca.kpis.total_animals / maxAnimals) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
            {fincas.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No hay fincas para comparar.</p>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Milk Production */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                <Milk className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Producción Histórica de Leche</CardTitle>
                <CardDescription>Litros totales producidos por finca</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {fincas.map((finca: any) => (
              <div 
                key={`milk-${finca.finca_id}`}
                onClick={() => setSelectedFincaId(finca.finca_id)}
                className={cn(
                  "p-3 rounded-lg border border-transparent transition-all cursor-pointer",
                  selectedFincaId === finca.finca_id 
                    ? "bg-primary/5 border-primary/20 shadow-sm" 
                    : "hover:bg-muted/40"
                )}
              >
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-foreground/80 flex items-center gap-1.5">
                    {finca.finca_name}
                    {selectedFincaId === finca.finca_id && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    )}
                  </span>
                  <span className="text-sky-600 font-semibold">
                    {finca.kpis.total_milk_liters.toLocaleString('es-CO')} L
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div 
                    className="bg-sky-400 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(finca.kpis.total_milk_liters / maxMilk) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
            {fincas.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No hay fincas para comparar.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Finca Detail Panel & Switcher */}
      <AnimatePresence mode="wait">
        {selectedFinca && (
          <motion.div
            key={selectedFinca.finca_id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Info Card */}
            <Card className="lg:col-span-1 border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-primary/10">
                <Sparkles className="w-20 h-20" />
              </div>
              <CardHeader className="relative">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Rol: {selectedFinca.role}
                </div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {selectedFinca.finca_name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {selectedFinca.municipality && selectedFinca.department
                    ? `${selectedFinca.municipality}, ${selectedFinca.department}`
                    : 'Ubicación no especificada'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                <div className="border-t border-border pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo de Finca:</span>
                    <span className="font-semibold text-foreground">{selectedFinca.finca_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Potreros:</span>
                    <span className="font-semibold text-foreground">{selectedFinca.kpis.total_fields} potreros</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extensión:</span>
                    <span className="font-semibold text-foreground">{selectedFinca.kpis.total_fields_area.toFixed(1)} ha</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Button
                    onClick={() => switchFinca(selectedFinca.finca_id)}
                    loading={switching}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5 shadow-md hover:shadow-lg transition-all"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Establecer como Finca Activa
                  </Button>
                  <Button
                    onClick={() => handleDownloadFinca(selectedFinca.finca_id, selectedFinca.finca_name)}
                    loading={downloadingFinca}
                    variant="outline"
                    className="w-full border-border/80 text-muted-foreground hover:text-foreground"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Ficha PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPIs Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Animals breakdown */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Inventario Detallado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-foreground">{selectedFinca.kpis.total_animals}</span>
                    <span className="text-xs font-semibold text-info bg-info/10 px-2 py-0.5 rounded-full">Activos</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Hembras ({selectedFinca.kpis.total_animals_females})</span>
                      <span>Machos ({selectedFinca.kpis.total_animals_males})</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 flex overflow-hidden">
                      <div 
                        className="bg-pink-400 h-full"
                        style={{ 
                          width: `${selectedFinca.kpis.total_animals > 0 
                            ? (selectedFinca.kpis.total_animals_females / selectedFinca.kpis.total_animals) * 100 
                            : 50}%` 
                        }}
                      />
                      <div 
                        className="bg-info h-full"
                        style={{ 
                          width: `${selectedFinca.kpis.total_animals > 0 
                            ? (selectedFinca.kpis.total_animals_males / selectedFinca.kpis.total_animals) * 100 
                            : 50}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hectares & Land usage */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Uso de Suelo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-foreground">{selectedFinca.kpis.total_fields_area.toFixed(1)} ha</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Área Total</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trees className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{selectedFinca.kpis.total_fields} potreros delimitados</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Promedio por potrero: <span className="font-semibold text-foreground">
                      {selectedFinca.kpis.total_fields > 0 
                        ? (selectedFinca.kpis.total_fields_area / selectedFinca.kpis.total_fields).toFixed(2)
                        : '0'} ha
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Balance */}
              <Card className="border border-border/40 shadow-sm sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rendimiento Financiero</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Balance General</span>
                    {(() => {
                      const balance = selectedFinca.kpis.total_income - selectedFinca.kpis.total_expenses;
                      const isPositive = balance >= 0;
                      return (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-3xl font-black",
                            isPositive ? "text-emerald-600" : "text-destructive"
                          )}>
                            ${balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isPositive ? (
                            <TrendingUp className="w-6 h-6 text-emerald-500 shrink-0" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-destructive shrink-0" />
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-4 col-span-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        Ingresos Totales
                      </span>
                      <span className="text-lg font-bold text-emerald-600">
                        ${selectedFinca.kpis.total_income.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-destructive" />
                        Egresos Totales
                      </span>
                      <span className="text-lg font-bold text-destructive">
                        ${selectedFinca.kpis.total_expenses.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparative Table */}
      <div className="bg-card rounded-xl border border-border/40 shadow-md overflow-hidden">
        <div className="p-6 border-b border-border bg-card/60">
          <h2 className="text-xl font-bold text-foreground">Tabla Comparativa</h2>
          <p className="text-xs text-muted-foreground mt-1">Haz clic en cualquier finca para ver los detalles completos y gestionarla.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-6 py-4">Finca</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4 text-right">Animales</th>
                <th className="px-6 py-4 text-right">Leche Total (L)</th>
                <th className="px-6 py-4 text-right">Balance Neto ($)</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {fincas.map((f: any) => {
                const balance = f.kpis.total_income - f.kpis.total_expenses;
                return (
                  <tr 
                    key={f.finca_id} 
                    onClick={() => setSelectedFincaId(f.finca_id)}
                    className={cn(
                      "hover:bg-muted/50 cursor-pointer transition-colors duration-150",
                      selectedFincaId === f.finca_id ? "bg-primary/5" : ""
                    )}
                  >
                    <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                      {f.finca_name}
                      {selectedFincaId === f.finca_id && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
                          Seleccionada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{f.finca_type}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {f.municipality && f.department ? `${f.municipality}, ${f.department}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{f.kpis.total_animals}</td>
                    <td className="px-6 py-4 text-right font-medium text-sky-600">
                      {f.kpis.total_milk_liters.toLocaleString('es-CO')}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-bold",
                      balance >= 0 ? "text-emerald-600" : "text-destructive"
                    )}>
                      ${balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFincaId(f.finca_id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MultiFincaAnalytics;
