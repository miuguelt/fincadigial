import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon, ChevronRight } from "lucide-react";
import { DashboardStat } from "@/features/dashboard/model/useCompleteDashboardStats";
import { formatChangePercentage } from "@/shared/utils/formatUtils";

interface DashboardStatsCardProps {
  title: string;
  icon: LucideIcon;
  stat: DashboardStat | number | undefined;
  description?: string;
  onClick?: () => void;
  className?: string;
  valueFormatter?: (value: number) => string;
}

// OPTIMIZACIÓN: Memoizar componente para evitar re-renders innecesarios
const DashboardStatsCardComponent: React.FC<DashboardStatsCardProps> = ({
  title,
  icon: Icon,
  stat,
  description,
  onClick,
  className = "",
  valueFormatter = (val) => val.toString(),
}) => {
  const statObj = typeof stat === "object" ? stat : undefined;
  const value = useMemo(() => {
    if (typeof stat === "number") return stat;
    return statObj?.valor ?? 0;
  }, [stat, statObj]);

  const change = useMemo(() => statObj?.cambio_porcentual, [statObj]);
  const formattedChange = useMemo(() => formatChangePercentage(change), [change]);
  const hasChange = useMemo(() => formattedChange !== null, [formattedChange]);
  const trend = useMemo(() => statObj?.tendencia, [statObj]);

  const trendInfo = useMemo(() => {
    if (!trend) return null;
    const { periodo_actual, periodo_anterior } = trend;
    if (typeof periodo_actual !== "number" || typeof periodo_anterior !== "number") return null;
    const diff = periodo_actual - periodo_anterior;
    let diffColor = "text-muted-foreground";
    if (diff > 0) diffColor = "text-emerald-600 dark:text-emerald-400";
    else if (diff < 0) diffColor = "text-rose-600 dark:text-rose-400";
    return { diff, diffColor, periodo_actual, periodo_anterior };
  }, [trend]);

  const { TrendIcon, trendColor, trendBgColor, accentGradient, iconBg, iconColor } = useMemo(() => {
    if (!hasChange || change === 0) {
      return {
        TrendIcon: Minus,
        trendColor: "text-slate-600 dark:text-slate-400",
        trendBgColor: "bg-slate-100 dark:bg-slate-800",
        accentGradient: "from-slate-400 via-slate-300 to-slate-200",
        iconBg: "bg-primary/10 dark:bg-primary/15",
        iconColor: "text-primary",
      };
    }
    if (change && change > 0) {
      return {
        TrendIcon: TrendingUp,
        trendColor: "text-emerald-700 dark:text-emerald-400",
        trendBgColor: "bg-emerald-50 dark:bg-emerald-950/60",
        accentGradient: "from-emerald-500 via-teal-400 to-cyan-300",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };
    }
    return {
      TrendIcon: TrendingDown,
      trendColor: "text-rose-700 dark:text-rose-400",
      trendBgColor: "bg-rose-50 dark:bg-rose-950/60",
      accentGradient: "from-rose-500 via-pink-400 to-orange-300",
      iconBg: "bg-rose-50 dark:bg-rose-950/60",
      iconColor: "text-rose-600 dark:text-rose-400",
    };
  }, [hasChange, change]);

  const cardClassName = useMemo(
    () =>
      `group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-0.5 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`,
    [onClick, className],
  );

  return (
    <Card className={cardClassName} onClick={onClick} hoverable={false}>
      {/* Barra de acento superior con gradiente dinámico */}
      <div
        className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${accentGradient} transition-opacity duration-300 opacity-70 group-hover:opacity-100`}
      />

      <CardHeader className="flex flex-row items-start justify-between px-5 pt-5 pb-2 space-y-0">
        <CardTitle className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.12em] leading-tight max-w-[140px] mt-1">
          {title}
        </CardTitle>
        <div
          className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 ml-2 transition-all duration-300 group-hover:scale-110`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-1">
        <div className="space-y-2.5">
          {/* Valor principal — grande y nítido */}
          <div className="text-4xl font-black tracking-tighter text-foreground tabular-nums leading-none">
            {valueFormatter(value)}
          </div>

          {description && (
            <p className="text-xs text-muted-foreground font-medium leading-snug">{description}</p>
          )}

          {trendInfo && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{trendInfo.periodo_actual}</span>
              {" / "}
              <span>{trendInfo.periodo_anterior} ant.</span>
              {trendInfo.diff !== 0 && (
                <span className={`ml-1.5 font-bold ${trendInfo.diffColor}`}>
                  ({trendInfo.diff > 0 ? "+" : ""}
                  {trendInfo.diff})
                </span>
              )}
            </p>
          )}

          {hasChange && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wide border-0 ${trendBgColor} ${trendColor}`}
                title={
                  typeof change === "number"
                    ? `${change.toFixed(1)}% vs periodo anterior`
                    : undefined
                }
              >
                <TrendIcon className="h-3 w-3 flex-shrink-0" />
                {formattedChange}
              </span>
              <span className="text-[11px] text-muted-foreground">vs anterior</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Flecha de navegación sutil cuando hay onClick */}
      {onClick && (
        <div className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-50 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </Card>
  );
};

// Memoizar componente con comparación personalizada
export const DashboardStatsCard = memo(
  DashboardStatsCardComponent,
  (prevProps, nextProps) => {
    const getStatVal = (s: DashboardStat | number | undefined) =>
      typeof s === "number" ? s : (s as DashboardStat | undefined)?.valor;
    const prevStat = typeof prevProps.stat === "object" ? prevProps.stat : undefined;
    const nextStat = typeof nextProps.stat === "object" ? nextProps.stat : undefined;
    return (
      prevProps.title === nextProps.title &&
      getStatVal(prevProps.stat) === getStatVal(nextProps.stat) &&
      prevStat?.cambio_porcentual === nextStat?.cambio_porcentual &&
      prevStat?.tendencia?.periodo_actual ===
        nextStat?.tendencia?.periodo_actual &&
      prevStat?.tendencia?.periodo_anterior ===
        nextStat?.tendencia?.periodo_anterior &&
      prevProps.description === nextProps.description &&
      prevProps.className === nextProps.className &&
      prevProps.onClick === nextProps.onClick
    );
  },
);

DashboardStatsCard.displayName = "DashboardStatsCard";

interface DashboardStatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

// OPTIMIZACIÓN: Memoizar grid para evitar re-renders cuando children no cambian
const DashboardStatsGridComponent: React.FC<DashboardStatsGridProps> = ({
  children,
  columns = 4,
  className = "",
}) => {
  const gridCols = useMemo(
    () => ({
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }),
    [],
  );

  const gridClassName = useMemo(
    () => `grid ${gridCols[columns]} gap-4 ${className}`,
    [columns, className, gridCols],
  );

  return <div className={gridClassName}>{children}</div>;
};

export const DashboardStatsGrid = memo(DashboardStatsGridComponent);
DashboardStatsGrid.displayName = "DashboardStatsGrid";

export default DashboardStatsCard;
