import React from "react";
import { useQuery } from "@tanstack/react-query";
import analyticsService from "@/features/reporting/api/analytics.service";
import { getStatusBadgeClass } from "@/shared/utils/badgeStyles";

/**
 * Badge de cumplimiento ICA para un animal.
 * Verde = todo al día, Amarillo = algo próximo/faltante, Rojo = vencido.
 */

interface ICAComplianceBadgeProps {
  animalId: number;
  showDetails?: boolean;
}

const statusConfig = {
  ok: {
    color: getStatusBadgeClass("success"),
    dot: "bg-success-500",
    label: "ICA ✓",
  },
  due_soon: {
    color: getStatusBadgeClass("warning"),
    dot: "bg-warning-500",
    label: "ICA ⚠",
  },
  missing: {
    color: getStatusBadgeClass("warning"),
    dot: "bg-warning-500",
    label: "ICA ⚠",
  },
  overdue: {
    color: getStatusBadgeClass("danger"),
    dot: "bg-danger-500",
    label: "ICA ✗",
  },
};

const overallConfig = {
  green: {
    color: getStatusBadgeClass("success"),
    label: "ICA ✓",
    title: "Cumplimiento ICA: al día",
  },
  yellow: {
    color: getStatusBadgeClass("warning"),
    label: "ICA ⚠",
    title: "Cumplimiento ICA: revisar",
  },
  red: {
    color: getStatusBadgeClass("danger"),
    label: "ICA ✗",
    title: "Cumplimiento ICA: vencido",
  },
};

const checkLabels: Record<string, string> = {
  aftosa: "Aftosa",
  brucelosis: "Brucelosis",
  desparasitacion: "Desparasitación",
  clostridial: "Clostridial",
};

const ICAComplianceBadge: React.FC<ICAComplianceBadgeProps> = ({
  animalId,
  showDetails = false,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["ica-compliance", animalId],
    queryFn: () => analyticsService.getAnimalICACompliance(animalId),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <span className="px-2 py-0.5 text-xs bg-border/30 rounded-full animate-pulse">
        ICA...
      </span>
    );
  }

  if (!data) return null;

  const overall = data.overall as "green" | "yellow" | "red";
  const cfg = overallConfig[overall] ?? overallConfig.yellow;

  if (!showDetails) {
    return (
      <span
        title={cfg.title}
        className={`px-2 py-0.5 text-xs font-bold rounded-full border ${cfg.color}`}
      >
        {cfg.label}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border px-3 py-2 ${cfg.color}`}>
      <p className="text-xs font-bold mb-1.5">{cfg.title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {Object.entries(data.checks ?? {}).map(([key, val]: [string, any]) => {
          const s = val.status as keyof typeof statusConfig;
          const sc = statusConfig[s] ?? statusConfig.ok;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`}
              />
              <span className="text-xs">{checkLabels[key] ?? key}</span>
              {val.days != null && (
                <span className="text-[10px] opacity-60 ml-auto">
                  {val.days}d
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ICAComplianceBadge;
