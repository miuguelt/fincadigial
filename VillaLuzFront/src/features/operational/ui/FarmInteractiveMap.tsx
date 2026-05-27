import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fieldService } from "@/entities/field/api/field.service";
// import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  IconRefresh,
  IconSwitchHorizontal,
  IconCrosshair,
  IconLoader2,
} from "@/shared/ui/icons";
import { cn } from "@/shared/ui/cn";
import { useToast } from "@/app/providers/ToastContext";

// Corregir iconos de Leaflet por defecto en Vite/React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Field {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  animal_count: number;
  capacity: string;
  state: string;
}

// Se obtiene de la finca activa vía API. Fallback coordenadas Colombia.
const FINCA_DEFAULT_CENTER: [number, number] = [4.5709, -74.2973];

/**
 * Componente interno para centrar el mapa dinámicamente
 */
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 16);
  return null;
}

const getEffectiveCapacity = (capacity: string | number | null, area: string | number | null): { capacityNum: number | null; isEstimated: boolean } => {
  const manualCapacity = parseInt(String(capacity || '0')) || 0;
  if (manualCapacity > 0) {
    return { capacityNum: manualCapacity, isEstimated: false };
  }
  const areaNum = area ? parseFloat(String(area).replace(',', '.')) : 0;
  const estimatedCapacity = areaNum > 0 ? Math.max(1, Math.round(areaNum * 2)) : 0;
  return {
    capacityNum: estimatedCapacity > 0 ? estimatedCapacity : null,
    isEstimated: estimatedCapacity > 0
  };
};

export const FarmInteractiveMap: React.FC = () => {
  const { showToast } = useToast();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>(FINCA_DEFAULT_CENTER);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const resp = await fieldService.getFields({ limit: 100 });
      // Extraer datos del patrón APIResponse
      const data = (resp as any).data || (resp as any).items || resp;
      const validFields = (Array.isArray(data) ? data : []).map((f: any) => ({
        ...f,
        latitude: f.latitude ? Number(f.latitude) : null,
        longitude: f.longitude ? Number(f.longitude) : null,
        radius_meters: f.radius_meters ? Number(f.radius_meters) : 50,
      }));
      setFields(validFields);
      // Centrar en el primer potrero con coordenadas válidas
      const firstValid = validFields.find((f) => f.latitude && f.longitude);
      if (firstValid) {
        setCenter([firstValid.latitude!, firstValid.longitude!]);
      }
    } catch (error) {
      showToast("Error al cargar datos geográficos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  return (
    <div className="flex flex-col h-full bg-muted overflow-hidden">
      {/* Header del Mapa */}
      <div className="p-4 md:p-6 bg-card/50 dark:bg-black/20 backdrop-blur-xl border-b border-border/50 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <IconCrosshair size="lg" className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Geogestión Villa Luz</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              Control de Potreros y Rotación
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFields}
            disabled={loading}
            className="rounded-xl h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2"
          >
            {loading ? (
              <IconLoader2 size="sm" className="animate-spin" />
            ) : (
              <IconRefresh size="sm" />
            )}
            Refrescar
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Panel Lateral de Estado */}
        <aside className="w-full md:w-[320px] bg-card/80 backdrop-blur-md border-r border-border/50 p-6 overflow-y-auto custom-scrollbar z-[1000] shadow-md">
          <div className="space-y-6">
            <div className="space-y-1 px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Resumen de Ocupación
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <p className="text-[8px] font-black text-emerald-600 uppercase">Animales</p>
                  <p className="text-xl font-black text-emerald-700">
                    {fields.reduce((acc, f) => acc + (f.animal_count || 0), 0)}
                  </p>
                </div>
                <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                  <p className="text-[8px] font-black text-info uppercase">Potreros</p>
                  <p className="text-xl font-black text-info">{fields.length}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Listado de Potreros
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {fields.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {fields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() =>
                      field.latitude && setCenter([field.latitude, field.longitude!])
                    }
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all group",
                      field.latitude
                        ? "bg-card hover:border-emerald-500/50"
                        : "bg-muted/50 grayscale opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-sm tracking-tight truncate">
                          {field.name}
                        </p>
                        {(() => {
                          const { capacityNum, isEstimated } = getEffectiveCapacity(field.capacity, (field as any).area);
                          return (
                            <p className="text-[10px] font-bold text-muted-foreground/60">
                              {field.animal_count} animales • {capacityNum ? `${capacityNum} UA${isEstimated ? '*' : ''}` : 'Sin definir'}
                            </p>
                          );
                        })()}
                      </div>
                      <div
                        className={cn(
                          "h-2 w-2 rounded-[var(--radius-full)] shrink-0 mt-1.5",
                          field.state === "Disponible" ? "bg-emerald-500" : "bg-warning"
                        )}
                      />
                    </div>
                  </button>
                ))}
                {fields.length === 0 && !loading && (
                  <div className="p-8 text-center border-2 border-dashed rounded-xl border-border/40">
                    <p className="text-xs font-bold text-muted-foreground italic">
                      No hay potreros con coordenadas registradas.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
        {/* Contenedor del Mapa (Leaflet) */}
        <div className="flex-1 relative z-0">
          <MapContainer
            center={center}
            zoom={16}
            className="h-full w-full"
            zoomControl={false}
          >
            <ChangeView center={center} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {fields.map((field) => {
              if (!field.latitude || !field.longitude) return null;
              const isOccupied = field.animal_count > 0;
              const color = isOccupied ? "#f59e0b" : "#10b981"; // Amber or Emerald
              return (
                <React.Fragment key={field.id}>
                  {/* Área del potrero */}
                  <Circle
                    center={[field.latitude, field.longitude]}
                    radius={field.radius_meters}
                    pathOptions={{
                      fillColor: color,
                      fillOpacity: 0.2,
                      color: color,
                      weight: 2,
                      dashArray: isOccupied ? "5, 5" : "0",
                    }}
                  />
                  {/* Marcador Central */}
                  <Marker position={[field.latitude, field.longitude]}>
                    <Popup className="custom-leaflet-popup">
                      <div className="p-1 min-w-[200px] space-y-4">
                        <div className="flex flex-col gap-1 border-b border-border pb-3">
                          <span className="text-[8px] font-semibold text-sm text-muted-foreground">
                            Potrero Seleccionado
                          </span>
                          <h4 className="text-lg font-black tracking-tighter text-emerald-950 leading-none">
                            {field.name}
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[7px] font-black uppercase text-muted-foreground/60">
                              Estado
                            </span>
                            <Badge
                              className={cn(
                                "w-full justify-center rounded-lg text-[8px] font-black border-none",
                                field.state === "Disponible"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-warning/10 text-warning"
                              )}
                            >
                              {field.state.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[7px] font-black uppercase text-muted-foreground/60">
                              Ocupación
                            </span>
                            {(() => {
                              const { capacityNum, isEstimated } = getEffectiveCapacity(field.capacity, (field as any).area);
                              return (
                                <p className="text-sm font-black text-foreground">
                                  {field.animal_count}{" "}
                                  <span className="text-[10px] text-muted-foreground/50" title={isEstimated ? 'Estimada por área' : undefined}>
                                    / {capacityNum || '∞'}{isEstimated ? '*' : ''}
                                  </span>
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="pt-2 flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest h-9 rounded-xl gap-2 shadow-sm shadow-emerald-900/20"
                          >
                            <IconSwitchHorizontal size="sm" /> Trasladar Lote Aquí
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground font-bold uppercase text-[8px] h-8"
                          >
                            Ver Historial de Pastoreo
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
            {/* Marcadores de personal vendrán del servicio de ubicación real */}
          </MapContainer>
          {/* Botones de control flotantes */}
          <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-xl bg-card shadow-md border-none hover:bg-muted"
            >
              <IconCrosshair size="md" className="text-emerald-600" />
            </Button>
          </div>
        </div>
      </div>
      {/* Estilos inyectados para Leaflet */}
      <style
        dangerouslySetInnerHTML={{
          __html: `.leaflet-container { background: #f8fafc; font-family: inherit; } .custom-leaflet-popup .leaflet-popup-content-wrapper { border-radius: 1.5rem; padding: 0.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); } .custom-leaflet-popup .leaflet-popup-tip { background: white; }`,
        }}
      />
    </div>
  );
};

export default FarmInteractiveMap;
