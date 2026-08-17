
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/ui/cn.ts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Interfaces y tipos
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

interface GenericModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  /** Línea secundaria bajo el título (ubicación, periodo, contexto). */
  subtitle?: React.ReactNode;
  /** Contenido extra en la cabecera, a la derecha del título. */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: ModalSize;
  enableBackdropBlur?: boolean;
  description?: string;
  disableAnimations?: boolean;
  draggable?: boolean;
  variant?: 'default' | 'compact';
  fullScreen?: boolean;
  allowFullScreenToggle?: boolean;
  onFullScreenChange?: (next: boolean) => void;
  /** Usa casi todo el ancho de la pantalla. Ideal para modales con tablas, formularios complejos o datos densos. */
  fullWidth?: boolean;
  footer?: React.ReactNode;
  // Navegación entre items
  enableNavigation?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  zIndex?: number;
  themeColor?: 'blue' | 'cyan' | 'teal' | 'emerald' | 'purple' | 'indigo' | 'red' | 'amber' | 'slate';
  tabs?: React.ReactNode;
  bodyClassName?: string;
  icon?: React.ReactNode;
}

// Mapeo de tamaños a clases Tailwind
const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-3xl',
  '3xl': 'sm:max-w-4xl',
  '4xl': 'sm:max-w-5xl',
  '5xl': 'sm:max-w-6xl',
  '6xl': 'sm:max-w-7xl',
  '7xl': 'sm:max-w-[90vw]',
  full: 'sm:max-w-[95vw]',
};

const headerGradients: Record<string, string> = {
  blue: "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-800 dark:via-blue-900 dark:to-indigo-950",
  cyan: "bg-gradient-to-r from-cyan-600 via-teal-600 to-teal-700 dark:from-cyan-800 dark:via-teal-900 dark:to-emerald-950",
  teal: "bg-gradient-to-r from-teal-600 via-emerald-600 to-emerald-700 dark:from-teal-800 dark:via-teal-900 dark:to-green-950",
  emerald: "bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 dark:from-emerald-800 dark:via-teal-900 dark:to-green-950",
  purple: "bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 dark:from-purple-800 dark:via-indigo-900 dark:to-slate-900",
  indigo: "bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 dark:from-indigo-800 dark:via-indigo-900 dark:to-slate-900",
  red: "bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 dark:from-red-800 dark:via-rose-900 dark:to-red-950",
  amber: "bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-900",
  slate: "bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900",
};

/**
 * Componente GenericModal optimizado para rendimiento y accesibilidad.
 */
export const GenericModal: React.FC<GenericModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  headerExtra,
  children,
  className,
  size = 'full',
  description,
  disableAnimations = false,
  draggable = false,
  variant = 'default',
  fullScreen = false,
  allowFullScreenToggle = false,
  onFullScreenChange,
  fullWidth = false,
  footer,
  enableNavigation = false,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  zIndex,
  themeColor,
  tabs,
  bodyClassName,
  icon,
}) => {
  const useFullWidth = fullWidth || size === 'full' || size === '7xl';
  const overlayClasses = cn(
    'fixed inset-0 flex items-start justify-center px-1.5 py-2',
    'sm:px-2 sm:py-3 lg:px-3',
    'bg-black/70 dark:bg-black/80',
    'backdrop-blur-[18px] motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none'
  );

  // IDs estables para accesibilidad
  const titleId = React.useId();
  const descriptionId = React.useId();

  // Estados para drag & drop
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Reset position when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggable || !dialogRef.current) return;

    const rect = dialogRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y,
    });
    setIsDragging(true);
  };

  React.useEffect(() => {
    if (!isDragging || !draggable) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dialogRef.current) return;

      const rect = dialogRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, draggable]);

  // Manejador de navegación por teclado
  React.useEffect(() => {
    if (!isOpen || !enableNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo manejar si el foco está dentro del modal o no hay input activo
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) return;

      if (e.key === 'ArrowLeft' && hasPrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enableNavigation, hasPrevious, hasNext, onNavigatePrevious, onNavigateNext]);

  const [fsInternal, setFsInternal] = React.useState<boolean>(fullScreen);
  React.useEffect(() => {
    setFsInternal(fullScreen);
  }, [fullScreen]);

  const computedFullScreen = allowFullScreenToggle ? fsInternal : fullScreen;

  const modalClasses = cn(
    // Base: móvil fullscreen sheet, escritorio centrado
    'max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:w-screen max-sm:max-w-none max-sm:h-dvh max-sm:rounded-none max-sm:border-0',
    '!flex !flex-col !p-0 !gap-0',
    'bg-card',
    'shadow-2xl shadow-black/20 dark:shadow-black/40',
    'rounded-t-2xl sm:rounded-lg',
    'border border-border/50 dark:border-white/10',
    'backdrop-blur-sm',
    'vl-modal-surface text-foreground',
    'h-auto',
    'max-h-[96vh] sm:max-h-[92vh] max-sm:max-h-dvh',
    'min-h-[200px]',

    // Pantalla completa: anula todo
    computedFullScreen && '!w-screen !max-w-none !h-dvh !max-h-none !min-h-0 !rounded-none !border-0',

    // Modo fullWidth: usa casi todo el ancho disponible, útil para tablas y formularios densos
    !computedFullScreen && useFullWidth && cn(
      'w-[99vw] sm:w-[98vw] md:w-[97vw]',
      'max-w-[99vw] sm:max-w-[98vw] md:max-w-[97vw]',
      'min-w-[300px] sm:min-w-[400px]',
    ),

    // Modo normal: prioriza ancho útil sin llegar a pantalla completa.
    !computedFullScreen && !useFullWidth && cn(
      'w-[97vw] sm:w-[94vw] lg:w-[88vw]',
      'min-w-[300px] sm:min-w-[400px]',
      'max-w-[97vw] sm:max-w-[94vw] lg:max-w-[88vw]',
    ),

    // Tamaño específico: solo se aplica si no es fullWidth (el default 'full' no aplica sizeClasses)
    !computedFullScreen && !useFullWidth && sizeClasses[size],

    !disableAnimations && 'transition-all duration-300 ease-out',
    variant === 'compact' && 'max-sm:text-sm',
    className
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        zIndex={zIndex}
        fullWidth={useFullWidth}
        ref={dialogRef}
        className={cn(modalClasses)}
        overlayClassName={overlayClasses}
        closeButtonClassName="bg-white/10 text-white hover:bg-white/20 focus:ring-white/50"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={{
          cursor: isDragging ? 'grabbing' : 'default',
          ...(draggable && { transform: `translate(${position.x}px, ${position.y}px)` }),
        }}
      >
        <DialogHeader
          className={cn(
            "relative shadow-md",
            themeColor ? headerGradients[themeColor] : "bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-950 dark:to-slate-900",
            variant === 'compact'
              ? allowFullScreenToggle ? "px-3 sm:px-4 py-2 pr-14 sm:pr-16" : "px-3 sm:px-4 py-2 pr-11 sm:pr-12"
              : allowFullScreenToggle ? "px-3 sm:px-4 py-2.5 pr-14 sm:pr-16" : "px-3 sm:px-4 py-2.5 pr-11 sm:pr-12",
            draggable && "cursor-grab active:cursor-grabbing select-none"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon !== null && (
              <div className="h-7 w-7 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                {icon !== undefined ? icon : (
                  <svg className="w-4 h-4 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
              </div>
            )}
            {title ? (
              <div className="min-w-0 flex-1 text-left">
                <DialogTitle
                  id={titleId}
                  className="break-words pr-1 text-base font-bold leading-tight text-white drop-shadow-md sm:text-lg"
                >
                  {title}
                </DialogTitle>
                {subtitle && (
                  <p className="mt-1 break-words text-xs font-normal leading-snug text-white/85 drop-shadow-sm">
                    {subtitle}
                  </p>
                )}
              </div>
            ) : (
              <DialogTitle id={titleId} className="sr-only">
                Modal
              </DialogTitle>
            )}

            <div className="flex-shrink-0 flex items-center gap-1.5 ml-auto mr-9 sm:mr-10">
              {headerExtra}
              {allowFullScreenToggle && (
                <button
                  type="button"
                  aria-label={computedFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 shadow-sm motion-safe:transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !fsInternal;
                    setFsInternal(next);
                    onFullScreenChange?.(next);
                  }}
                >
                  {computedFullScreen ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" /><path d="M21 16v3a2 2 0 0 1-2 2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z" /><path d="M14 3h7v7h-7z" /><path d="M3 14h7v7H3z" /><path d="M14 14h7v7h-7z" /></svg>
                  )}
                </button>
              )}
            </div>
          </div>

          <DialogDescription id={descriptionId} className="sr-only">
            {description || 'Contenido del diálogo'}
          </DialogDescription>
        </DialogHeader>

        {tabs && (
          <div className="flex-shrink-0 border-b border-border bg-muted/20">
            {tabs}
          </div>
        )}

        <div
          tabIndex={0}
          className={bodyClassName !== undefined ? bodyClassName : cn(
            "overflow-x-hidden overflow-y-auto overscroll-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 flex-1 min-h-0",
            variant === 'compact' ? "px-2 sm:px-3 py-2" : "px-3 sm:px-4 py-2.5",
            variant === 'compact' && 'max-[360px]:text-xs'
          )}>
          {children}
        </div>

        {footer && (
          <div className="flex-shrink-0">
            {footer}
          </div>
        )}

        {enableNavigation && (
          <>
            {hasPrevious && onNavigatePrevious && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigatePrevious();
                }}
                aria-label="Anterior"
                className={cn(
                  "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full",
                  "bg-background/80 backdrop-blur-md border border-border/60 text-foreground/70",
                  "hover:bg-background hover:text-foreground hover:shadow-lg hover:scale-105",
                  "active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 z-10",
                  "shadow-md"
                )}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}

            {hasNext && onNavigateNext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateNext();
                }}
                aria-label="Siguiente"
                className={cn(
                  "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full",
                  "bg-background/80 backdrop-blur-md border border-border/60 text-foreground/70",
                  "hover:bg-background hover:text-foreground hover:shadow-lg hover:scale-105",
                  "active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 z-10",
                  "shadow-md"
                )}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const useUnifiedDisclosure = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (open: boolean) => setIsOpen(open),
  } as const;
};
