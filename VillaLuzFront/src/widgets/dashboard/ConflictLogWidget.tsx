import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
      <div className="bg-card rounded-xl p-6 border border-gray-50 flex flex-col items-center justify-center text-center opacity-60">
        <ShieldCheck size={40} className="text-success mb-2" />
        <p className="text-sm font-bold text-foreground">Datos Sincronizados</p>
        <p className="text-[10px] text-muted-foreground">
          No se han detectado conflictos de red hoy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm max-h-[400px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 text-warning rounded-xl">
            <History size={20} />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Historial de Conflictos Mesh
          </h3>
        </div>
        <span className="bg-warning/5 text-warning px-2 py-1 rounded-full text-[10px] font-black uppercase">
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
              className="p-4 bg-muted/50 rounded-lg border border-border/50 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground uppercase truncate max-w-[150px]">
                  RECURSO: {log.resource.split("/").pop()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(log.resolvedAt).toLocaleTimeString('es-CO')}
                </p>
              </div>

              <div className="grid grid-cols-[1fr,24px,1fr] items-center gap-2">
                <div className="bg-card p-2 rounded-xl border border-red-50 opacity-50 line-through">
                  <p className="text-[9px] font-bold text-muted-foreground">
                    DESCARTADO
                  </p>
                  <p className="text-xs font-black text-muted-foreground">
                    {JSON.stringify(log.loser.data).slice(0, 20)}...
                  </p>
                </div>

                <ArrowRight size={14} className="text-warning" />

                <div className="bg-success/5 p-2 rounded-xl border border-green-100">
                  <p className="text-[9px] font-bold text-success">
                    PREVALECE
                  </p>
                  <p className="text-xs font-black text-foreground">
                    {JSON.stringify(log.winner.data).slice(0, 20)}...
                  </p>
                </div>
              </div>

              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 size={10} className="text-success" />
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
        className="mt-4 text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors uppercase text-center"
      >
        Limpiar historial de conflictos
      </button>
    </div>
  );
};
