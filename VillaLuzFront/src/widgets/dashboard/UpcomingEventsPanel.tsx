import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import analyticsService from "@/features/reporting/api/analytics.service";

/**
 * Panel de Próximos Eventos — calendario ejecutivo de la finca.
 * Muestra en los próximos N días: partos, post-partos, vacunaciones y controles pendientes.
 */

type TabKey = "births" | "postparto" | "vaccines" | "controls";

const tabConfig: {
  key: TabKey;
  label: string;
  icon: string;
  emptyMsg: string;
}[] = [
  {
    key: "births",
    label: "Partos",
    icon: "🐄",
    emptyMsg: "No hay partos esperados próximamente.",
  },
  {
    key: "postparto",
    label: "Post-parto",
    icon: "🍼",
    emptyMsg: "No hay animales en período post-parto.",
  },
  {
    key: "vaccines",
    label: "Vacunas ICA",
    icon: "💉",
    emptyMsg: "Todas las vacunaciones ICA están al día.",
  },
  {
    key: "controls",
    label: "Controles",
    icon: "⚕️",
    emptyMsg: "No hay controles veterinarios pendientes.",
  },
];

function statusBadge(status: string) {
  if (status === "overdue" || status === "imminent") {
    return (
      <span className="px-2 py-0.5 text-xs font-bold bg-destructive/10 text-destructive rounded-full">
        {status === "imminent" ? "Inminente" : "Vencido"}
      </span>
    );
  }
  if (status === "due_soon") {
    return (
      <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
        Pronto
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-bold bg-info/10 text-info rounded-full">
      Programado
    </span>
  );
}

const UpcomingEventsPanel: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("births");
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["upcoming-events", days],
    queryFn: () => analyticsService.getUpcomingEvents(days),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const summary = data?.summary ?? {};
  const counts: Record<TabKey, number> = {
    births: summary.births ?? 0,
    postparto: summary.postparto ?? 0,
    vaccines: summary.vaccinations_due ?? 0,
    controls: summary.controls_due ?? 0,
  };

  const rows: Record<TabKey, React.ReactNode[]> = {
    births: (data?.upcoming_births ?? []).map((b: any) => (
      <div
        key={b.animal_id}
        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
      >
        <div>
          <p className="font-semibold text-text-primary text-sm">{b.record}</p>
          <p className="text-xs text-text-secondary">
            Gestación día {b.gestation_days} · Parto esperado{" "}
            {new Date(b.expected_birth).toLocaleDateString("es-CO")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {b.days_to_birth < 0
              ? `${Math.abs(b.days_to_birth)} días pasados`
              : `en ${b.days_to_birth} días`}
          </span>
          {statusBadge(b.status)}
        </div>
      </div>
    )),
    postparto: (data?.postparto_monitoring ?? []).map((p: any) => (
      <div
        key={p.animal_id}
        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
      >
        <div>
          <p className="font-semibold text-text-primary text-sm">{p.record}</p>
          <p className="text-xs text-text-secondary">
            Parto {new Date(p.birth_date).toLocaleDateString("es-CO")} · Día{" "}
            {p.days_postparto} post-parto
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-secondary">Próxima revisión</p>
          <p className="text-xs font-semibold text-orange-600">
            {new Date(p.next_check).toLocaleDateString("es-CO")}
          </p>
        </div>
      </div>
    )),
    vaccines: (data?.vaccination_due ?? []).map((v: any) => (
      <div
        key={v.animal_id}
        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
      >
        <div>
          <p className="font-semibold text-text-primary text-sm">{v.record}</p>
          <p className="text-xs text-text-secondary">{v.vaccine}</p>
          <p className="text-xs text-text-secondary">
            Última: {new Date(v.last_date).toLocaleDateString("es-CO")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {v.days_remaining < 0
              ? `${Math.abs(v.days_remaining)}d vencida`
              : `en ${v.days_remaining}d`}
          </span>
          {statusBadge(v.status)}
        </div>
      </div>
    )),
    controls: (data?.controls_due ?? []).map((c: any) => (
      <div
        key={c.animal_id}
        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
      >
        <div>
          <p className="font-semibold text-text-primary text-sm">{c.record}</p>
          <p className="text-xs text-text-secondary">
            Último control:{" "}
            {new Date(c.last_control).toLocaleDateString("es-CO")}
          </p>
          <p className="text-xs text-text-secondary">
            {c.days_since} días sin revisión
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/control")}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Programar →
        </button>
      </div>
    )),
  };

  const totalUrgent =
    counts.births + counts.postparto + counts.vaccines + counts.controls;

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">
              📅 Próximos Eventos
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {totalUrgent} eventos en los próximos {days} días
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-xs bg-surface border border-border rounded-lg px-2 py-1 text-text-secondary"
            >
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
            </select>
            <button
              onClick={() => refetch()}
              className="text-xs text-primary hover:underline"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>

        {/* Tabs con badges */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-border/40 text-text-secondary hover:bg-border/60"
              }`}
            >
              {tab.icon} {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.key
                      ? "bg-card/20 text-white"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-6 py-3 min-h-[180px]">
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-border/20 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : rows[activeTab].length > 0 ? (
          <div>{rows[activeTab]}</div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm text-text-secondary">
              {tabConfig.find((t) => t.key === activeTab)?.emptyMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEventsPanel;
