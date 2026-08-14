import { useState, useEffect, useMemo } from 'react';
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
  DollarSign,
  Globe,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi, apiClient } from '@/shared/api/client';
import { useMultiFinca } from '@/features/multi-finca/model/useMultiFinca';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/widgets/feedback/EmptyState';
import { cn } from '@/shared/ui/cn';

/** Formatea números con separadores de es-CO (2.500.000 / 1,5). */
const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const MultiFincaAnalytics = () => {
  const { showToast } = useToast();
  const { switchFinca, switching } = useMultiFinca();
  const navigate = useNavigate();
  const [selectedFincaId, setSelectedFincaId] = useState<number | null>(null);
  const [downloadingGeneral, setDownloadingGeneral] = useState(false);
  const [downloadingFinca, setDownloadingFinca] = useState(false);

  const { data: fincas, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<any[]>({
    queryKey: ['multi_finca_compare'],
    queryFn: async () => {
      const res = await apiFetch({ url: '/multi-finca/compare-kpis' } as any);
      return unwrapApi(res);
    },
  });

  /*
    El backend puede omitir `kpis` o alguna de sus claves cuando una finca todavía no
    tiene movimientos. Normalizamos una sola vez para que el render nunca acceda a
    propiedades de `undefined` ni imprima NaN.

    `net_balance` lo calcula el backend en Decimal y ya viene redondeado a centavos:
    lo usamos tal cual en lugar de restar dos flotantes aquí.
  */
  const rows = useMemo(() => {
    if (!Array.isArray(fincas)) return [];
    return fincas.map((f: any) => {
      const totalIncome = f?.kpis?.total_income ?? 0;
      const totalExpenses = f?.kpis?.total_expenses ?? 0;
      return {
        ...f,
        finca_type: f?.finca_type || 'Sin tipo',
        finca_is_active: f?.finca_is_active !== false,
        role: f?.role || 'Sin rol',
        kpis: {
          total_animals: f?.kpis?.total_animals ?? 0,
          total_animals_females: f?.kpis?.total_animals_females ?? 0,
          total_animals_males: f?.kpis?.total_animals_males ?? 0,
          total_milk_liters: f?.kpis?.total_milk_liters ?? 0,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_balance: f?.kpis?.net_balance ?? totalIncome - totalExpenses,
          total_fields: f?.kpis?.total_fields ?? 0,
          total_fields_area: f?.kpis?.total_fields_area ?? 0,
        },
      };
    });
  }, [fincas]);

  useEffect(() => {
    if (rows.length > 0 && selectedFincaId === null) {
      setSelectedFincaId(rows[0].finca_id);
    }
  }, [rows, selectedFincaId]);

  const consolidatedTotals = useMemo(
    () =>
      rows.reduce(
        (acc, f) => {
          acc.farms += 1;
          if (f.finca_is_active) acc.activeFarms += 1;
          acc.animals += f.kpis.total_animals;
          acc.milk += f.kpis.total_milk_liters;
          acc.balance += f.kpis.net_balance;
          acc.area += f.kpis.total_fields_area;
          return acc;
        },
        { farms: 0, activeFarms: 0, animals: 0, milk: 0, balance: 0, area: 0 }
      ),
    [rows]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-[60vh] text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium animate-pulse">Cargando vista panorámica de fincas...</p>
      </div>
    );
  }

  if (error || !Array.isArray(fincas)) {
    return (
      <div className="p-6 sm:p-12 text-center max-w-md mx-auto">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Error al cargar datos</h2>
        <p className="text-muted-foreground mb-6">
          No pudimos cargar los KPIs comparativos de las fincas en este momento.
        </p>
        <Button onClick={() => refetch()} loading={isFetching} variant="outline" className="gap-2">
          Reintentar
        </Button>
      </div>
    );
  }

  const selectedFinca = rows.find((f) => f.finca_id === selectedFincaId);

  // Encontrar el máximo para graficar barras relativas
  const maxAnimals = Math.max(...rows.map((f: any) => f.kpis.total_animals), 1);
  const maxMilk = Math.max(...rows.map((f: any) => f.kpis.total_milk_liters), 1);

  const openCreateFinca = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('modal', 'create-finca');
    navigate(`${window.location.pathname}?${params.toString()}`);
  };

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

  const rootClassName =
    'min-h-full p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden bg-gradient-to-br from-background via-background to-emerald-950/5';

  const pageHeader = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-2xl border border-emerald-500/20 shadow-sm shrink-0">
            <Globe className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[clamp(1.375rem,4vw,1.875rem)] font-extrabold tracking-tight text-foreground break-words">
              Vista Panorámica Multi-Finca
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Panel Consolidado del Propietario
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Supervisa el inventario ganadero, la producción lechera y los balances financieros acumulados de todos tus predios.
        </p>
        {/* La consulta no se refresca sola: mostramos de cuándo son los datos
            en lugar de afirmar que están al segundo. */}
        {dataUpdatedAt > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Datos consultados a las{' '}
            {new Date(dataUpdatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            <button
              type="button"
              onClick={() => refetch()}
              className="underline underline-offset-2 hover:text-foreground font-semibold"
            >
              Actualizar
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <Button
          onClick={openCreateFinca}
          variant="outline"
          className="flex-1 md:flex-none gap-2 font-bold text-xs uppercase tracking-wider border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Finca
        </Button>
        <Button
          onClick={handleDownloadGeneral}
          loading={downloadingGeneral}
          disabled={rows.length === 0}
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
          className="flex-1 md:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          size="sm"
        >
          <FileText className="w-4 h-4" />
          PDF Finca Seleccionada
        </Button>
      </div>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className={rootClassName}>
        {pageHeader}
        <EmptyState
          icon={<Building2 className="w-10 h-10 text-primary opacity-80" />}
          title="Todavía no hay fincas para comparar"
          description="Cuando registres tu primera finca verás aquí el consolidado de hato, ordeño y balance de todos tus predios."
          actionLabel="Crear finca"
          onAction={openCreateFinca}
        />
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      {pageHeader}

      {/* Resumen Panorámico Consolidado (Totales de todas las fincas) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        <Card className="border border-emerald-500/20 bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-md hover:shadow-xl hover:-translate-y-1 rounded-2xl transition-all duration-300 hover:border-emerald-500/50 group">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 [&>svg]:shrink-0">
            <Building2 className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
            Fincas Activas
          </div>
          <p className="text-[clamp(1.375rem,3vw,1.875rem)] font-black text-foreground break-words">{formatNumber(consolidatedTotals.activeFarms)}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
            {consolidatedTotals.activeFarms === consolidatedTotals.farms
              ? 'Predios bajo gestión'
              : `de ${formatNumber(consolidatedTotals.farms)} predios con acceso`}
          </p>
        </Card>

        <Card className="border border-info/20 bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-md hover:shadow-xl hover:-translate-y-1 rounded-2xl transition-all duration-300 hover:border-info/50 group">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 [&>svg]:shrink-0">
            <BarChart3 className="w-5 h-5 text-info group-hover:scale-110 transition-transform" />
            Hato Bovino
          </div>
          <p className="text-[clamp(1.375rem,3vw,1.875rem)] font-black text-foreground break-words">{formatNumber(consolidatedTotals.animals)}</p>
          <p className="text-xs text-info font-semibold mt-2">Cabezas vivas totales</p>
        </Card>

        <Card className="border border-sky-500/20 bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-md hover:shadow-xl hover:-translate-y-1 rounded-2xl transition-all duration-300 hover:border-sky-500/50 group">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 [&>svg]:shrink-0">
            <Milk className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
            Leche Acumulada
          </div>
          <p className="text-[clamp(1.375rem,3vw,1.875rem)] font-black text-foreground break-words">{formatNumber(consolidatedTotals.milk)} L</p>
          <p className="text-xs text-sky-700 dark:text-sky-400 font-semibold mt-2">Litros ordeñados</p>
        </Card>

        <Card className="border border-emerald-500/20 bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-md hover:shadow-xl hover:-translate-y-1 rounded-2xl transition-all duration-300 hover:border-emerald-500/50 group">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 [&>svg]:shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
            Balance Neto
          </div>
          <p className={cn(
            "text-[clamp(1.375rem,3vw,1.875rem)] font-black break-words",
            consolidatedTotals.balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
          )}>
            ${formatNumber(consolidatedTotals.balance)}
          </p>
          <p className="text-xs text-muted-foreground font-semibold mt-2">Consolidado general</p>
        </Card>

        <Card className="border border-primary/20 bg-card/80 backdrop-blur-md p-5 sm:p-6 shadow-md hover:shadow-xl hover:-translate-y-1 rounded-2xl transition-all duration-300 hover:border-primary/50 col-span-2 sm:col-span-1 group">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 [&>svg]:shrink-0">
            <Trees className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            Extensión Predial
          </div>
          <p className="text-[clamp(1.375rem,3vw,1.875rem)] font-black text-foreground break-words">{formatNumber(consolidatedTotals.area, 1)} ha</p>
          <p className="text-xs text-primary font-semibold mt-2">Hectáreas totales</p>
        </Card>
      </div>


      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Animal Inventory */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10 text-info shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-bold">Total Animales Activos</CardTitle>
                <CardDescription>Distribución comparativa de animales vivos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((finca: any) => (
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
                <div className="flex justify-between gap-3 text-sm font-medium mb-2">
                  <span className="text-foreground/80 flex items-center gap-1.5 min-w-0 break-words">
                    {finca.finca_name}
                    {selectedFincaId === finca.finca_id && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                    )}
                  </span>
                  <span className="text-info font-semibold shrink-0">
                    {finca.kpis.total_animals.toLocaleString('es-CO')} cabezas
                  </span>
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
          </CardContent>
        </Card>

        {/* Chart 2: Milk Production */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-sm shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
                <Milk className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-bold">Producción Histórica de Leche</CardTitle>
                <CardDescription>Litros totales producidos por finca</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((finca: any) => (
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
                <div className="flex justify-between gap-3 text-sm font-medium mb-2">
                  <span className="text-foreground/80 flex items-center gap-1.5 min-w-0 break-words">
                    {finca.finca_name}
                    {selectedFincaId === finca.finca_id && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                    )}
                  </span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold shrink-0">
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
            <Card className="lg:col-span-1 border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-xl rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-primary/10">
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
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">Tipo de Finca:</span>
                    <span className="font-semibold text-foreground text-right break-words">{selectedFinca.finca_type}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">Potreros:</span>
                    <span className="font-semibold text-foreground text-right">
                      {formatNumber(selectedFinca.kpis.total_fields)} potreros
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">Extensión:</span>
                    <span className="font-semibold text-foreground text-right">
                      {formatNumber(selectedFinca.kpis.total_fields_area, 1)} ha
                    </span>
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
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Animals breakdown */}
              <Card className="border border-border/40 shadow-md hover:shadow-lg rounded-2xl transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Inventario Detallado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-foreground">
                      {formatNumber(selectedFinca.kpis.total_animals)}
                    </span>
                    <span className="text-xs font-semibold text-info bg-info/10 px-2 py-0.5 rounded-full shrink-0">Activos</span>
                  </div>

                  {/* Sin animales la barra queda vacía: pintar mitad y mitad sugeriría
                      una distribución de sexos que no existe en la base. */}
                  <div className="space-y-2">
                    <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                      <span>Hembras ({formatNumber(selectedFinca.kpis.total_animals_females)})</span>
                      <span>Machos ({formatNumber(selectedFinca.kpis.total_animals_males)})</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 flex overflow-hidden">
                      <div
                        className="bg-pink-400 h-full"
                        style={{
                          width: `${selectedFinca.kpis.total_animals > 0
                            ? (selectedFinca.kpis.total_animals_females / selectedFinca.kpis.total_animals) * 100
                            : 0}%`
                        }}
                      />
                      <div
                        className="bg-info h-full"
                        style={{
                          width: `${selectedFinca.kpis.total_animals > 0
                            ? (selectedFinca.kpis.total_animals_males / selectedFinca.kpis.total_animals) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                    {selectedFinca.kpis.total_animals === 0 && (
                      <p className="text-xs text-muted-foreground">Sin animales vivos registrados.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hectares & Land usage */}
              <Card className="border border-border/40 shadow-md hover:shadow-lg rounded-2xl transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Uso de Suelo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-foreground">
                      {formatNumber(selectedFinca.kpis.total_fields_area, 1)} ha
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                      Área Total
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trees className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{formatNumber(selectedFinca.kpis.total_fields)} potreros delimitados</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Promedio por potrero: <span className="font-semibold text-foreground">
                      {selectedFinca.kpis.total_fields > 0
                        ? formatNumber(selectedFinca.kpis.total_fields_area / selectedFinca.kpis.total_fields, 2)
                        : '0'} ha
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Balance */}
              <Card className="border border-border/40 shadow-md hover:shadow-lg rounded-2xl sm:col-span-2 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rendimiento Financiero</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Balance General</span>
                    {(() => {
                      const balance = selectedFinca.kpis.net_balance;
                      const isPositive = balance >= 0;
                      return (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[clamp(1.5rem,3.5vw,1.875rem)] font-black break-words min-w-0",
                            isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                          )}>
                            ${formatNumber(balance, 2)}
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
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 break-words">
                        ${formatNumber(selectedFinca.kpis.total_income, 2)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-destructive" />
                        Egresos Totales
                      </span>
                      <span className="text-lg font-bold text-destructive break-words">
                        ${formatNumber(selectedFinca.kpis.total_expenses, 2)}
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
      <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
        <div className="p-5 sm:p-6 lg:p-8 border-b border-border bg-card/60 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-foreground">Tabla Comparativa</h2>
          <p className="text-xs text-muted-foreground mt-1">Haz clic en cualquier finca para ver los detalles completos y gestionarla.</p>
        </div>
        {/* min-w fuerza el scroll horizontal en móvil en vez de comprimir las columnas. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse">
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
              {rows.map((f: any) => {
                const balance = f.kpis.net_balance;
                return (
                  <tr
                    key={f.finca_id}
                    onClick={() => setSelectedFincaId(f.finca_id)}
                    className={cn(
                      "hover:bg-muted/50 cursor-pointer transition-colors duration-150",
                      selectedFincaId === f.finca_id ? "bg-primary/5" : ""
                    )}
                  >
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2 flex-wrap">
                        {f.finca_name}
                        {selectedFincaId === f.finca_id && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
                            Seleccionada
                          </span>
                        )}
                        {!f.finca_is_active && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-950 rounded-full">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{f.finca_type}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {f.municipality && f.department ? `${f.municipality}, ${f.department}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{formatNumber(f.kpis.total_animals)}</td>
                    <td className="px-6 py-4 text-right font-medium text-sky-700 dark:text-sky-400">
                      {formatNumber(f.kpis.total_milk_liters)}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-bold whitespace-nowrap",
                      balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    )}>
                      ${formatNumber(balance, 2)}
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
