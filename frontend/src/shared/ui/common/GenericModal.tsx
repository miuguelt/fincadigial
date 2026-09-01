import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/ui/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Interfaces y tipos
export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";

interface GenericModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: ModalSize;
  enableBackdropBlur?: boolean;
  description?: string;
  disableAnimations?: boolean;
  draggable?: boolean;
  variant?: "default" | "compact";
  fullScreen?: boolean;
  allowFullScreenToggle?: boolean;
  onFullScreenChange?: (next: boolean) => void;
  fullWidth?: boolean;
  footer?: React.ReactNode;
  enableNavigation?: boolean;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  zIndex?: number;
  themeColor?: "blue" | "cyan" | "teal" | "emerald" | "purple" | "indigo" | "red" | "amber" | "slate";
  tabs?: React.ReactNode;
  bodyClassName?: string;
  icon?: React.ReactNode;
  preventCloseOnOutsideClick?: boolean;
}

// Mapeo de tamaños a clases Tailwind
const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-3xl",
  "3xl": "sm:max-w-4xl",
  "4xl": "sm:max-w-5xl",
  "5xl": "sm:max-w-6xl",
  "6xl": "sm:max-w-7xl",
  "7xl": "sm:max-w-[90vw]",
  full: "sm:max-w-[95vw]",
};

const headerGradients: Record<string, string> = {
  blue: "bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950 border-b border-white/10",
  cyan: "bg-gradient-to-r from-slate-900 via-teal-900 to-emerald-950 dark:from-slate-950 dark:via-teal-950 dark:to-slate-950 border-b border-white/10",
  teal: "bg-gradient-to-r from-slate-900 via-emerald-900 to-teal-950 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-950 border-b border-white/10",
  emerald: "bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950 border-b border-white/10",
  purple: "bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-950 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950 border-b border-white/10",
  indigo: "bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-950 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 border-b border-white/10",
  red: "bg-gradient-to-r from-slate-900 via-rose-900 to-red-950 dark:from-slate-950 dark:via-rose-950 dark:to-slate-950 border-b border-white/10",
  amber: "bg-gradient-to-r from-slate-900 via-amber-900 to-orange-950 dark:from-slate-950 dark:via-amber-950 dark:to-slate-950 border-b border-white/10",
  slate: "bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 dark:from-slate-900 dark:via-slate-950 dark:to-black border-b border-white/10",
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
  size = "full",
  description,
  disableAnimations = false,
  draggable = false,
  variant = "default",
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
  preventCloseOnOutsideClick,
}) => {
  const useFullWidth = fullWidth || size === "full" || size === "7xl";
  const overlayClasses = cn(
    "fixed inset-0 flex items-start justify-center px-1.5 py-2",
    "sm:px-3 sm:py-4 lg:px-4",
    "bg-black/60 dark:bg-black/80",
    "backdrop-blur-[12px] motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none"
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

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, draggable]);

  // Manejador de navegación por teclado
  React.useEffect(() => {
    if (!isOpen || (!enableNavigation && !onNavigatePrevious && !onNavigateNext)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      // Alt + Left / Alt + Right funcionan siempre, incluso dentro de inputs
      if (e.altKey && (e.key === "ArrowLeft" || e.keyCode === 37) && hasPrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
        return;
      }
      if (e.altKey && (e.key === "ArrowRight" || e.keyCode === 39) && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
        return;
      }

      // Flechas solas funcionan cuando no se está editando texto
      if (!isInput) {
        if ((e.key === "ArrowLeft" || e.keyCode === 37) && hasPrevious && onNavigatePrevious) {
          e.preventDefault();
          onNavigatePrevious();
        } else if ((e.key === "ArrowRight" || e.keyCode === 39) && hasNext && onNavigateNext) {
          e.preventDefault();
          onNavigateNext();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, enableNavigation, hasPrevious, hasNext, onNavigatePrevious, onNavigateNext]);

  const [fsInternal, setFsInternal] = React.useState<boolean>(fullScreen);
  React.useEffect(() => {
    setFsInternal(fullScreen);
  }, [fullScreen]);

  const computedFullScreen = allowFullScreenToggle ? fsInternal : fullScreen;

  const modalClasses = cn(
    // Base: móvil fullscreen sheet, escritorio centrado
    "max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:w-screen max-sm:max-w-none max-sm:h-dvh max-sm:rounded-none max-sm:border-0",
    "!flex !flex-col !p-0 !gap-0",
    "bg-card",
    "shadow-2xl shadow-black/25 dark:shadow-black/60",
    "rounded-t-2xl sm:rounded-2xl",
    "border border-border/70 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5",
    "backdrop-blur-md",
    "vl-modal-surface text-foreground",
    "h-auto",
    "max-h-[96vh] sm:max-h-[92vh] max-sm:max-h-dvh",
    "min-h-[200px]",

    // Pantalla completa: anula todo
    computedFullScreen && "!w-screen !max-w-none !h-dvh !max-h-none !min-h-0 !rounded-none !border-0 !ring-0",

    // Modo fullWidth: usa casi todo el ancho disponible, útil para tablas y formularios densos
    !computedFullScreen && useFullWidth && cn(
      "w-[99vw] sm:w-[98vw] md:w-[97vw]",
      "max-w-[99vw] sm:max-w-[98vw] md:max-w-[97vw]",
      "min-w-[300px] sm:min-w-[400px]",
    ),

    // Modo normal: prioriza ancho útil sin llegar a pantalla completa.
    !computedFullScreen && !useFullWidth && cn(
      "w-[97vw] sm:w-[94vw] lg:w-[88vw]",
      "min-w-[300px] sm:min-w-[400px]",
      "max-w-[97vw] sm:max-w-[94vw] lg:max-w-[88vw]",
    ),

    // Tamaño específico: solo se aplica si no es fullWidth (el default full no aplica sizeClasses)
    !computedFullScreen && !useFullWidth && sizeClasses[size],

    !disableAnimations && "transition-all duration-300 ease-out",
    variant === "compact" && "max-sm:text-sm",
    className
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        zIndex={zIndex}
        fullWidth={useFullWidth}
        preventCloseOnOutsideClick={preventCloseOnOutsideClick}
        ref={dialogRef}
        className={cn(modalClasses)}
        overlayClassName={overlayClasses}
        closeButtonClassName="bg-white/10 text-white hover:bg-white/20 focus:ring-white/50 rounded-full transition-all duration-200"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={{
          cursor: isDragging ? "grabbing" : "default",
          ...(draggable && { transform: `translate(${position.x}px, ${position.y}px)` }),
        }}
      >
        <DialogHeader
          className={cn(
            "relative shadow-sm",
            themeColor ? headerGradients[themeColor] : "bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-b border-white/10 text-white",
            variant === "compact"
              ? allowFullScreenToggle ? "px-4 sm:px-5 py-3 pr-14 sm:pr-16" : "px-4 sm:px-5 py-3 pr-11 sm:pr-12"
              : allowFullScreenToggle ? "px-4 sm:px-5 py-3.5 pr-14 sm:pr-16" : "px-4 sm:px-5 py-3.5 pr-11 sm:pr-12",
            draggable && "cursor-grab active:cursor-grabbing select-none"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon !== null && (
              <div className="h-8 w-8 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0 shadow-sm">
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
                  aria-label={computedFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
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
            {description || "Contenido del diálogo"}
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
            variant === "compact" ? "px-2 sm:px-3 py-2" : "px-3 sm:px-4 py-2.5",
            variant === "compact" && "max-[360px]:text-xs"
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
                aria-label="Anterior (← o Alt+←)"
                title="Anterior (← o Alt+←)"
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
                aria-label="Siguiente (→ o Alt+→)"
                title="Siguiente (→ o Alt+→)"
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

