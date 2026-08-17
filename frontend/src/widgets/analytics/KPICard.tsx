import React, { useMemo } from 'react';
import { formatChangePercentage } from '@/shared/utils/formatUtils';
import { cn } from '@/shared/ui/cn.ts';
import { FitText } from '@/shared/ui/FitText';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { getKpiTone, type KpiTone } from './kpiTone';
import { KPIHeading } from './KPIHeading';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
  goodWhenHigher?: boolean;
  /**
   * Serie real para la mini-gráfica. Sin ella no se dibuja nada: antes había
   * una constante `DEFAULT_TREND` con siete puntos inventados que se pintaba
   * como si fuera la tendencia del indicador. Una línea falsa junto a una cifra
   * real se lee como dato y lleva a decidir sobre algo que no ocurrió.
   */
  trendData?: { value: number }[];
  /**
   * Versión de una sola línea: sin sparkline ni reserva para el badge.
   * Para encabezados que comparten pantalla con una tabla.
   */
  compact?: boolean;
}

/** Con menos de dos puntos no hay línea que trazar, sólo un adorno. */
const MIN_TREND_POINTS = 2;

const KPISkeleton = () => (
  <div className="bg-card rounded-lg border border-border/40 p-4 sm:p-5 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="h-3 bg-muted rounded-full w-1/3"></div>
        <div className="h-8 bg-muted rounded-lg w-1/2 mt-2"></div>
      </div>
      <div className="h-10 w-10 bg-muted rounded-xl flex-shrink-0 ml-4"></div>
    </div>
    <div className="h-12 bg-muted/50 rounded-xl w-full mt-4"></div>
  </div>
);

const KPISparkline = ({ data, color, gradientId }: {
  data: { value: number }[];
  color: string;
  gradientId: string;
}) => (
  <div className="h-10 w-full mt-auto opacity-50 group-hover:opacity-90 transition-opacity duration-400">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={true}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

/** Insignia de variación y subtítulo. El subtítulo se ajusta, no se recorta. */
const KPIFootnote = ({ tone, formattedChange, subtitle, compact }: {
  tone: KpiTone;
  formattedChange: string | null;
  subtitle?: string;
  compact: boolean;
}) => {
  const BadgeIcon = tone.BadgeIcon;
  return (
    <div className={cn(
      "flex items-center gap-2",
      compact ? "empty:hidden mt-1" : "mb-3 min-h-[22px]"
    )}>
      {formattedChange && (
        <span className={cn(
          "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-wide shrink-0",
          tone.bgColor, tone.changeColor
        )}>
          <BadgeIcon className="w-3 h-3 flex-shrink-0" />
          {formattedChange}
        </span>
      )}
      {subtitle && (
        <FitText as="p" minScale={0.8} className="min-w-0 flex-1 text-[11px] font-medium text-muted-foreground/70">
          {subtitle}
        </FitText>
      )}
    </div>
  );
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  icon,
  loading = false,
  subtitle,
  goodWhenHigher = true,
  compact = false,
  trendData,
}) => {
  const tone = getKpiTone(change, goodWhenHigher);
  const formattedChange = useMemo(() => formatChangePercentage(change), [change]);
  const gradientId = useMemo(
    () => `kpi-gradient-${title.replace(/\s+/g, '-').toLowerCase()}`,
    [title]
  );

  if (loading) return <KPISkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="group relative bg-card/50 dark:bg-card/30 backdrop-blur-xl border border-border/50 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/6 hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Barra de acento superior */}
      <div className={cn(
        "absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity duration-300",
        tone.accentGradient
      )} />

      {/* Fondo decorativo sutil */}
      <div className={cn(
        "absolute -right-8 -bottom-8 w-28 h-28 blur-2xl opacity-[0.07] rounded-full transition-colors duration-500",
        tone.isNeutral ? "bg-slate-500" : tone.isPositive ? "bg-emerald-500" : "bg-rose-500"
      )} />

      <div className={cn("relative z-10 flex flex-col h-full", compact ? "p-3" : "p-5")}>
        <KPIHeading title={title} value={value} unit={unit} icon={icon} compact={compact} />

        <KPIFootnote tone={tone} formattedChange={formattedChange} subtitle={subtitle} compact={compact} />

        {!compact && trendData && trendData.length >= MIN_TREND_POINTS && (
          <KPISparkline data={trendData} color={tone.chartColor} gradientId={gradientId} />
        )}
      </div>
    </motion.div>
  );
};

export default KPICard;
