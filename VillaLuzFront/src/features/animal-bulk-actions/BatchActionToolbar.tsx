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
}

// ─── ActionItem ────────────────────────────────────────────────────────────────

const ActionItem: React.FC<ActionItemProps> = ({
  icon: Icon,
  label,
  onClick,
  color,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      'group flex flex-col items-center justify-center min-w-[64px] px-1 h-full rounded-xl transition-all duration-200 active:scale-95',
      'hover:bg-accent hover:text-accent-foreground'
    )}
  >
    <Icon
      className={cn(
        'h-5 w-5 mb-1 transition-transform duration-200 group-hover:-translate-y-0.5',
        color
      )}
    />
    <span className={cn(
      "text-[10px] font-medium tracking-wide text-muted-foreground group-hover:text-foreground transition-colors duration-200"
    )}>
      {label}
    </span>
  </button>
);

// ─── BatchActionToolbar ────────────────────────────────────────────────────────

/**
 * Barra flotante de acciones masivas sobre animales seleccionados.
 * Se renderiza via createPortal en document.body para garantizar z-index correcto.
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
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 lg:right-8 lg:bottom-8 z-[120] flex justify-center md:justify-end items-center pointer-events-none"
      >
        <div className="flex h-16 items-center gap-1.5 rounded-[2rem] border border-border bg-popover p-1.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto w-full md:w-auto md:max-w-max relative text-popover-foreground ring-1 ring-border/50">
          
          {/* ── Contador de selección ──────────────────────────────────── */}
          <div className="flex items-center gap-3 pl-2 pr-5 h-full rounded-full bg-primary text-primary-foreground shadow-sm mr-1 shrink-0 cursor-default">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-black/10 backdrop-blur-sm">
              <span className="text-xl font-black tabular-nums tracking-tighter">
                {selectedCount}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[11px] font-black uppercase tracking-widest leading-none mb-1">
                Sujetos
              </span>
              <span className="text-[9px] font-bold tracking-widest opacity-90 leading-none flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse opacity-80" />
                Lote Activo
              </span>
            </div>
          </div>

          {/* ── Acciones ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 h-full">
            <ActionItem
              icon={IconSwitchHorizontal}
              label="Traslado"
              onClick={onTransfer}
              color="text-indigo-500 dark:text-indigo-400"
            />
            {onPrintTags && (
              <ActionItem
                icon={IconPrinter}
                label="Imprimir"
                onClick={onPrintTags}
                color="text-emerald-500 dark:text-emerald-400"
              />
            )}
            {onWeight && (
              <ActionItem
                icon={IconScale}
                label="Pesaje"
                onClick={onWeight}
                color="text-amber-500 dark:text-amber-400"
              />
            )}
            {onVaccinate && (
              <ActionItem
                icon={IconSyringe}
                label="Salud"
                onClick={onVaccinate}
                color="text-red-500 dark:text-red-400"
              />
            )}
            {onReproduction && (
              <ActionItem
                icon={IconDna}
                label="Reprod."
                onClick={onReproduction}
                color="text-purple-500 dark:text-purple-400"
              />
            )}
            {onExportPDF && (
              <ActionItem
                icon={IconFileText}
                label="PDF"
                onClick={onExportPDF}
                color="text-rose-500 dark:text-rose-400"
              />
            )}
            {onExportCSV && (
              <ActionItem
                icon={IconFileSpreadsheet}
                label="CSV"
                onClick={onExportCSV}
                color="text-teal-500 dark:text-teal-400"
              />
            )}
            {onDelete && (
              <>
                <div className="mx-1 h-8 w-[1px] bg-border shrink-0 rounded-full" />
                <ActionItem
                  icon={IconTrash}
                  label="Borrar"
                  onClick={onDelete}
                  color="text-muted-foreground"
                />
              </>
            )}
          </div>

          {/* ── Cerrar selección ──────────────────────────────────────── */}
          <div className="flex items-center pr-1 pl-1 relative z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90 group"
              aria-label="Cerrar selección"
            >
              <IconX className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

