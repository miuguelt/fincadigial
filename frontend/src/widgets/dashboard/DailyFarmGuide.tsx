import React from "react";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/features/reporting/model/useAnalytics";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

/**
 * Guía del Día — muestra las acciones prioritarias de hoy basadas en alertas reales.
 * Diseñado para que el campesino sepa exactamente qué hacer al empezar la jornada.
 */

const actionRoutes: Record<string, string> = {
  Salud: "/dashboard/admin/control",
  Reproducción: "/dashboard/admin/reproduction",
  Crecimiento: "/dashboard/admin/growth",
  Estado: "/dashboard/admin/animalFields",
  Personalizada: "/dashboard/admin/animals",
  Predictiva: "/dashboard/admin/analytics/executive",
};

function getPriorityIcon(priority: string) {
  const p = priority?.toLowerCase();
  if (p === "crítica")
    return <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />;
  if (p === "alta")
    return (
      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
    );
  return <CheckCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
}

function getPriorityBg(priority: string): string {
  const p = priority?.toLowerCase();
  if (p === "crítica") return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
  if (p === "alta")
    return "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20";
  if (p === "media")
    return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
  return "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20";
}

const DailyFarmGuide: React.FC = () => {
  const navigate = useNavigate();
  const { useAlerts } = useAnalytics();

  // Obtener las alertas más urgentes del día (críticas y altas, máx 7)
  const { data: criticalData, isLoading: l1 } = useAlerts({
    priority: "Crítica",
    limit: 4,
  });
  const { data: highData, isLoading: l2 } = useAlerts({
    priority: "Alta",
    limit: 5,
  });

  const isLoading = l1 || l2;

  const topAlerts = [
    ...(criticalData?.alerts || []),
    ...(highData?.alerts || []),
  ].slice(0, 7);

  const criticalCount = criticalData?.statistics?.total || 0;
  const highCount = highData?.statistics?.total || 0;
  const totalUrgent = criticalCount + highCount;

  return (
    <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">
              🌅 Guía del Día
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Acciones prioritarias para hoy en la finca
            </p>
          </div>
          {!isLoading && totalUrgent > 0 && (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {criticalCount} Críticas
                </span>
              )}
              {highCount > 0 && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                  {highCount} Altas
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-border/30 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : topAlerts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-bold text-text-primary">¡Todo en orden hoy!</p>
            <p className="text-sm text-text-secondary mt-1">
              No hay acciones urgentes pendientes.
            </p>
          </div>
        ) : (
          <>
            {topAlerts.map((alert: any, idx: number) => (
              <button
                key={alert.id || idx}
                onClick={() =>
                  navigate(
                    actionRoutes[alert.type] ||
                      "/dashboard/admin/analytics/executive",
                  )
                }
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${getPriorityBg(alert.priority)}`}
              >
                {getPriorityIcon(alert.priority)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    {alert.type} · {alert.animal_record || "Finca"}
                  </p>
                  <p className="text-sm font-medium text-text-primary truncate mt-0.5">
                    {alert.message}
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-text-secondary flex-shrink-0 opacity-60" />
              </button>
            ))}

            {totalUrgent > 7 && (
              <button
                onClick={() => navigate("/dashboard/admin/analytics/executive")}
                className="w-full text-center text-sm font-semibold text-primary py-2 hover:underline"
              >
                Ver {totalUrgent - 7} alertas más →
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer - accesos rápidos */}
      <div className="px-6 py-4 border-t border-border bg-background/50">
        <div className="flex flex-wrap gap-2">
          {[
            { label: "💉 Vacunaciones", path: "/dashboard/admin/vaccinations" },
            { label: "⚕️ Controles", path: "/dashboard/admin/control" },
            { label: "🐄 Reproducción", path: "/dashboard/admin/reproduction" },
            { label: "💊 Tratamientos", path: "/dashboard/admin/treatments" },
            { label: "📦 Inventario", path: "/dashboard/admin/inventory" },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="px-3 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg hover:bg-state-hover transition-colors text-text-secondary"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyFarmGuide;
