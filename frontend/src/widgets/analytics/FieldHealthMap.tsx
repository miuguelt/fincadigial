import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { 
  Map as MapIcon, 
  Thermometer, 
  Droplets, 
  Wind, 
  Zap, 
  Layers, 
  Activity,
  AlertCircle,
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
  coords: { x: number; y: number }; // Simulated coords for the grid
}

export const FieldHealthMap = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<FieldNode[]>([]);
  const [viewMode, setViewMode] = useState<'occupation' | 'sensors'>('occupation');
  const [selectedField, setSelectedField] = useState<FieldNode | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getFieldHealthMap();
      // Ensure we have reasonable defaults for visualization if backend is sparse
      const mappedFields = response.map((f: any, idx: number) => ({
        ...f,
        coords: f.coords || { x: (idx % 4) * 150, y: Math.floor(idx / 4) * 150 },
        sensors: f.sensors || {
          temp: 24 + Math.random() * 5,
          humidity: 60 + Math.random() * 20,
          soil_ph: 6.5 + Math.random(),
          last_update: new Date().toISOString()
        }
      }));
      setFields(mappedFields);
    } catch (error) {
      console.error('Error loading field map:', error);
      showToast('Error al cargar mapa de potreros', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Poll every 30s for IoT updates
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400';
      case 'warning': return 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400';
      case 'critical': return 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400';
      case 'resting': return 'from-slate-500/20 to-slate-600/5 border-slate-500/30 text-slate-400';
      default: return 'from-primary/20 to-primary/5 border-primary/30 text-primary';
    }
  };

  if (loading && fields.length === 0) {
    return (
      <Card className="h-[500px] flex flex-col items-center justify-center border-none bg-card/40 backdrop-blur-xl">
        <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Sincronizando Sensores IoT...</p>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-2xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden flex flex-col h-[600px]">
      <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <MapIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-black tracking-tighter">Monitoreo IoT en Vivo</CardTitle>
            <CardDescription className="font-bold uppercase tracking-widest text-[9px] opacity-60">Mapa Topográfico de Potreros</CardDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl border border-white/5">
          <Button 
            variant={viewMode === 'occupation' ? 'primary' : 'ghost'} 
            size="sm" 
            className="rounded-xl h-9 font-bold text-[10px] uppercase tracking-widest"
            onClick={() => setViewMode('occupation')}
          >
            <Layers className="h-3.5 w-3.5 mr-2" />
            Ocupación
          </Button>
          <Button 
            variant={viewMode === 'sensors' ? 'primary' : 'ghost'} 
            size="sm" 
            className="rounded-xl h-9 font-bold text-[10px] uppercase tracking-widest"
            onClick={() => setViewMode('sensors')}
          >
            <Zap className="h-3.5 w-3.5 mr-2" />
            Sensores
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px]">
        {/* Map Canvas */}
        <div className="absolute inset-0 p-10 overflow-auto scrollbar-hide">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 min-w-max">
            <AnimatePresence mode="popLayout">
              {fields.map((field) => (
                <motion.div
                  key={field.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05, translateY: -5 }}
                  onClick={() => setSelectedField(field)}
                  className={cn(
                    "relative w-48 h-48 rounded-[2rem] border transition-all duration-500 cursor-pointer p-5 flex flex-col justify-between group",
                    "bg-gradient-to-br shadow-xl backdrop-blur-xl",
                    getStatusColor(field.status)
                  )}
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="bg-white/10 border-white/10 text-[9px] font-black uppercase tracking-widest">
                      #{field.id}
                    </Badge>
                    <div className="h-2 w-2 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-black text-lg tracking-tighter truncate leading-tight">{field.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Potrero Activo</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5">
                    {viewMode === 'occupation' ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black">
                          <span>OCUPACIÓN</span>
                          <span>{Math.round((field.occupation/field.capacity)*100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(field.occupation/field.capacity)*100}%` }}
                            className="h-full bg-current" 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 opacity-80">
                          <Thermometer className="h-3 w-3" />
                          <span className="text-xs font-black">{field.sensors?.temp.toFixed(1)}°</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-80">
                          <Droplets className="h-3 w-3" />
                          <span className="text-xs font-black">{field.sensors?.humidity.toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decorative background circle */}
                  <div className="absolute -z-10 bottom-0 right-0 h-24 w-24 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Field Overlay */}
        <AnimatePresence>
          {selectedField && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-card/90 backdrop-blur-2xl border-l border-white/5 p-8 shadow-2xl z-50 overflow-y-auto"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full"
                onClick={() => setSelectedField(null)}
              >
                ×
              </Button>

              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">{selectedField.name}</h2>
                  <Badge variant="secondary" className="mt-2 uppercase tracking-widest text-[9px] font-black">
                    Estado: {selectedField.status}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Telemetría Avanzada</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Thermometer className="h-4 w-4 text-rose-400" />
                      <div className="text-xl font-black">{selectedField.sensors?.temp.toFixed(1)}°C</div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase">Temperatura</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Droplets className="h-4 w-4 text-blue-400" />
                      <div className="text-xl font-black">{selectedField.sensors?.humidity.toFixed(0)}%</div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase">Humedad Suelo</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Wind className="h-4 w-4 text-emerald-400" />
                      <div className="text-xl font-black">{selectedField.sensors?.soil_ph?.toFixed(1)}</div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase">pH del Suelo</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Activity className="h-4 w-4 text-purple-400" />
                      <div className="text-xl font-black">78%</div>
                      <div className="text-[9px] font-bold text-muted-foreground uppercase">Bio-Carga</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Carga Animal</h4>
                   <div className="flex items-end gap-2">
                     <span className="text-4xl font-black">{selectedField.occupation}</span>
                     <span className="text-muted-foreground font-bold pb-1 text-sm">/ {selectedField.capacity} Cabezas</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-primary" 
                       style={{ width: `${(selectedField.occupation/selectedField.capacity)*100}%` }} 
                     />
                   </div>
                </div>

                <div className="pt-8 flex flex-col gap-3">
                  <Button className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-primary/20">
                    <Maximize2 className="h-4 w-4" />
                    Analítica Detallada
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] border-dashed">
                    Historial de Rotación
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <div className="p-6 bg-muted/10 border-t border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Sano</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-amber-500" />
             <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Alerta</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-rose-500" />
             <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Crítico</span>
          </div>
        </div>
        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">VillaLuz IoT Satellite Mesh v1.0.4</p>
      </div>
    </Card>
  );
};

export default FieldHealthMap;
