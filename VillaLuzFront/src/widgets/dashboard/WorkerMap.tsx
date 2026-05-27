import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Navigation } from "lucide-react";
import {
  locationService,
  UserLocation,
} from "@/entities/user/api/location.service";

/**
 * WorkerMap: Visualización de personal en el campo.
 * En un entorno real, usaría Leaflet/Google Maps.
 * Aquí usamos una representación SVG de la Finca Villa Luz para un diseño 'Premium' y rápido.
 */
export const WorkerMap: React.FC = () => {
  const [workers, setWorkers] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    try {
      const res = await locationService.getLatestPositions();
      setWorkers(res.data || []);
    } catch (error) {
      console.error("Error al cargar posiciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  // Coordenadas de referencia para la Finca Villa Luz (SENA)
  // Lat: 5.9558, Long: -73.6498
  const fincaBounds = {
    minLat: 5.95,
    maxLat: 5.965,
    minLong: -73.655,
    maxLong: -73.64,
  };

  // Conversión simple de Lat/Long a coordenadas SVG (0-100)
  const getCoords = (lat: number, lng: number) => {
    const x =
      ((lng - fincaBounds.minLong) /
        (fincaBounds.maxLong - fincaBounds.minLong)) *
      100;
    const y =
      100 -
      ((lat - fincaBounds.minLat) / (fincaBounds.maxLat - fincaBounds.minLat)) *
        100;
    return { x, y };
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm flex flex-col h-[600px]">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-card/50 backdrop-blur-md">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Navigation className="text-success" size={20} />
            Mapa de Operaciones en Campo
          </h3>
          <p className="text-sm text-muted-foreground">
            Localización en tiempo real vía Red Mesh
          </p>
        </div>
        <button
          onClick={() => fetchPositions()}
          className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-success"
          title="Refrescar posiciones"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 relative bg-secondary/30 overflow-hidden">
        {/* Capa de Mapa SVG (Representación de la Finca) */}
        <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d">
          {/* Fondo de terreno */}
          <rect width="100" height="100" fill="#f8fafc" />

          {/* Cuadrícula de fondo */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.1" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Marcadores de Trabajadores */}
          {workers.map((worker) => {
            const { x, y } = getCoords(worker.latitude, worker.longitude);
            return (
              <motion.g
                key={worker.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1, x: `${x}%`, y: `${y}%` }}
                className="cursor-pointer"
                style={{ originX: "50%", originY: "50%" }}
              >
                {/* Sombra/Halo de señal */}
                <circle
                  r="3"
                  fill={
                    worker.detection_method === "GPS" ? "#3b82f6" : "#10b981"
                  }
                  className="animate-ping opacity-20"
                />

                {/* Pin */}
                <g transform="translate(-2, -5)">
                  <path
                    d="M2,0 C0.895,0 0,0.895 0,2 C0,3.5 2,5 2,5 C2,5 4,3.5 4,2 C4,0.895 3.105,0 2,0 Z"
                    fill={
                      worker.detection_method === "GPS" ? "#2563eb" : "#059669"
                    }
                  />
                  <circle cx="2" cy="2" r="0.8" fill="white" />
                </g>

                {/* Etiqueta (Tooltip simulado) */}
                <foreignObject
                  x="3"
                  y="-8"
                  width="80"
                  height="40"
                  className="overflow-visible pointer-events-none"
                >
                  <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 shadow-xl">
                    <p className="text-[8px] font-bold text-foreground leading-none whitespace-nowrap">
                      Usuario #{worker.user_id}
                    </p>
                    <p className="text-[6px] text-muted-foreground mt-0.5">
                      {worker.detection_method} •{" "}
                      {new Date(worker.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </foreignObject>
              </motion.g>
            );
          })}
        </svg>

        {/* Leyenda */}
        <div className="absolute bottom-6 left-6 space-y-2 bg-card/80 backdrop-blur-md p-3 rounded-lg border border-white/20 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-info rounded-full" />
            <span className="text-[10px] font-bold text-muted-foreground">
              GPS DIRECTO
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full" />
            <span className="text-[10px] font-bold text-muted-foreground">
              MESH / PROXIMIDAD
            </span>
          </div>
        </div>

        {/* Indicador de Cobertura */}
        <div className="absolute top-6 right-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success text-white rounded-full text-[10px] font-bold shadow-lg">
            <div className="w-1.5 h-1.5 bg-card rounded-full animate-pulse" />
            RED VILLA LUZ ACTIVA
          </div>
        </div>
      </div>
    </div>
  );
};
