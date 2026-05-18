import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, User as UserIcon, RefreshCw, Navigation } from 'lucide-react';
import { locationService, UserLocation } from '@/entities/user/api/location.service';

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
      console.error('Error al cargar posiciones:', error);
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
    minLat: 5.950, maxLat: 5.965,
    minLong: -73.655, maxLong: -73.640
  };

  // Conversión simple de Lat/Long a coordenadas SVG (0-100)
  const getCoords = (lat: number, lng: number) => {
    const x = ((lng - fincaBounds.minLong) / (fincaBounds.maxLong - fincaBounds.minLong)) * 100;
    const y = 100 - (((lat - fincaBounds.minLat) / (fincaBounds.maxLat - fincaBounds.minLat)) * 100);
    return { x, y };
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-[600px]">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="text-green-600" size={20} />
            Mapa de Operaciones en Campo
          </h3>
          <p className="text-sm text-gray-500">Localización en tiempo real vía Red Mesh</p>
        </div>
        <button 
          onClick={() => fetchPositions()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-green-600"
          title="Refrescar posiciones"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 relative bg-slate-50 overflow-hidden">
        {/* Capa de Mapa SVG (Representación de la Finca) */}
        <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d">
          {/* Fondo de terreno */}
          <rect width="100" height="100" fill="#f8fafc" />
          
          {/* Potreros (Polígonos simulados) */}
          <path d="M10,20 L40,15 L45,40 L15,45 Z" fill="#ecfdf5" stroke="#10b981" strokeWidth="0.2" />
          <path d="M45,15 L80,10 L85,35 L50,40 Z" fill="#f0fdf4" stroke="#22c55e" strokeWidth="0.2" />
          <path d="M15,50 L45,45 L40,80 L10,75 Z" fill="#f0fdf4" stroke="#22c55e" strokeWidth="0.2" />
          <path d="M50,45 L90,40 L85,85 L55,80 Z" fill="#ecfdf5" stroke="#10b981" strokeWidth="0.2" />
          
          {/* Caminos Internos */}
          <path d="M45,0 L45,100 M0,45 L100,45" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />

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
                <circle r="3" fill={worker.detection_method === 'GPS' ? '#3b82f6' : '#10b981'} className="animate-ping opacity-20" />
                
                {/* Pin */}
                <g transform="translate(-2, -5)">
                  <path d="M2,0 C0.895,0 0,0.895 0,2 C0,3.5 2,5 2,5 C2,5 4,3.5 4,2 C4,0.895 3.105,0 2,0 Z" fill={worker.detection_method === 'GPS' ? '#2563eb' : '#059669'} />
                  <circle cx="2" cy="2" r="0.8" fill="white" />
                </g>

                {/* Etiqueta (Tooltip simulado) */}
                <foreignObject x="3" y="-8" width="80" height="40" className="overflow-visible pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-lg p-1.5 shadow-xl">
                    <p className="text-[8px] font-bold text-gray-900 leading-none whitespace-nowrap">Usuario #{worker.user_id}</p>
                    <p className="text-[6px] text-gray-500 mt-0.5">{worker.detection_method} • {new Date(worker.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </foreignObject>
              </motion.g>
            );
          })}
        </svg>

        {/* Leyenda */}
        <div className="absolute bottom-6 left-6 space-y-2 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-bold text-gray-600">GPS DIRECTO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[10px] font-bold text-gray-600">MESH / PROXIMIDAD</span>
          </div>
        </div>

        {/* Indicador de Cobertura */}
        <div className="absolute top-6 right-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-full text-[10px] font-bold shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            RED VILLA LUZ ACTIVA
          </div>
        </div>
      </div>
    </div>
  );
};
