/**
 * QuickFormShell — Layout compartido de formularios rápidos de campo.
 * Diseñado para máxima usabilidad con manos sucias, pantallas pequeñas
 * y condiciones de baja luz o sol directo.
 */
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconArrowLeft, IconWifiOff, IconRefresh } from '@/shared/ui/icons';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

interface QuickFormShellProps {
  titulo: string;
  icon?: React.ElementType;
  colorHeader: string;        // Tailwind bg class
  children: React.ReactNode;
  volver?: string;            // ruta de regreso (default: /operario/dashboard)
}

export function QuickFormShell({
  titulo,
  icon: Icon,
  colorHeader,
  children,
  volver = '/operario/dashboard',
}: QuickFormShellProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.has('quick');
  const { isOnline, totalOperations } = useOnlineStatus();
  return (
    <div className={`font-sans ${isModal ? 'bg-transparent' : 'min-h-screen bg-background'}`}>
      {/* ── CABECERA COLOREADA ───────────────────────────────────── */}
      {!isModal && (
        <header className={`${colorHeader} px-4 pb-10 pt-6 text-white rounded-b-[var(--radius-xl)] shadow-md relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-[var(--radius-full)] -mr-16 -mt-16 blur-2xl" />
          
          <button
            onClick={() => navigate(volver)}
            className="mb-6 flex items-center gap-2 rounded-lg bg-card/20 px-4 py-2.5 text-[10px] font-semibold text-sm transition hover:bg-card/30 backdrop-blur-md border border-white/10"
          >
            <IconArrowLeft size="sm" />
            Volver
          </button>

          <div className="flex items-center gap-4 max-w-lg mx-auto">
            {Icon && (
              <div className="p-4 rounded-lg bg-card/20 backdrop-blur-md border border-white/20 shadow-sm">
                <Icon className="w-10 h-10 text-white stroke-[2.5]" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-tighter uppercase">{titulo}</h1>
              {/* Estado de red */}
              <span
                className={`mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-4 py-1 text-[8px] font-semibold text-sm ${
                  isOnline
                    ? 'bg-card/20 text-white border border-white/10'
                    : 'bg-amber-400 text-amber-900 shadow-sm'
                }`}
              >
                {!isOnline && <IconWifiOff size="sm" />}
                {isOnline ? 'Sincronizado' : 'Modo Offline'}
              </span>
            </div>
          </div>

          {/* Cola offline */}
          {totalOperations > 0 && (
            <div className="mt-6 max-w-lg mx-auto rounded-[var(--radius-md)] bg-black/20 backdrop-blur-md px-5 py-3 text-[10px] font-black text-white/90 border border-white/5 uppercase tracking-widest">
              <IconRefresh className="w-3 h-3 inline mr-2 animate-spin" />
              {totalOperations} registros pendientes de envío
            </div>
          )}
        </header>
      )}

      {/* ── CUERPO ──────────────────────────────────────────────── */}
      <main className={`mx-auto max-w-lg px-4 ${isModal ? 'pt-6 pb-6' : '-mt-6'}`}>
        {isModal && (
          <div className="flex items-center gap-3 mb-6">
            {Icon && (
              <div className={`p-3 rounded-lg ${colorHeader} text-white shadow-sm`}>
                <Icon className="w-6 h-6 stroke-[2.5]" />
              </div>
            )}
            <h1 className="text-2xl font-black leading-tight tracking-tighter uppercase text-foreground">{titulo}</h1>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

// ─── Primitivas de campo reutilizables ────────────────────────────────────────

/** Etiqueta grande para campo */
export function QLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
      {children}
    </label>
  );
}

/** Input grande táctil */
export function QInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border-2 border-border bg-card px-6 py-5 text-xl font-black text-foreground outline-none transition
        focus:border-primary focus:ring-4 focus:ring-primary/10
        disabled:opacity-50 ${props.className ?? ''}`}
    />
  );
}

/** Selector grande tipo "chip" — para opciones finitas */
export function QChipGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T; color?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border-2 py-4 px-4 text-xs font-black uppercase tracking-tight transition-all active:scale-95 ${
            value === opt.value
              ? `border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20`
              : 'border-border bg-card text-muted-foreground hover:border-accent'
          } ${opt.color ?? ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Select nativo grande (mejor que Radix en móvil) */
export function QSelect({
  id,
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-border bg-card px-6 py-5 text-lg font-black text-foreground outline-none transition focus:border-primary disabled:opacity-50 appearance-none shadow-[var(--shadow-token-sm)]"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <IconRefresh className="w-5 h-5 opacity-50 rotate-90" />
      </div>
    </div>
  );
}

/** Botón de acción principal */
export function QSubmitButton({
  loading,
  children,
  color = 'bg-primary',
}: {
  loading?: boolean;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full rounded-[var(--radius-xl)] ${color} py-6 text-base font-black uppercase tracking-[0.2em] text-white shadow-md transition-all
        hover:brightness-110 active:scale-95 disabled:opacity-60 shadow-primary/10`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-3">
          <IconRefresh size="md" className="animate-spin" />
          Guardando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** Sección de campo con espaciado */
export function QField({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

/** Tarjeta contenedora */
export function QCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-card p-6 shadow-sm border border-border">
      {children}
    </div>
  );
}

