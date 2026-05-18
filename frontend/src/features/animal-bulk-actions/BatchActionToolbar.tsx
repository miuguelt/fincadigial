import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconSyringe,
  IconScale,
  IconTrash,
  IconPrinter,
  IconMeat,
  IconSwitchHorizontal,
  IconBolt,
  IconActivity,
  IconFingerprint,
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface BatchActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onTransfer: () => void;
  onVaccinate?: () => void;
  onWeight?: () => void;
  onDelete?: () => void;
  onPrintTags?: () => void;
  selectedLabels?: string[];
  hidden?: boolean;
}

interface ActionItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
  glowColor: string;
  hoverColor?: string;
}

// ─── ActionItem ────────────────────────────────────────────────────────────────

const ActionItem: React.FC<ActionItemProps> = ({
  icon: Icon,
  label,
  onClick,
  color,
  glowColor,
  hoverColor,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      'group flex flex-col items-center justify-center min-w-[85px] h-13 rounded-[var(--radius-lg)] transition-all duration-500 active:scale-95 relative overflow-hidden',
      'hover:bg-card/[0.05] border border-transparent hover:border-white/10'
    )}
  >
    <div
      className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl',
        glowColor
      )}
    />
    <Icon
      className={cn(
        'h-6 w-6 transition-all duration-700 group-hover:scale-125 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10',
        color,
        hoverColor
      )}
    />
    <span className="text-[8px] font-black uppercase tracking-[0.4em] mt-2 text-muted-foreground group-hover:text-white transition-all duration-700 relative z-10 italic">
      {label}
    </span>
  </button>
);

// ─── BatchActionToolbar ────────────────────────────────────────────────────────

/**
 * Barra flotante de acciones masivas sobre animales seleccionados.
 * Se renderiza via createPortal en document.body para garantizar z-index correcto.
 * FIX: Se reformateó desde el colapso de 12 líneas que impedía su mantenimiento.
 */
export const BatchActionToolbar: React.FC<BatchActionToolbarProps> = ({
  selectedCount,
  onClear,
  onTransfer,
  onVaccinate,
  onWeight,
  onDelete,
  onPrintTags,
  hidden = false,
}) => {
  if (selectedCount === 0 || hidden) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center pointer-events-none"
      >
        <div className="flex h-16 items-center gap-4 rounded-[var(--radius-xl)] border border-white/20 bg-[#0f172a]/95 p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl pointer-events-auto max-w-[98vw] relative overflow-hidden">
          {/* Gradiente de fondo */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />

          {/* ── Contador de selección ──────────────────────────────────── */}
          <div className="flex items-center gap-5 px-7 h-full rounded-[var(--radius-lg)] bg-indigo-600 text-white shadow-[var(--shadow-token-lg)] mr-1 shrink-0 cursor-default relative border-t border-white/30">
            <div className="flex items-center justify-center h-9 w-9 rounded-[var(--radius-full)] bg-black/30 border border-white/20 shadow-inner">
              <span className="text-xl font-black leading-none drop-shadow-md italic">
                {selectedCount}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] leading-none italic">
                Sujetos
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400 leading-none mt-1.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-[var(--radius-full)] bg-emerald-400 animate-pulse" />
                Lote Activo
              </span>
            </div>
          </div>

          {/* ── Acciones ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2 relative z-10">
            <ActionItem
              icon={IconSwitchHorizontal}
              label="Traslado"
              onClick={onTransfer}
              color="text-indigo-400"
              glowColor="bg-indigo-500/20"
            />
            {onPrintTags && (
              <ActionItem
                icon={IconPrinter}
                label="Imprimir"
                onClick={onPrintTags}
                color="text-emerald-400"
                glowColor="bg-emerald-500/20"
              />
            )}
            {onWeight && (
              <ActionItem
                icon={IconScale}
                label="Pesaje"
                onClick={onWeight}
                color="text-amber-400"
                glowColor="bg-amber-500/20"
              />
            )}
            {onVaccinate && (
              <ActionItem
                icon={IconSyringe}
                label="Salud"
                onClick={onVaccinate}
                color="text-rose-400"
                glowColor="bg-rose-500/20"
              />
            )}
            {onDelete && (
              <>
                <div className="mx-3 h-10 w-[1px] bg-card/10 shrink-0" />
                <ActionItem
                  icon={IconTrash}
                  label="Borrar"
                  onClick={onDelete}
                  color="text-muted-foreground"
                  glowColor="bg-rose-500/10"
                  hoverColor="hover:text-rose-500"
                />
              </>
            )}
          </div>

          {/* ── Cerrar selección ──────────────────────────────────────── */}
          <div className="flex items-center pr-4 ml-2 border-l border-white/10 pl-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="h-11 w-11 flex items-center justify-center rounded-[var(--radius-lg)] text-foreground hover:text-white hover:bg-card/10 transition-all active:scale-90 group"
              aria-label="Cerrar selección"
            >
              <IconX className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
