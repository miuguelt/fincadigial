import React from "react";

interface SparklineProps {
  values?: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
  showArea?: boolean;
}

// Lightweight SVG sparkline with premium styling
const Sparkline: React.FC<SparklineProps> = ({
  values = [],
  width = 80,
  height = 28,
  stroke = "hsl(var(--primary))",
  fill,
  strokeWidth = 2.5,
  className,
  showArea = true,
}) => {
  if (!values.length) {
    return (
      <div className={"text-[11px] text-muted-foreground " + (className || "")}>
        —
      </div>
    );
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 4) + 2;
      const y = height - (((v - min) / range) * (height - 4) + 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = points + ` ${width - 2},${height - 1} 2,${height - 1}`;
  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label="sparkline"
    >
      {showArea && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {showArea && (
        <polyline
          fill={`url(#${gradientId})`}
          stroke="none"
          points={areaPoints}
        />
      )}
      <polyline
        fill={fill || "none"}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

export default Sparkline;
