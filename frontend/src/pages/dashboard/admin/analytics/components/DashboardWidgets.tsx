import React from 'react';

export const LoadingDashboard: React.FC = () => (
  <div className="h-full overflow-auto bg-background p-6" tabIndex={0}>
    <div className="mb-8 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
      <div className="h-4 bg-muted rounded w-1/3"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      ))}
    </div>
  </div>
);

export const ProgressMetric: React.FC<{ label: string; value?: number; suffix?: string }> = ({
  label, value, suffix = '%',
}) => {
  const normalized = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="text-foreground">
          {value !== undefined && value !== null ? `${normalized.toFixed(1)}${suffix}` : '—'}
        </span>
      </div>
      <div className="w-full bg-muted rounded-[var(--radius-full)] h-2.5">
        <div
          className="h-2.5 rounded-[var(--radius-full)] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all"
          style={{ width: `${Math.min(Math.max(normalized, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

export const QuickStat: React.FC<{ label: string; value: string | number; icon?: string }> = ({
  label, value, icon,
}) => (
  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
    {icon && <span className="text-2xl">{icon}</span>}
  </div>
);

