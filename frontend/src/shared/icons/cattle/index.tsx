import React from 'react';

export type IconColor = 'forest' | 'light-green' | 'earth-blue' | 'brown' | 'orange' | 'gray';

const COLOR_MAP: Record<IconColor, string> = {
  forest: '#2D5A3D',
  'light-green': '#4CAF50',
  'earth-blue': '#5B8DB8',
  brown: '#8B6F47',
  orange: '#E67E22',
  gray: '#6B7280',
};

interface CattleIconProps {
  size?: number;
  color?: IconColor;
  filled?: boolean;
  className?: string;
}

const baseProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

const strokeAttrs = (color: string, filled: boolean) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: filled ? `${color}20` : 'none',
});

// ─── LIVESTOCK ───────────────────────────────────────────────────────────────

export const IconCow: React.FC<CattleIconProps> = ({ size = 24, color = 'forest', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M4 14c0-2 1-4 3-5 1-1 2-3 2-5 0-1 1-2 2-2h2c1 0 2 1 2 2 0 2 1 4 2 5 2 1 3 3 3 5v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M8 8v-3M16 8v-3M9 14h6M10 17v2M14 17v2" />
    <circle cx="10" cy="12" r="0.5" fill={COLOR_MAP[color]} stroke="none" />
    <circle cx="14" cy="12" r="0.5" fill={COLOR_MAP[color]} stroke="none" />
  </svg>
);

export const IconCalf: React.FC<CattleIconProps> = ({ size = 24, color = 'light-green', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M6 15c0-1.5 1-3 2-3.5.5-.5 1-1.5 1-2.5 0-.5.5-1 1-1h2c.5 0 1 .5 1 1 0 1 .5 2 1 2.5 1 .5 2 2 2 3.5v3a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 016 18v-3z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M9 9V7M15 9V7M10 14h4M11 17v1.5M13 17v1.5" />
    <circle cx="11" cy="12.5" r="0.5" fill={COLOR_MAP[color]} stroke="none" />
    <circle cx="13" cy="12.5" r="0.5" fill={COLOR_MAP[color]} stroke="none" />
  </svg>
);

export const IconHerd: React.FC<CattleIconProps> = ({ size = 24, color = 'forest', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M3 16c0-1 .5-2 1.5-2.5.5-.3 1-1 1-1.5 0-.3.3-.5.5-.5h1c.3 0 .5.2.5.5 0 .5.5 1.2 1 1.5 1 .5 1.5 1.5 1.5 2.5v1.5a1 1 0 01-1 1H4a1 1 0 01-1-1V16z" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M10 15c0-1 .5-2 1.5-2.5.5-.3 1-1 1-1.5 0-.3.3-.5.5-.5h1c.3 0 .5.2.5.5 0 .5.5 1.2 1 1.5 1 .5 1.5 1.5 1.5 2.5v1.5a1 1 0 01-1 1h-5a1 1 0 01-1-1V15z" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M17 17c0-1 .5-2 1.5-2.5.5-.3 1-1 1-1.5 0-.3.3-.5.5-.5h1c.3 0 .5.2.5.5 0 .5.5 1.2 1 1.5 1 .5 1.5 1.5 1.5 2.5v1.5a1 1 0 01-1 1h-5a1 1 0 01-1-1V17z" />
  </svg>
);

export const IconWeight: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <rect x="3" y="14" width="18" height="4" rx="1" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M7 14v-2M17 14v-2M12 14v-3M9 12h6M10 10c0-1.5 1-2.5 2-3 1 .5 2 1.5 2 3" />
    <circle cx="12" cy="8" r="1" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconMilk: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M7 8h10v10a3 3 0 01-3 3h-4a3 3 0 01-3-3V8z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M10 5v3M14 5v3M12 3v2M9 14h6" />
    <path d="M10 18c0 1 .5 2 2 2s2-1 2-2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconBreeding: React.FC<CattleIconProps> = ({ size = 24, color = 'light-green', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M4 14c0-1.5.5-2.5 1.5-3 .5-.3 1-1 1-1.5 0-.3.3-.5.5-.5h1c.3 0 .5.2.5.5 0 .5.5 1.2 1 1.5 1 .5 1.5 1.5 1.5 3v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
    <path d="M16 10c0-1 .5-1.5 1-2 .3-.3.5-.8.5-1.2 0-.2.2-.3.3-.3h.4c.2 0 .3.1.3.3 0 .4.2.9.5 1.2.5.5 1 1 1 2v1.5a.7.7 0 01-.7.7h-2.6a.7.7 0 01-.7-.7V10z" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path d="M13 12c-.5-.5-1-1.2-1-2 0-1 .8-1.5 1.5-1.5s1.5.5 1.5 1.5c0 .8-.5 1.5-1 2L13 12z" fill={COLOR_MAP[color]} stroke="none" opacity="0.8" />
  </svg>
);

// ─── HEALTH ──────────────────────────────────────────────────────────────────

export const IconVaccine: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <rect x="10" y="4" width="4" height="12" rx="1" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M12 16v4M10 20h4M12 8v4M9 7h6" />
    <path d="M11 10h2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconVeterinary: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="9" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M12 8v8M8 12h8" />
  </svg>
);

export const IconQuarantine: React.FC<CattleIconProps> = ({ size = 24, color = 'orange', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M5 15c0-1 .5-2 1.5-2.5.5-.3 1-1 1-1.5 0-.3.3-.5.5-.5h1c.3 0 .5.2.5.5 0 .5.5 1.2 1 1.5 1 .5 1.5 1.5 1.5 2.5v1.5a1 1 0 01-1 1H6a1 1 0 01-1-1V15z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M3 10h18M3 18h18" />
    <path d="M16 8l4 4M20 8l-4 4" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconHealthCheck: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <circle cx="14" cy="16" r="4" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M14 12V6M12 8h4M10 10c0-2 1-4 2-5" />
    <path d="M8 14c-1 0-2 1-2 2s1 2 2 2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconMedication: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <rect x="6" y="10" width="12" height="8" rx="4" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M12 10v8M6 14h12" />
  </svg>
);

export const IconHealthAlert: React.FC<CattleIconProps> = ({ size = 24, color = 'orange', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M10 4l-7 14h14L10 4z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M10 10v4M10 16v.5" />
  </svg>
);

// ─── LAND ────────────────────────────────────────────────────────────────────

export const IconPasture: React.FC<CattleIconProps> = ({ size = 24, color = 'light-green', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M3 18h18M5 18v-4M19 18v-4M9 18v-3M15 18v-3" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M7 14c0-1 .5-2 1-3s1.5-1 2-1 1.5.5 2 1 1 2 1 3" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M13 14c0-1 .5-2 1-3s1.5-1 2-1 1.5.5 2 1 1 2 1 3" />
  </svg>
);

export const IconWater: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M4 12h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M7 14c1-1 2-1 3 0s2 1 3 0 2-1 3 0M4 10h16" />
  </svg>
);

export const IconFence: React.FC<CattleIconProps> = ({ size = 24, color = 'brown', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M4 6v12M12 6v12M20 6v12M4 10h16M4 16h16" />
    <path d="M8 8l4 2M16 8l-4 2M8 14l4 2M16 14l-4 2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconLocation: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconRotation: React.FC<CattleIconProps> = ({ size = 24, color = 'light-green', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M12 4a8 8 0 018 8M12 20a8 8 0 01-8-8" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M18 8l4 0-4 4M6 16l-4 0 4-4" />
    <path d="M9 12c0-1.5 1.5-3 3-3s3 1.5 3 3-1.5 3-3 3-3-1.5-3-3z" {...strokeAttrs(COLOR_MAP[color], filled)} />
  </svg>
);

export const IconSoil: React.FC<CattleIconProps> = ({ size = 24, color = 'brown', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M4 18h16M6 18v-4M18 18v-4" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M12 14c0-2-1-4-2-5s-2-2-2-3c0-1 1-2 2-2s2 1 2 2" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M12 14c0-2 1-4 2-5s2-2 2-3c0-1-1-2-2-2s-2 1-2 2" />
    <path d="M8 16h8" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

// ─── TRANSPORT ───────────────────────────────────────────────────────────────

export const IconTruck: React.FC<CattleIconProps> = ({ size = 24, color = 'brown', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <rect x="2" y="8" width="12" height="8" rx="1" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M14 10h4l3 3v3h-7v-6z" />
    <circle cx="6" cy="18" r="2" {...strokeAttrs(COLOR_MAP[color], false)} />
    <circle cx="18" cy="18" r="2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconInOut: React.FC<CattleIconProps> = ({ size = 24, color = 'forest', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M9 12h6M12 9l3 3-3 3" />
  </svg>
);

export const IconInventory: React.FC<CattleIconProps> = ({ size = 24, color = 'gray', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <rect x="5" y="3" width="14" height="18" rx="2" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M9 8h6M9 12h6M9 16h3" />
    <path d="M8 8l1 1 2-2" {...strokeAttrs(COLOR_MAP[color], false)} />
    <path d="M8 12l1 1 2-2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

export const IconMovement: React.FC<CattleIconProps> = ({ size = 24, color = 'forest', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M4 12h12M12 8l4 4-4 4" />
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M6 16c0-1 .5-2 1-2.5.3-.3.5-.8.5-1.2 0-.2.2-.3.3-.3h.4c.2 0 .3.1.3.3 0 .4.2.9.5 1.2.5.5 1 1.5 1 2.5v1a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5V16z" />
  </svg>
);

export const IconRoute: React.FC<CattleIconProps> = ({ size = 24, color = 'earth-blue', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <circle cx="6" cy="6" r="3" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <circle cx="18" cy="18" r="3" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M9 6h3a3 3 0 013 3v0a3 3 0 003 3h0" />
    <path d="M12 9l2 2-2 2" {...strokeAttrs(COLOR_MAP[color], false)} />
  </svg>
);

// ─── MANAGEMENT ──────────────────────────────────────────────────────────────

export const IconCalendar: React.FC<CattleIconProps> = ({ size = 24, color = 'gray', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M3 10h18M8 3v4M16 3v4" />
    <rect x="7" y="13" width="3" height="3" rx="0.5" fill={COLOR_MAP[color]} stroke="none" opacity="0.6" />
    <rect x="14" y="13" width="3" height="3" rx="0.5" fill={COLOR_MAP[color]} stroke="none" opacity="0.6" />
  </svg>
);

export const IconDocument: React.FC<CattleIconProps> = ({ size = 24, color = 'gray', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M6 3h8l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M14 3v4h4M8 11h8M8 15h5" />
  </svg>
);

export const IconChart: React.FC<CattleIconProps> = ({ size = 24, color = 'forest', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M3 20h18" />
    <rect x="5" y="12" width="3" height="8" rx="0.5" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <rect x="10.5" y="8" width="3" height="12" rx="0.5" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <rect x="16" y="4" width="3" height="16" rx="0.5" {...strokeAttrs(COLOR_MAP[color], filled)} />
  </svg>
);

export const IconBell: React.FC<CattleIconProps> = ({ size = 24, color = 'orange', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M12 3a2 2 0 00-2 2v1a6 6 0 00-4 5.6v3.4L5 16h14l-1-1.6V11.6A6 6 0 0014 6V5a2 2 0 00-2-2z" />
    <path d="M10 18a2 2 0 004 0" {...strokeAttrs(COLOR_MAP[color], false)} />
    <circle cx="18" cy="5" r="2" fill={COLOR_MAP[color]} stroke="none" />
  </svg>
);

export const IconTag: React.FC<CattleIconProps> = ({ size = 24, color = 'brown', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <path {...strokeAttrs(COLOR_MAP[color], filled)} d="M3 12l9-9h6l3 3v6l-9 9-9-9z" />
    <circle cx="8" cy="8" r="1.5" {...strokeAttrs(COLOR_MAP[color], false)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M12 12h4M12 15h3" />
  </svg>
);

export const IconSettings: React.FC<CattleIconProps> = ({ size = 24, color = 'gray', filled = false, className }) => (
  <svg {...baseProps} width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="3" {...strokeAttrs(COLOR_MAP[color], filled)} />
    <path {...strokeAttrs(COLOR_MAP[color], false)} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);
