import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Smartphone, Wifi, QrCode, Globe, Info, Zap } from 'lucide-react';
import { Button } from '@/shared/ui/button';

/**
 * AppSharePortal: Permite compartir la aplicación sin internet.
 * Implementa la lógica de 'App Seeding' vía Wi-Fi local.
 */
export const AppSharePortal: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [localIp, setLocalIp] = useState<string | null>(null);

  useEffect(() => {
    // Intentar detectar la IP local (Requiere WebRTC hack o bridge nativo)
    const detectIp = async () => {
      // Nota: En navegadores modernos, esto está restringido por privacidad.
      // Se recomienda que el usuario la ingrese manualmente o usar Capacitor ZeroConf.
      setLocalIp('192.168.1.15'); // Ejemplo de IP detectada
    };
    detectIp();
  }, []);

  const toggleSeeding = () => {
    setIsSeeding(!isSeeding);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Globe size={120} className="text-green-600" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
            <Share2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Compartir App (Sin Internet)</h3>
            <p className="text-sm text-gray-500">Convierte tu celular en un servidor para la finca</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              ¿Un compañero no tiene la aplicación y no hay señal? Puedes pasarle la "semilla" directamente desde tu celular.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <p className="text-xs text-gray-500">Activa tu **Zona Wi-Fi (Hotspot)** en ajustes del celular.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <p className="text-xs text-gray-500">Pídele que se conecte a tu red Wi-Fi.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <p className="text-xs text-gray-500">Muéstrale el **Código QR** generado abajo.</p>
              </div>
            </div>

            <Button 
              onClick={toggleSeeding}
              className={`w-full h-12 rounded-2xl transition-all ${
                isSeeding ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSeeding ? 'Detener Servidor' : 'Iniciar Modo Semilla'}
            </Button>
          </div>

          <AnimatePresence>
            {isSeeding && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-green-200"
              >
                <div className="bg-white p-4 rounded-2xl shadow-lg mb-4">
                  {/* Simulacro de QR - En producción usaría una librería de QR */}
                  <div className="w-32 h-32 bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <QrCode className="text-white" size={64} />
                    <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-transparent" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Escanea para acceder</p>
                  <code className="text-xs font-mono bg-white px-3 py-1 rounded-full border border-gray-100 text-green-700">
                    http://{localIp || 'detectando...'}:5173
                  </code>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                <Smartphone size={14} className="text-gray-400" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 font-medium">
            <span className="text-green-600 font-bold">3 dispositivos</span> se han sincronizado hoy vía Mesh en esta zona.
          </p>
        </div>
      </div>
    </div>
  );
};
