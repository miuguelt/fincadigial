import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import type { DashboardData } from "@/shared/api/generated/swaggerTypes";

type ExecutiveStats = DashboardData & { sick_animals?: number };

export function calculateHealthScore(stats: ExecutiveStats | null): number | null {
  const active = Number(stats?.active_animals ?? 0);
  if (active <= 0) return null;
  const sick = Math.max(0, Number(stats?.sick_animals ?? 0));
  return Math.max(0, Math.min(100, Math.round(((active - sick) / active) * 100)));
}

export const ExecutiveIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ExecutiveStats | null>(null);
  const [meshSyncs, setMeshSyncs] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<number>(0);

  useEffect(() => {
    // Cargar estadísticas base
    const loadData = async () => {
      try {
        const [dashboardResult, completeResult, insightResult] = await Promise.allSettled([
          analyticsService.getDashboard(),
          analyticsService.getCompleteDashboardStats(),
          analyticsService.getPredictiveInsights(),
        ]);
        if (dashboardResult.status === 'fulfilled') setStats(dashboardResult.value);
        if (completeResult.status === 'fulfilled') {
          setCriticalAlerts(Number(completeResult.value?.alertas_sistema?.valor ?? 0));
        }
        if (insightResult.status === 'fulfilled') setAiInsight(insightResult.value.insight);
      } catch {
        // Promise.allSettled protects independent cards; this is a final guard.
      }
    };
    loadData();

    // Obtener estadísticas reales de sincronización Mesh
    const syncState = proximitySync.getSyncState();
    setMeshSyncs(syncState.messagesReceived + syncState.messagesSent);
    setLastSyncAt(syncState.lastSyncAt);
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAiInsight(
      "Iniciando escaneo inteligente del ganado... Esto puede tomar unos minutos.",
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

  const healthScore = calculateHealthScore(stats);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700/50">
      {/* Efectos de fondo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-success/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-info/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <BrainCircuit className="text-success w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Cerebro Villa Luz
              </h3>
              <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-0.5">
                Inteligencia de Finca Activa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-success/20 text-success rounded-full text-xs font-black border border-success/30">
            <Zap size={14} className="animate-pulse" />
            VIGILANCIA EN VIVO
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Salud General */}
          <div className="bg-white/5 backdrop-blur-sm p-5 sm:p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Activity className="text-info/80" size={20} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Índice Vital
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black mb-1 text-white">
              {healthScore === null ? '—' : `${healthScore}%`}
            </div>
            <div className="text-xs text-slate-300">
              Salud proyectada del ganado
            </div>
            <div className="mt-4 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthScore ?? 0}%` }}
                className="h-full bg-info shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          {/* Red Mesh */}
          <div className="bg-white/5 backdrop-blur-sm p-5 sm:p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Network className="text-success" size={20} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Red de Campo
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black mb-1 text-white">{meshSyncs}</div>
            <div className="text-xs text-slate-300">
              Intercambios Mesh hoy
            </div>
            <div className="mt-4 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i < 4 ? "bg-success" : "bg-slate-700"}`}
                />
              ))}
            </div>
          </div>

          {/* Seguridad / Alertas Críticas */}
          <div className="bg-white/5 backdrop-blur-sm p-5 sm:p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <ShieldAlert className="text-warning/80" size={20} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Alertas Activas
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black mb-1 text-white">{criticalAlerts}</div>
            <div className="text-xs text-slate-300">
              Alertas del sistema
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold">
              {criticalAlerts === 0 ? (
                <>
                  <CheckCircle size={14} className="text-success" />
                  <span className="text-success">SISTEMA SIN ALERTAS CRÍTICAS</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} className="text-warning" />
                  <span className="text-warning">{criticalAlerts} ALERTAS REQUIEREN ATENCIÓN</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sección de Análisis Predictivo */}
        <div className="mt-6 p-5 sm:p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-info/20 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Cpu className="text-info/80" size={22} />
              <h4 className="text-base sm:text-lg font-bold text-white">Análisis Predictivo de IA</h4>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              variant={isAnalyzing ? "secondary" : "primary"}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                isAnalyzing
                  ? "cursor-not-allowed"
                  : "shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              }`}
            >
              {isAnalyzing ? "Procesando..." : "Escanear Ganado"}
            </Button>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 min-h-[70px] flex items-center justify-center text-center">
            {aiInsight ? (
              <p className="text-sm text-slate-100 leading-relaxed italic">
                {aiInsight}
              </p>
            ) : (
              <p className="text-xs text-slate-300 font-medium">
                Inicia un escaneo para obtener recomendaciones predictivas
                basadas en datos reales.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 p-3.5 sm:p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-2.5">
            <Cpu className="text-slate-400" size={16} />
            <p className="text-xs font-medium text-slate-300">
              Última sincronización del Gateway:{" "}
              <span className="text-white font-bold">
                {lastSyncAt
                  ? new Date(lastSyncAt).toLocaleTimeString('es-CO')
                  : 'Sin sincronizaciones registradas'}
              </span>
            </p>
          </div>
          <Button
            type="button"
            variant="link"
            onClick={() => navigate('/admin/analytics/executive')}
            className="text-xs font-bold text-info hover:text-info/80 transition-colors uppercase tracking-wider px-0 h-auto"
          >
            Ver Reporte Detallado →
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
