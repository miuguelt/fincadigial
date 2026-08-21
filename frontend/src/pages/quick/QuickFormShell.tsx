/**
 * QuickFormShell — Layout compartido de formularios rápidos de campo.
 * Diseñado para máxima usabilidad con manos sucias, pantallas pequeñas
 * y condiciones de baja luz o sol directo.
 */
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { IconArrowLeft, IconWifiOff, IconRefresh } from "@/shared/ui/icons";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

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
  volver = "/operario/dashboard",
}: QuickFormShellProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.has("quick");
  const { isOnline, totalOperations } = useOnlineStatus();
  return (
    <div className={`font-sans ${isModal ? "bg-transparent" : "min-h-screen bg-background"}`}>
      {/* ── CABECERA COLOREADA ───────────────────────────────────── */}
      {!isModal && (
        <header className={`${colorHeader} px-4 pb-10 pt-6 text-white rounded-b-[var(--radius-xl)] shadow-md relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-[var(--radius-full)] -mr-16 -mt-16 blur-2xl" />

          <button
            onClick={() => navigate(volver)}
            className="mb-6 flex items-center gap-2 rounded-lg bg-card/20 px-4 py-2.5 text-[11px] font-semibold text-sm transition hover:bg-card/30 backdrop-blur-md border border-white/10"
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
                className={`mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-4 py-1 text-[11px] font-semibold text-sm ${
                  isOnline
                    ? "bg-card/20 text-white border border-white/10"
                    : "bg-amber-400 text-amber-900 shadow-sm"
                }`}
              >
                {!isOnline && <IconWifiOff size="sm" />}
                {isOnline ? "Sincronizado" : "Modo sin conexión"}
              </span>
            </div>
          </div>

          {/* Cola offline */}
          {totalOperations > 0 && (
            <div className="mt-6 max-w-lg mx-auto rounded-[var(--radius-md)] bg-black/20 backdrop-blur-md px-5 py-3 text-[11px] font-black text-white/90 border border-white/5 uppercase tracking-widest">
              <IconRefresh className="w-3 h-3 inline mr-2 animate-spin" />
              {totalOperations} registros pendientes de envío
            </div>
          )}
        </header>
      )}

      {/* ── CUERPO ──────────────────────────────────────────────── */}
      <main className={`mx-auto max-w-lg px-4 ${isModal ? "pt-6 pb-6" : "-mt-6"}`}>
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
    <label htmlFor={htmlFor} className="mb-2 block text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">
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
        disabled:opacity-50 ${props.className ?? ""}`}
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-xl border-2 py-3 sm:py-4 px-3 text-xs sm:text-sm font-black uppercase tracking-tight transition-all active:scale-95 ${
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "border-border bg-card text-muted-foreground hover:border-accent"
          } ${opt.color ?? ""}`}
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
        className="w-full rounded-xl border-2 border-border bg-card px-5 py-4 text-base sm:text-lg font-black text-foreground outline-none transition focus:border-primary disabled:opacity-50 appearance-none shadow-sm"
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
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <IconRefresh className="w-5 h-5 opacity-50 rotate-90" />
      </div>
    </div>
  );
}

/** Botón de acción principal */
export function QSubmitButton({
  loading,
  children,
  color = "bg-primary",
}: {
  loading?: boolean;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full rounded-2xl ${color} py-5 sm:py-6 text-base sm:text-lg font-black uppercase tracking-[0.2em] text-white shadow-lg transition-all
        hover:brightness-110 active:scale-95 disabled:opacity-60 shadow-primary/20`}
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
  return <div className="space-y-2 sm:space-y-3">{children}</div>;
}

/** Tarjeta contenedora */
export function QCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-5 sm:p-6 shadow-md border border-border">
      {children}
    </div>
  );
}

/** Stepper numérico táctil con presets rápidos para registro en campo */
export function QNumberStepper({
  id,
  value,
  onChange,
  unit = "",
  min = 0,
  max = 9999,
  step = 1,
  presets = [],
  placeholder = "0",
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const numValue = value === "" ? 0 : Number(value);

  const adjust = (delta: number) => {
    const next = Math.max(min, Math.min(max, Math.round((numValue + delta) * 10) / 10));
    onChange(String(next));
  };

  return (
    <div className="space-y-3">
      {/* Contenedor de input con botones de +/- */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || numValue <= min}
          onClick={() => adjust(-step)}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 border-border bg-card text-2xl font-black text-foreground flex items-center justify-center transition-all active:scale-90 hover:bg-muted disabled:opacity-40 select-none shadow-sm shrink-0"
          aria-label="Disminuir valor"
        >
          −
        </button>

        <div className="relative flex-1 min-w-0">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-4 text-2xl sm:text-3xl font-black text-foreground text-center outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
          />
          {unit && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-muted-foreground pointer-events-none">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={disabled || numValue >= max}
          onClick={() => adjust(step)}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 border-border bg-card text-2xl font-black text-foreground flex items-center justify-center transition-all active:scale-90 hover:bg-muted disabled:opacity-40 select-none shadow-sm shrink-0"
          aria-label="Aumentar valor"
        >
          +
        </button>
      </div>

      {/* Chips de ajuste rápido (presets) */}
      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Rápido:
          </span>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => adjust(preset)}
              className="h-9 px-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-primary/15 hover:text-primary hover:border-primary/40 text-xs font-black transition-all active:scale-95 shadow-sm"
            >
              +{preset}{unit}
            </button>
          ))}
          {value !== "" && Number(value) > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="h-9 px-2.5 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ml-auto"
            >
              Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
