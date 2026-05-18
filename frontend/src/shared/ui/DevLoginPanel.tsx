/**
 * DevLoginPanel — Componente Universal de Acceso Rápido para Villaluz
 * ======================================================================
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL PROYECTO
// ─────────────────────────────────────────────────────────────────────────────
const DEV_PASSWORD = 'DevMiguel2024!';

const DEV_ACCOUNTS = [
  { id: '1098',     label: 'Admin',   role: 'Administrador', color: 'blue'    },
  { id: '11111111', label: 'Instr.',  role: 'Instructor',    color: 'orange'  },
  { id: '22222222', label: 'Aprend.', role: 'Aprendiz',      color: 'emerald' },
  { id: '33333333', label: 'Oper.',   role: 'Operario',      color: 'purple'  },
  { id: '44444444', label: 'Vet.',    role: 'Veterinario',   color: 'rose'    },
];
// ─────────────────────────────────────────────────────────────────────────────

// Detectar entorno de desarrollo de forma segura
const isDev = (() => {
  try {
    // Vite
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) return true;
    // CRA/Next
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') return true;
    // Fallback: solo en localhost
    return typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
})();

interface DevLoginPanelProps {
  onSelect: (id: string, password: string) => void;
  autoSubmit?: boolean;
}

export function DevLoginPanel({ onSelect, autoSubmit = true }: DevLoginPanelProps) {
  if (!isDev) return null;

  const colorMap: Record<string, string> = {
    blue:    'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
    purple:  'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700',
    emerald: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700',
    orange:  'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700',
    rose:    'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700',
  };

  const handleClick = (id: string) => {
    onSelect(id, DEV_PASSWORD);
    if (autoSubmit) {
      setTimeout(() => {
        const form = document.querySelector<HTMLFormElement>('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 60);
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-dashed border-gray-200">
      <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">
        ⚡ Acceso Rápido · Dev Only
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {DEV_ACCOUNTS.map((acc) => {
          const colorClasses = (colorMap[acc.color] || colorMap.blue);
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleClick(acc.id)}
              className={`flex flex-col items-center p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${colorClasses}`}
            >
              <span className="font-black text-[11px]">{acc.label}</span>
              <span className="text-[8px] font-bold opacity-70 truncate w-full text-center">{acc.role}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[9px] text-gray-300 mt-2 font-mono">
        🔑 {DEV_PASSWORD}
      </p>
    </div>
  );
}

export default DevLoginPanel;

