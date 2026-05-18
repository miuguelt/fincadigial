import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  ConflictResolver,
  ConflictLog,
} from "@/shared/api/offline/ConflictResolver";

export const ConflictLogWidget: React.FC = () => {
  const [logs, setLogs] = useState<ConflictLog[]>([]);

  useEffect(() => {
    setLogs(ConflictResolver.getLogs());
    // Escuchar cambios (simulado o vía eventos)
    const interval = setInterval(() => {
      setLogs(ConflictResolver.getLogs());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-50 flex flex-col items-center justify-center text-center opacity-60">
        <ShieldCheck size={40} className="text-green-500 mb-2" />
        <p className="text-sm font-bold text-gray-900">Datos Sincronizados</p>
        <p className="text-[10px] text-gray-500">
          No se han detectado conflictos de red hoy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm max-h-[400px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
            <History size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Historial de Conflictos Mesh
          </h3>
        </div>
        <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-full text-[10px] font-black uppercase">
          Auto-Resueltos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
        <AnimatePresence>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase truncate max-w-[150px]">
                  RECURSO: {log.resource.split("/").pop()}
                </p>
                <p className="text-[10px] text-gray-400">
                  {new Date(log.resolvedAt).toLocaleTimeString()}
                </p>
              </div>

              <div className="grid grid-cols-[1fr,24px,1fr] items-center gap-2">
                <div className="bg-white p-2 rounded-xl border border-red-50 opacity-50 line-through">
                  <p className="text-[9px] font-bold text-gray-400">
                    DESCARTADO
                  </p>
                  <p className="text-xs font-black text-gray-500">
                    {JSON.stringify(log.loser.data).slice(0, 20)}...
                  </p>
                </div>

                <ArrowRight size={14} className="text-amber-500" />

                <div className="bg-green-50 p-2 rounded-xl border border-green-100">
                  <p className="text-[9px] font-bold text-green-600">
                    PREVALECE
                  </p>
                  <p className="text-xs font-black text-gray-900">
                    {JSON.stringify(log.winner.data).slice(0, 20)}...
                  </p>
                </div>
              </div>

              <p className="text-[9px] text-gray-500 flex items-center gap-1">
                <CheckCircle2 size={10} className="text-green-500" />
                Resuelto por marca de tiempo más reciente (LWW)
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={() => {
          ConflictResolver.clearLogs();
          setLogs([]);
        }}
        className="mt-4 text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase text-center"
      >
        Limpiar historial de conflictos
      </button>
    </div>
  );
};
