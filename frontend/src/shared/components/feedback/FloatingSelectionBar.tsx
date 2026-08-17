import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTrash, IconEdit, IconX, IconSquareCheck, IconDownload, IconPrinter } from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

interface FloatingSelectionBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onBulkEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  entityLabel?: string;
}

/**
 * FloatingSelectionBar
 *
 * Un dock flotante premium "Crystal" que aparece cuando se seleccionan elementos.
 * Proporciona acciones masivas con una estética de alta fidelidad.
 */
export const FloatingSelectionBar: React.FC<FloatingSelectionBarProps> = ({
  count,
  onClear,
  onDelete,
  onBulkEdit,
  onPrint,
  onExport,
  entityLabel = 'registros'
}) => {
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, x: '-50%', opacity: 0 }}
        animate={{ y: 0, x: '-50%', opacity: 1 }}
        exit={{ y: 100, x: '-50%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 left-1/2 z-[110] w-max max-w-[95vw]"
      >
        <div className={cn(
          "flex items-center gap-2 sm:gap-6 px-4 py-3 sm:px-8 sm:py-4 rounded-[2.5rem]",
          "bg-foreground/90 dark:bg-foreground/95 backdrop-blur-3xl border border-white/20",
          "shadow-[0_30px_70px_rgba(0,0,0,0.6)] text-white"
        )}>
          {/* Contador y Estado */}
          <div className="flex items-center gap-3 pr-2 sm:pr-6 border-r border-white/10">
            <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <IconSquareCheck size="md" />
            </div>
            <div className="hidden xs:block">
              <p className="text-sm font-black tracking-tight leading-none">{count} {entityLabel}</p>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1">Seleccionados</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 sm:gap-3">
            {onBulkEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkEdit}
                className="h-10 px-4 rounded-xl hover:bg-card/10 text-white gap-2 font-bold text-xs uppercase tracking-widest"
              >
                <IconEdit size="sm" />
                <span className="hidden md:inline">Editar</span>
              </Button>
            )}

            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-10 px-4 rounded-xl hover:bg-card/10 text-white gap-2 font-bold text-xs uppercase tracking-widest"
              >
                <IconDownload size="sm" />
                <span className="hidden md:inline">Exportar</span>
              </Button>
            )}

            {onPrint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrint}
                className="h-10 px-4 rounded-xl hover:bg-card/10 text-white gap-2 font-bold text-xs uppercase tracking-widest"
              >
                <IconPrinter size="sm" />
                <span className="hidden md:inline">Imprimir</span>
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-10 px-4 rounded-xl hover:bg-destructive text-white hover:text-white gap-2 font-bold text-xs uppercase tracking-widest bg-destructive/10"
              >
                <IconTrash size="sm" />
                <span className="hidden md:inline">Eliminar</span>
              </Button>
            )}
          </div>

          {/* Cerrar / Limpiar */}
          <div className="pl-2 sm:pl-6 border-l border-white/10">
            <button
              onClick={onClear}
              className="h-10 w-10 rounded-[var(--radius-full)] hover:bg-card/10 flex items-center justify-center transition-all group"
              title="Limpiar selección"
            >
              <IconX size="md" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingSelectionBar;
