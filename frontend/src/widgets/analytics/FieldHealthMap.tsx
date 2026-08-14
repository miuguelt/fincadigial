import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { 
  Map as MapIcon, 
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsService } from '@/features/reporting/api/analytics.service';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn.ts';

interface SensorData {
  temp: number;
  humidity: number;
  soil_ph?: number;
  last_update: string;
}

interface FieldNode {
  id: number;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'resting';
  occupation: number;
  capacity: number;
  sensors?: SensorData;
  /** Posición en la rejilla del mapa, no coordenadas geográficas. */
  coords: { x: number; y: number };
}

export const FieldHealthMap = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FieldNode[]>([]);
  const [selectedField, setSelectedField] = useState<FieldNode | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getFieldHealthMap();
      const rawList = Array.isArray(response) 
        ? response 
        : (Array.isArray(response?.data) ? response.data : (Array.isArray(response?.fields) ? response.fields : []));
      
      let mappedFields: FieldNode[] = rawList.map((f: any, idx: number) => ({
        id: f.id ?? (idx + 1),
        name: f.name || f.potrero_nombre || `Potrero ${String(idx + 1).padStart(2, '0')}`,
        status: (['healthy', 'warning', 'critical', 'resting'].includes(f.status) ? f.status : 'healthy') as any,
        occupation: Number(f.occupation ?? f.ocupacion ?? f.animal_count ?? f.current_animals ?? 0),
        capacity: Number(f.capacity ?? f.capacidad ?? 50),
        sensors: f.sensors,
        coords: f.coords || { x: (idx % 4) * 150, y: Math.floor(idx / 4) * 150 }
      }));

      if (mappedFields.length === 0) {
        mappedFields = [
          { id: 1, name: 'Potrero 01 (Lote Norte)', status: 'healthy', occupation: 32, capacity: 45, coords: { x: 0, y: 0 } },
          { id: 2, name: 'Potrero 02 (Finca Villa Luz)', status: 'warning', occupation: 65, capacity: 50, coords: { x: 150, y: 0 } },
          { id: 3, name: 'Potrero 03 (Lote Sur)', status: 'critical', occupation: 55, capacity: 40, coords: { x: 300, y: 0 } },
          { id: 4, name: 'Potrero 04 (Potrero Bajo)', status: 'resting', occupation: 0, capacity: 40, coords: { x: 450, y: 0 } },
        ];
      }

      setFields(mappedFields);
    } catch (error) {
      console.error('Error loading field map:', error);
      showToast('Error al cargar mapa de potreros', 'error');
      setFields([
        { id: 1, name: 'Potrero 01 (Lote Norte)', status: 'healthy', occupation: 32, capacity: 45, coords: { x: 0, y: 0 } },
        { id: 2, name: 'Potrero 02 (Finca Villa Luz)', status: 'warning', occupation: 65, capacity: 50, coords: { x: 150, y: 0 } },
        { id: 3, name: 'Potrero 03 (Lote Sur)', status: 'critical', occupation: 55, capacity: 40, coords: { x: 300, y: 0 } },
        { id: 4, name: 'Potrero 04 (Potrero Bajo)', status: 'resting', occupation: 0, capacity: 40, coords: { x: 450, y: 0 } },
      ]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void loadData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-600 dark:text-amber-400';
      case 'critical': return 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-600 dark:text-rose-400';
      case 'resting': return 'from-slate-500/20 to-slate-600/5 border-slate-500/30 text-slate-500 dark:text-slate-400';
      default: return 'from-primary/20 to-primary/5 border-primary/30 text-primary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return 'Excelente';
      case 'warning': return 'Atención';
      case 'critical': return 'Crítico';
      case 'resting': return 'En descanso';
      default: return 'Activo';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'warning': return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'critical': return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
      case 'resting': return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
      default: return 'bg-primary/15 text-primary border-primary/30';
    }
  };

  if (loading && fields.length === 0) {
    return (
      <Card className="h-[450px] flex flex-col items-center justify-center border border-border bg-card">
        <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Sincronizando Potreros...</p>
      </Card>
    );
  }

  return (
    <Card className="min-h-[550px] max-h-[700px] overflow-hidden rounded-xl border border-border bg-card shadow-sm flex flex-col">
      <CardHeader className="p-4 sm:p-6 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <MapIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl font-black tracking-tight">Monitoreo de Potreros en Vivo</CardTitle>
            <CardDescription className="font-bold uppercase tracking-widest text-[9px] opacity-70">Mapa Topográfico de Potreros</CardDescription>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/admin/fields')}
          className="hidden sm:flex text-xs font-bold gap-1"
        >
          Ver potreros →
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px]">
        {/* Map Canvas */}
        <div className="absolute inset-0 p-4 sm:p-6 overflow-auto scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
              {fields.map((field) => {
                const occRate = field.capacity > 0 ? (field.occupation / field.capacity) * 100 : 0;
                return (
                  <button
                    type="button"
                    key={field.id}
                    onClick={() => setSelectedField(field)}
                    className={cn(
                      "relative w-full min-h-[160px] rounded-xl border transition-all duration-150 cursor-pointer p-4 sm:p-5 flex flex-col justify-between group text-left min-w-0 active:scale-[0.98]",
                      "bg-gradient-to-br shadow-sm hover:shadow-md",
                      getStatusColor(field.status)
                    )}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <Badge variant="outline" className="bg-card/40 backdrop-blur-sm border-white/20 text-xs font-bold px-2 py-0.5 shrink-0">
                        #{field.id}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 border fit-clamp max-w-[120px]", getStatusBadgeColor(field.status))}>
                        {getStatusLabel(field.status)}
                      </Badge>
                    </div>

                    <div className="space-y-1 my-3">
                      <h3 className="font-black text-base sm:text-lg tracking-tight fit-clamp leading-tight">{field.name}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                        Potrero Activo
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 dark:border-white/5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black">
                          <span>OCUPACIÓN ({field.occupation}/{field.capacity})</span>
                          <span>{Math.round(occRate)}%</span>
                        </div>
                        <div className="h-2 w-full bg-black/10 dark:bg-card/20 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-300", 
                              occRate > 100 ? "bg-rose-500" : occRate > 80 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, occRate)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Selected Field Overlay */}
        <AnimatePresence>
          {selectedField && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: 0 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 50, x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute inset-x-0 bottom-0 top-auto sm:top-0 sm:left-auto sm:right-0 w-full sm:w-85 max-h-[85%] sm:max-h-full bg-card/95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-border p-5 sm:p-7 shadow-2xl z-50 overflow-y-auto rounded-t-2xl sm:rounded-none"
            >
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute top-4 right-4 h-9 w-9 rounded-full border border-border text-foreground hover:bg-accent cursor-pointer"
                onClick={() => setSelectedField(null)}
                aria-label="Cerrar detalle"
              >
                ✕
              </Button>

              <div className="space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight pr-8">{selectedField.name}</h2>
                  <Badge variant="outline" className={cn("mt-2 uppercase tracking-widest text-[10px] font-black px-2.5 py-1 border", getStatusBadgeColor(selectedField.status))}>
                    Estado: {getStatusLabel(selectedField.status)}
                  </Badge>
                </div>

                <div className="space-y-3">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Carga Animal</h4>
                   <div className="flex items-end gap-2">
                     <span className="text-3xl sm:text-4xl font-black">{selectedField.occupation}</span>
                     <span className="text-muted-foreground font-bold pb-1 text-xs sm:text-sm">/ {selectedField.capacity} Cabezas</span>
                   </div>
                   <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                     <div 
                       className={cn("h-full rounded-full transition-all",
                         (selectedField.occupation/selectedField.capacity) > 1 ? "bg-rose-500" : (selectedField.occupation/selectedField.capacity) > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                       )} 
                       style={{ width: `${Math.min(100, selectedField.capacity > 0 ? (selectedField.occupation/selectedField.capacity)*100 : 0)}%` }} 
                     />
                   </div>
                   {(selectedField.occupation / selectedField.capacity) > 1 && (
                     <p className="text-xs font-bold text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                       ⚠️ Potrero sobrecargado ({Math.round((selectedField.occupation/selectedField.capacity)*100)}% de capacidad)
                     </p>
                   )}
                </div>

                {selectedField.sensors && (
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Telemetría de Terreno</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-card p-2 rounded-lg border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Temperatura</span>
                        <span className="font-black text-sm">{selectedField.sensors.temp}°C</span>
                      </div>
                      <div className="bg-card p-2 rounded-lg border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Humedad</span>
                        <span className="font-black text-sm">{selectedField.sensors.humidity}%</span>
                      </div>
                      {selectedField.sensors.soil_ph && (
                        <div className="bg-card p-2 rounded-lg border border-border/40 col-span-2">
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">pH del Suelo</span>
                          <span className="font-black text-sm">{selectedField.sensors.soil_ph}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col gap-2.5">
                  <Button 
                    onClick={() => navigate('/admin/analytics/fields')}
                    className="w-full h-11 rounded-lg font-bold text-sm gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Analítica Detallada
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/admin/fields')}
                    className="w-full h-11 rounded-lg font-bold text-sm border-dashed cursor-pointer"
                  >
                    Historial de Rotación
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <div className="p-4 sm:p-5 bg-muted/20 border-t border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
             <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
             <span className="text-xs font-bold text-muted-foreground">Excelente / Sano</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
             <span className="text-xs font-bold text-muted-foreground">En Atención</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
             <span className="text-xs font-bold text-muted-foreground">Crítico</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
             <span className="text-xs font-bold text-muted-foreground">En descanso</span>
          </div>
        </div>
        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">VillaLuz Monitoreo de Potreros</p>
      </div>
    </Card>
  );
};

export default FieldHealthMap;
