import React, { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Activity,
  ShieldAlert,
  Cpu,
  Network,
  Zap,
} from "lucide-react";
// import { livestockService } from "@/entities/finca/api/livestock.service";
// import { ConflictResolver } from "@/shared/api/offline/ConflictResolver";

import { analyticsService } from "@/features/reporting/api/analytics.service";
import { proximitySync } from "@/shared/api/offline/ProximitySyncService";

export const ExecutiveIntelligence: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [meshSyncs, setMeshSyncs] = useState(0);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<number>(0);

  useEffect(() => {
    // Cargar estadísticas base
    const loadData = async () => {
      try {
        const res = await (analyticsService as any).getSummary();
        setStats(res);

        // Cargar alertas críticas del endpoint completo
        const completeRes = await analyticsService.getCompleteDashboardStats();
        const alertasTotal = completeRes?.alertas_sistema?.valor ?? 0;
        setCriticalAlerts(alertasTotal);

        // Cargar insight previo si existe
        const insightRes = await analyticsService.getPredictiveInsights();
        setAiInsight(insightRes.insight);
      } catch (err) {
        console.warn("Usando datos cacheados para panel ejecutivo");
      }
    };
    loadData();

    // Obtener estadísticas reales de sincronización Mesh
    const syncState = proximitySync.getSyncState();
    setMeshSyncs(syncState.messagesReceived + syncState.messagesSent);
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAiInsight(
      "Iniciando escaneo inteligente del hato... Esto puede tomar unos minutos.",
    );
    try {
      const res = await analyticsService.runPredictiveAnalysis();

      // Feedback inmediato del inicio de tarea
      setAiInsight(
        res.message ||
          "Análisis en segundo plano iniciado. El Cerebro Villa Luz está procesando los datos de los animales...",
      );

      // Opcional: Podríamos esperar un poco y recargar los insights,
      // pero al ser por lotes e IA, es mejor dejar que el usuario siga navegando.
      setTimeout(async () => {
        try {
          const updated = await analyticsService.getPredictiveInsights();
          setAiInsight(updated.insight);
        } catch (e) {
          // Fallback silencioso si aún no termina
        }
      }, 5000);
    } catch (err) {
      console.error("Error al ejecutar análisis de IA:", err);
      setAiInsight(
        "Hubo un error al conectar con el motor predictivo. Por favor, intenta de nuevo.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const healthScore = stats
    ? Math.floor(
        ((stats.active_animals - stats.sick_animals) / stats.active_animals) *
          100,
      )
    : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 text-white shadow-2xl relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-success/10 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-info/10 rounded-full blur-3xl -ml-20 -mb-20" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-card/10 backdrop-blur-md rounded-lg border border-white/10">
              <BrainCircuit className="text-success" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">
                Cerebro Villa Luz
              </h3>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                Inteligencia de Finca Activa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-success/20 text-success rounded-full text-xs font-black border border-success/30">
            <Zap size={14} className="animate-pulse" />
            VIGILANCIA REAL-TIME
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salud General */}
          <div className="bg-card/5 backdrop-blur-sm p-6 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <Activity className="text-info/80" size={20} />
              <span className="text-[10px] font-black text-muted-foreground uppercase">
                Índice Vital
              </span>
            </div>
            <div className="text-4xl font-black mb-1">{healthScore}%</div>
            <div className="text-xs text-muted-foreground">
              Salud proyectada del hato
            </div>
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                className="h-full bg-info shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          {/* Red Mesh */}
          <div className="bg-card/5 backdrop-blur-sm p-6 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <Network className="text-success" size={20} />
              <span className="text-[10px] font-black text-muted-foreground uppercase">
                Red de Campo
              </span>
            </div>
            <div className="text-4xl font-black mb-1">{meshSyncs}</div>
            <div className="text-xs text-muted-foreground">
              Intercambios Mesh registrados hoy
            </div>
            <div className="mt-4 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i < 4 ? "bg-success" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>

          {/* Seguridad / Alertas Críticas */}
          <div className="bg-card/5 backdrop-blur-sm p-6 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <ShieldAlert className="text-warning/80" size={20} />
              <span className="text-[10px] font-black text-muted-foreground uppercase">
                Alertas Activas
              </span>
            </div>
            <div className="text-4xl font-black mb-1">{criticalAlerts}</div>
            <div className="text-xs text-muted-foreground">
              Alertas no leídas del sistema
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold">
              {criticalAlerts === 0 ? (
                <>
                  <CheckCircle size={12} className="text-success" />
                  <span className="text-success">SISTEMA SIN ALERTAS CRÍTICAS</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={12} className="text-warning" />
                  <span className="text-warning">{criticalAlerts} ALERTAS REQUIEREN ATENCIÓN</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sección de IA Predictive (F7) */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.5rem] border border-info/20 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Cpu className="text-info/80" size={24} />
              <h4 className="text-lg font-bold">Análisis Predictivo de IA</h4>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              variant={isAnalyzing ? "secondary" : "primary"}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-tighter transition-all ${
                isAnalyzing
                  ? "cursor-not-allowed"
                  : "shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              }`}
            >
              {isAnalyzing ? "Procesando..." : "Escanear Hato"}
            </Button>
          </div>

          <div className="bg-slate-950/40 p-5 rounded-lg border border-white/5 min-h-[80px] flex items-center justify-center text-center">
            {aiInsight ? (
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                {aiInsight}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground font-medium">
                Inicia un escaneo para obtener recomendaciones predictivas
                basadas en datos reales.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between p-4 bg-card/5 rounded-lg border border-white/5">
          <div className="flex items-center gap-3">
            <Cpu className="text-muted-foreground" size={18} />
            <p className="text-[10px] font-bold text-muted-foreground/70">
              Última sincronización del Gateway:{" "}
              <span className="text-white">
                {new Date().toLocaleTimeString()}
              </span>
            </p>
          </div>
          <Button variant="link" className="text-[10px] font-black text-info/80 hover:text-info transition-colors uppercase tracking-widest px-0 h-auto">
            Ver Reporte Detallado
          </Button>
        </div>
      </div>
    </div>
  );
};

const CheckCircle = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
