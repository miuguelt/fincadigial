import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconSyringe,
  IconScale,
  IconTrash,
  IconPrinter,
  IconSwitchHorizontal,
  IconDna,
  IconFileText,
  IconFileSpreadsheet,
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface BatchActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onTransfer: () => void;
  onVaccinate?: () => void;
  onWeight?: () => void;
  onReproduction?: () => void;
  onDelete?: () => void;
  onPrintTags?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
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
      'group flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] px-1 sm:px-1.5 py-1.5 rounded-lg transition-all duration-500 active:scale-95 relative overflow-hidden',
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
        'h-5 w-5 sm:h-6 sm:w-6 transition-all duration-700 group-hover:scale-125 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10',
        color,
        hoverColor
      )}
    />
    <span className="text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.18em] mt-1.5 whitespace-nowrap text-white/70 group-hover:text-white transition-all duration-700 relative z-10">
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
  onReproduction,
  onDelete,
  onPrintTags,
  onExportPDF,
  onExportCSV,
  hidden = false,
}) => {
  if (selectedCount === 0 || hidden) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed inset-x-0 bottom-3 sm:bottom-4 z-[1000] flex justify-center pointer-events-none"
        style={{
          // Espacio reservado por el menú lateral (escritorio) y por el botón flotante de
          // acciones rápidas (esquina inferior derecha), publicado por DashboardLayout.
          paddingLeft: 'calc(var(--app-content-left, 0px) + 0.5rem)',
          paddingRight: '4.5rem',
        }}
      >
        <div
          className="flex w-auto max-w-full flex-wrap sm:flex-nowrap items-center justify-center gap-x-2 gap-y-2 rounded-3xl border border-white/10 bg-slate-900/85 dark:bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl relative overflow-hidden text-white ring-1 ring-white/10 transition-opacity duration-300"
          style={{
            // Con el cajón del menú abierto en móvil no hay ancho útil: la barra se retira.
            opacity: 'var(--app-floating-opacity, 1)',
            pointerEvents: 'var(--app-floating-events, auto)' as React.CSSProperties['pointerEvents'],
          }}
        >
          {/* Gradiente de fondo */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />

          {/* ── Contador de selección ──────────────────────────────────── */}
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 text-white shadow-md shrink-0 cursor-default relative border-t border-white/30">
            <div className="flex items-center justify-center h-8 w-8 rounded-[var(--radius-full)] bg-black/30 border border-white/20 shadow-inner">
              <span className="text-lg font-black leading-none drop-shadow-md italic">
                {selectedCount}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] leading-none text-white/90">
                Sujetos
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 leading-none mt-1.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-[var(--radius-full)] bg-emerald-400 animate-pulse" />
                Lote Activo
              </span>
            </div>
          </div>

          {/* ── Acciones ──────────────────────────────────────────────── */}
          {/* Envuelven en varias filas antes que recortarse: todas las opciones deben verse. */}
          <div className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1 flex min-w-0 flex-wrap items-center justify-center gap-1 px-1 relative z-10">
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
                color="text-warning/80"
                glowColor="bg-warning/20"
              />
            )}
            {onVaccinate && (
              <ActionItem
                icon={IconSyringe}
                label="Salud"
                onClick={onVaccinate}
                color="text-destructive/80"
                glowColor="bg-destructive/20"
              />
            )}
            {onReproduction && (
              <ActionItem
                icon={IconDna}
                label="Reproducción"
                onClick={onReproduction}
                color="text-purple-400"
                glowColor="bg-purple-500/20"
              />
            )}
            {onExportPDF && (
              <ActionItem
                icon={IconFileText}
                label="PDF"
                onClick={onExportPDF}
                color="text-red-400"
                glowColor="bg-red-500/20"
              />
            )}
            {onExportCSV && (
              <ActionItem
                icon={IconFileSpreadsheet}
                label="CSV"
                onClick={onExportCSV}
                color="text-emerald-400"
                glowColor="bg-emerald-500/20"
              />
            )}
            {onDelete && (
              <>
                <div className="mx-2 hidden h-10 w-[1px] bg-card/10 shrink-0 sm:block" />
                <ActionItem
                  icon={IconTrash}
                  label="Borrar"
                  onClick={onDelete}
                  color="text-muted-foreground"
                  glowColor="bg-destructive/10"
                  hoverColor="hover:text-destructive"
                />
              </>
            )}
          </div>

          {/* ── Cerrar selección ──────────────────────────────────────── */}
          <div className="flex items-center shrink-0 ml-auto sm:ml-0 pl-2 sm:pl-3 sm:border-l sm:border-white/10 relative z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="h-11 w-11 flex items-center justify-center rounded-lg text-foreground hover:text-white hover:bg-card/10 transition-all active:scale-90 group"
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
