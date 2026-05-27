import React from "react";
import { normalizeDisplayValue } from "@/shared/utils/normalization";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/shared/ui/cn.ts";

interface StatisticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
  color?: string; // Clase CSS para color personalizado
  showGeneticTree?: boolean; // Para funcionalidad específica
  extraClasses?: string; // Futurista: glassmorphism y neon effects
  onClick?: () => void; // Soporte de click para navegación / drill-down
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  description,
  trend,
  progress,
  icon,
  variant = "default",
  // color y showGeneticTree se mantienen para compatibilidad futura
  extraClasses,
  onClick,
}) => {
  const variantConfig = {
    default: {
      card: "border-border/50 bg-card/80",
      accent: "from-primary/60 to-primary/30",
      iconBg: "bg-primary/8 dark:bg-primary/15",
      iconColor: "text-primary",
    },
    success: {
      card: "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/80 dark:bg-emerald-950/30",
      accent: "from-emerald-500 to-teal-400",
      iconBg: "bg-emerald-100/80 dark:bg-emerald-950/60",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    warning: {
      card: "border-amber-200/60 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/30",
      accent: "from-amber-500 to-orange-400",
      iconBg: "bg-amber-100/80 dark:bg-amber-950/60",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    destructive: {
      card: "border-rose-200/60 dark:border-rose-800/40 bg-rose-50/80 dark:bg-rose-950/30",
      accent: "from-rose-500 to-pink-400",
      iconBg: "bg-rose-100/80 dark:bg-rose-950/60",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  };

  const config = variantConfig[variant];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0)
      return <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />;
    if (trend.value < 0)
      return <TrendingDown className="h-3.5 w-3.5 flex-shrink-0" />;
    return <Minus className="h-3.5 w-3.5 flex-shrink-0" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.isPositive && trend.value > 0) return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60";
    if (!trend.isPositive && trend.value > 0) return "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60";
    if (trend.isPositive && trend.value < 0) return "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60";
    if (!trend.isPositive && trend.value < 0) return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60";
    return "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800";
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-0.5",
        config.card,
        onClick ? "cursor-pointer" : "",
        extraClasses ?? ""
      )}
      hoverable={false}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Barra de acento superior */}
      <div className={cn(
        "absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r opacity-70 group-hover:opacity-100 transition-opacity duration-300",
        config.accent
      )} />

      <CardHeader className="flex flex-row items-start justify-between px-5 pt-5 pb-2 space-y-0">
        <CardTitle className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.12em] leading-tight max-w-[140px] mt-0.5">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 transition-all duration-300 group-hover:scale-110",
            config.iconBg
          )}>
            <span className={config.iconColor}>{icon}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-1">
        {/* Valor principal */}
        <div className="flex items-end justify-between mb-2">
          <div className="text-4xl font-black tracking-tighter text-foreground tabular-nums leading-none">
            {normalizeDisplayValue(value)}
          </div>
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold",
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground font-medium leading-snug mt-1">{description}</p>
        )}

        {progress && (
          <div className="mt-3.5 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground font-medium">
                {progress.label || "Progreso"}
              </span>
              <span className="font-bold text-foreground">
                {progress.value}/{progress.max}
              </span>
            </div>
            <Progress
              value={(progress.value / progress.max) * 100}
              className="h-1.5 rounded-full"
            />
          </div>
        )}
      </CardContent>

      {/* Flecha de navegación sutil */}
      {onClick && (
        <div className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-40 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </Card>
  );
};

export default StatisticsCard;
