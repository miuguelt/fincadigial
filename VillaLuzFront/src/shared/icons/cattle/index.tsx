import React from 'react';

interface CattleIconProps {
  size?: number;
  className?: string;
}

// ─── LIVESTOCK ───────────────────────────────────────────────────────────────

export const IconCow: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Silueta de vaca vista lateral - cuerpo completo */}
    <path d="M5 14c0-1.5 1-3 2.5-3.5.5-.5 1-1.5 1-2.5h5c0 1 1 2 2 2.5 1 .5 2.5 2 2.5 3.5v2.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 015 16.5V14z" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.75" strokeLinejoin="round" />
    {/* Cabeza */}
    <circle cx="6" cy="12" r="2.5" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.75" />
    {/* Cuernos */}
    <path d="M4.5 9.5V7.5M7.5 9.5V7.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
    {/* Ojo */}
    <circle cx="5.5" cy="11.5" r="0.6" fill="#16A34A" />
    {/* Nariz */}
    <ellipse cx="4.5" cy="13" rx="1" ry="0.7" fill="#BBF7D0" stroke="#16A34A" strokeWidth="0.8" />
    {/* Patas */}
    <path d="M8 18v2.5M11 18v2.5M14 18v2.5M17 18v2.5" stroke="#16A34A" strokeWidth="1.75" strokeLinecap="round" />
    {/* Cola */}
    <path d="M18 14c1-.5 2-1.5 2-2.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconCalf: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ternero vista lateral - versión pequeña */}
    <path d="M6 15c0-1.2.8-2.2 2-2.8.4-.4.8-1.2.8-2h4c0 .8.8 1.6 1.6 2 1.2.6 2 1.6 2 2.8v2a1.2 1.2 0 01-1.2 1.2H7.2A1.2 1.2 0 016 17v-2z" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.75" strokeLinejoin="round" />
    {/* Cabeza */}
    <circle cx="7" cy="13" r="2" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.75" />
    {/* Orejas */}
    <path d="M5 12V10.5M9 12V10.5" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" />
    {/* Ojo */}
    <circle cx="6.5" cy="12.5" r="0.5" fill="#22C55E" />
    {/* Nariz */}
    <ellipse cx="5.5" cy="13.8" rx="0.8" ry="0.5" fill="#BBF7D0" stroke="#22C55E" strokeWidth="0.7" />
    {/* Patas */}
    <path d="M9 18.2v2M12 18.2v2M15 18.2v2" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
    {/* Cola */}
    <path d="M16.5 15c.8-.4 1.5-1.2 1.5-2" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const IconHerd: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Silueta de vaca vista lateral - cuerpo completo */}
    <path d="M4 14c0-2 1.5-3.5 3.5-4.5 1-1 2-2.5 2-4h4c0 1.5 1 3 2 4 2 1 3.5 2.5 3.5 4.5v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3z" fill="#DCFCE7" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round" />
    {/* Cuernos */}
    <path d="M8 6V4M16 6V4" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    {/* Ojos */}
    <circle cx="10" cy="11" r="0.8" fill="#16A34A" />
    <circle cx="14" cy="11" r="0.8" fill="#16A34A" />
    {/* Nariz */}
    <ellipse cx="12" cy="13.5" rx="2" ry="1" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1" />
    {/* Patas */}
    <path d="M7 19v2M11 19v2M13 19v2M17 19v2" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    {/* Cola */}
    <path d="M19 14c1-1 2-2 2-3" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconWeight: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Balanza de platillos */}
    <circle cx="12" cy="5" r="2.5" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M12 7.5v4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 17l7-5.5 7 5.5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 20h18" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M5 12.5v4.5M19 12.5v4.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconMilk: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Cubeta de leche */}
    <path d="M7 8h10v10a3 3 0 01-3 3h-4a3 3 0 01-3-3V8z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M10 5v3M14 5v3" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 3v2" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 14h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconBreeding: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Vaca madre + ternero juntos */}
    {/* Madre */}
    <path d="M2 15c0-1.5 1-2.5 2.5-3 .5-.5 1-1.2 1-2h3c0 .8.8 1.5 1.5 2 1 .5 2 1.5 2 3v1.5H2V15z" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="3.5" cy="13" r="1.8" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
    <circle cx="3" cy="12.5" r="0.4" fill="#16A34A" />
    <path d="M5 16.5v1.5M7 16.5v1.5" stroke="#16A34A" strokeWidth="1.2" strokeLinecap="round" />
    {/* Ternero */}
    <path d="M12 16c0-1 .8-1.8 1.8-2.2.3-.3.6-.8.6-1.3h2.2c0 .5.5 1 1 1.3.8.4 1.8 1.2 1.8 2.2v1h-7.4v-1z" fill="#BBF7D0" stroke="#22C55E" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="13" cy="14.5" r="1.3" fill="#BBF7D0" stroke="#22C55E" strokeWidth="1.5" />
    <circle cx="12.5" cy="14.2" r="0.3" fill="#22C55E" />
    <path d="M14 17v1M15.5 17v1" stroke="#22C55E" strokeWidth="1" strokeLinecap="round" />
    {/* Corazón entre ellos */}
    <path d="M9.5 13c-.5-.8-1.5-.8-2 0 .5.8 1.5 1.5 2 2.5.5-1 1.5-1.7 2-2.5-.5-.8-1.5-.8-2 0z" fill="#FCA5A5" stroke="#EF4444" strokeWidth="0.8" />
  </svg>
);

// ─── HEALTH ──────────────────────────────────────────────────────────────────

export const IconVaccine: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Jeringa */}
    <rect x="10" y="2" width="4" height="13" rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M12 15v5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 20h4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 7.5h6M9 10.5h6" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="12" cy="9" r="1.5" fill="#93C5FD" />
  </svg>
);

export const IconVeterinary: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Estrella de la vida médica */}
    <path d="M12 2l2.5 7H22l-6 4.5 2.5 7.5L12 16.5 5.5 21l2.5-7.5L2 9h7.5L12 2z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="10.5" y="8" width="3" height="8" rx="0.5" fill="#3B82F6" />
    <rect x="8" y="10.5" width="8" height="3" rx="0.5" fill="#3B82F6" />
  </svg>
);

export const IconQuarantine: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Vaca en cuarentena */}
    <path d="M3 15c0-1.5 1-2.5 2.5-3 .5-.5 1-1.2 1-2h3c0 .8.8 1.5 1.5 2 1 .5 2 1.5 2 3v1.5H3V15z" fill="#FEF3C7" stroke="#F97316" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="4.5" cy="13" r="1.8" fill="#FEF3C7" stroke="#F97316" strokeWidth="1.5" />
    <circle cx="4" cy="12.5" r="0.4" fill="#F97316" />
    <path d="M6 16.5v1.5M8 16.5v1.5" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
    {/* Barrera de cuarentena */}
    <path d="M14 6v12" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 2" />
    <path d="M17 9l-3 3M17 12l-3-3" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconHealthCheck: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Estetoscopio */}
    <circle cx="15" cy="17" r="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M15 13V8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 8c-3 0-5 2-5 5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="10" cy="6" r="2" fill="#3B82F6" />
    <path d="M10 8v3" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconMedication: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Pastilla */}
    <rect x="5" y="8" width="14" height="8" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M12 8v8" stroke="#3B82F6" strokeWidth="2" />
    <rect x="5" y="8" width="7" height="8" rx="4" fill="#93C5FD" opacity="0.5" />
    <path d="M9 10v4M8 12h2" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconHealthAlert: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Triángulo de peligro */}
    <path d="M12 3L2 21h20L12 3z" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 10v5" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="18" r="1.2" fill="#EF4444" />
  </svg>
);

// ─── LAND ────────────────────────────────────────────────────────────────────

export const IconPasture: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Monte / colina con pasto */}
    <path d="M2 20h20" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 20c0-5 3-10 6-12 3 2 6 7 6 12" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const IconWater: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Bebedero */}
    <rect x="3" y="11" width="18" height="7" rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M7 14.5c1-1 2-1 3 0s2 1 3 0 2-1 3 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 5v6M14 5v6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 4h8" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const IconFence: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Cerca */}
    <path d="M4 4v16M12 4v16M20 4v16" stroke="#A16207" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4 9h16M4 15h16" stroke="#A16207" strokeWidth="2" strokeLinecap="round" />
    <circle cx="4" cy="4" r="1.5" fill="#A16207" />
    <circle cx="12" cy="4" r="1.5" fill="#A16207" />
    <circle cx="20" cy="4" r="1.5" fill="#A16207" />
  </svg>
);

export const IconLocation: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Pin de mapa */}
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="9" r="3" fill="#3B82F6" />
    <circle cx="12" cy="9" r="1" fill="white" />
  </svg>
);

export const IconRotation: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Rotación circular */}
    <path d="M12 4a8 8 0 018 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 20a8 8 0 01-8-8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 7l2.5-1.5L18 4" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 17l-2.5 1.5L6 20" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.5" fill="#22C55E" />
  </svg>
);

export const IconSoil: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Hoja */}
    <path d="M17 3c-4 0-8 3-9 7 1-2 4-4 7-4 3 0 5 2 5 5s-2 5-5 5c-1 0-3-.5-4-1" fill="#DCFCE7" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 17c2 2 5 3 8 3 2 0 4-1 5-2" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M12 10v8" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── TRANSPORT ───────────────────────────────────────────────────────────────

export const IconTruck: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Camión */}
    <rect x="1" y="8" width="13" height="9" rx="2" fill="#FEF3C7" stroke="#A16207" strokeWidth="1.75" />
    <path d="M14 11h4l3 2v4h-7v-6z" fill="#FEF3C7" stroke="#A16207" strokeWidth="1.75" strokeLinejoin="round" />
    <circle cx="6" cy="19" r="2" fill="#FEF3C7" stroke="#A16207" strokeWidth="1.75" />
    <circle cx="6" cy="19" r="0.8" fill="#A16207" />
    <circle cx="19" cy="19" r="2" fill="#FEF3C7" stroke="#A16207" strokeWidth="1.75" />
    <circle cx="19" cy="19" r="0.8" fill="#A16207" />
  </svg>
);

export const IconInOut: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Entrada/Salida */}
    <rect x="2" y="4" width="8" height="16" rx="2" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.75" />
    <rect x="14" y="4" width="8" height="16" rx="2" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.75" />
    <path d="M6 12h4M8 10l2 2-2 2" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 12h-4M16 10l-2 2 2 2" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconInventory: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Lista */}
    <rect x="4" y="3" width="16" height="18" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M9 8h6M9 12h6M9 16h3" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 8l1.2 1.2L11 8" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 12l1.2 1.2L11 12" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconMovement: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Flecha derecha */}
    <path d="M4 12h14M12 7l6 5-6 5" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconRoute: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ruta A→B */}
    <circle cx="6" cy="6" r="3" fill="#3B82F6" />
    <circle cx="6" cy="6" r="1.2" fill="white" />
    <circle cx="18" cy="18" r="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <circle cx="18" cy="18" r="1" fill="#3B82F6" />
    <path d="M9 6h3a3 3 0 013 3 3 3 0 003 3h0" stroke="#3B82F6" strokeWidth="1.75" strokeLinecap="round" fill="none" />
  </svg>
);

// ─── MANAGEMENT ──────────────────────────────────────────────────────────────

export const IconCalendar: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Calendario */}
    <rect x="3" y="5" width="18" height="16" rx="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M3 10h18" stroke="#3B82F6" strokeWidth="1.5" />
    <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#3B82F6" />
    <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#93C5FD" opacity="0.6" />
    <path d="M8 3v4M16 3v4" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const IconDocument: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Documento */}
    <path d="M6 3h8l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M14 3v4h4" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 12h6M9 16h4" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconChart: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Gráfico de barras */}
    <rect x="4" y="14" width="4" height="8" rx="1" fill="#16A34A" />
    <rect x="10" y="8" width="4" height="14" rx="1" fill="#16A34A" opacity="0.6" />
    <rect x="16" y="4" width="4" height="18" rx="1" fill="#16A34A" opacity="0.35" />
    <path d="M3 22h18" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconBell: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Campana */}
    <path d="M12 3a2 2 0 00-2 2v1a6 6 0 00-4 5.6v3L4 17h16l-2-1.5v-3A6 6 0 0014 6V5a2 2 0 00-2-2z" fill="#FEF3C7" stroke="#F97316" strokeWidth="1.75" strokeLinejoin="round" />
    <path d="M10 19a2.5 2.5 0 005 0" stroke="#F97316" strokeWidth="1.75" fill="none" />
    <circle cx="19" cy="5" r="3" fill="#EF4444" />
    <circle cx="19" cy="5" r="1" fill="white" />
  </svg>
);

export const IconTag: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Etiqueta */}
    <path d="M3 12l9-9h6l3 3v6l-9 9-9-9z" fill="#FEF3C7" stroke="#A16207" strokeWidth="1.75" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="1.5" fill="#A16207" />
    <path d="M12 13h3M12 16h2" stroke="#A16207" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconSettings: React.FC<CattleIconProps> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Engranaje */}
    <circle cx="12" cy="12" r="3" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.75" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
