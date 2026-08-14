import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconScale,
  IconDroplet,
  IconSwitchHorizontal,
  IconQrcode,
  IconStethoscope,
  IconPlus,
  IconX,
} from "@/shared/ui/icons";
import {
  Home,
  ListChecks,
  Syringe,
  Settings2,
  Check,
  ChevronRight,
  ClipboardList,
  MapPin,
  Dna,
  FileText,
  Baby,
  Pill,
  BarChart3,
  Zap,
  Droplets,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/shared/ui/cn";
import { useRealtimeNotifications, type EnrichedAlert } from "@/shared/hooks/useRealtimeNotifications";

// ─── Tipos ────────────────────────────────────────────────────
interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  path: string;
  bg: string;       // Tailwind bg-* class
  ring: string;     // Tailwind ring-* class for focus / active selection
  category?: 'registro' | 'animal' | 'navegacion';
}

/**
 * Relaciona cada alerta no leída con el acceso donde el usuario puede revisarla.
 * El tipo de alerta es la fuente principal; el contexto del mensaje permite
 * separar alertas de potreros de las alertas generales del hato.
 */
export function getNotificationActionId(notification: EnrichedAlert): string | null {
  const alertType = normalizeNotificationText(
    notification.alertType ?? notification.data?.alert_type ?? '',
  );
  const message = normalizeNotificationText(
    `${notification.title} ${notification.message} ${notification.data?.title ?? ''}`,
  );

  if (alertType.includes('produccion')) return 'milk';
  if (alertType.includes('crecimiento')) return 'weight';
  if (alertType.includes('salud')) return 'health';
  if (alertType.includes('reproduccion')) {
    return message.includes('parto') ? 'births' : 'reproduction';
  }
  if (alertType.includes('estado')) {
    const refersToField = Boolean(notification.data?.field_id)
      || /potrero|rotacion|pastura|campo activo/.test(message);
    return refersToField ? 'fields' : 'animals';
  }
  if (alertType.includes('personalizada')) {
    if (/agua|hidrat|\bph\b/.test(message)) return 'water';
    if (/genet|consangu|cruce/.test(message)) return 'genetics';
    return 'animals';
  }
  if (alertType.includes('predictiva')) return 'reports';

  return null;
}

function normalizeNotificationText(value: unknown): string {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getQuickActionNotificationCounts(
  notifications: EnrichedAlert[],
): Record<string, number> {
  return notifications.reduce<Record<string, number>>((counts, notification) => {
    if (notification.read) return counts;

    const actionId = getNotificationActionId(notification);
    if (actionId) counts[actionId] = (counts[actionId] ?? 0) + 1;
    return counts;
  }, {});
}

function formatNotificationCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

// ─── Catálogo Completo ─────────────────────────────────────────
const CATALOG: QuickAction[] = [
  // Categoría: Registro diario
  {
    id: "milk",
    icon: <IconDroplet size={22} />,
    label: "Leche",
    sub: "Ordeño",
    path: "/quick/milk",
    bg: "bg-blue-500",
    ring: "ring-blue-400",
    category: 'registro',
  },
  {
    id: "weight",
    icon: <IconScale size={22} />,
    label: "Peso",
    sub: "Control",
    path: "/quick/control",
    bg: "bg-orange-500",
    ring: "ring-orange-400",
    category: 'registro',
  },
  {
    id: "health",
    icon: <IconStethoscope size={22} />,
    label: "Salud",
    sub: "Enfermedad",
    path: "/quick/disease",
    bg: "bg-rose-500",
    ring: "ring-rose-400",
    category: 'registro',
  },
  {
    id: "transfer",
    icon: <IconSwitchHorizontal size={22} />,
    label: "Traslado",
    sub: "Potrero",
    path: "/quick/transfer",
    bg: "bg-emerald-500",
    ring: "ring-emerald-400",
    category: 'registro',
  },
  {
    id: "vaccine",
    icon: <Syringe className="h-[20px] w-[20px]" />,
    label: "Vacuna",
    sub: "Inmunización",
    path: "/quick/treatment",
    bg: "bg-violet-500",
    ring: "ring-violet-400",
    category: 'registro',
  },
  {
    id: "treatment",
    icon: <Pill className="h-[20px] w-[20px]" />,
    label: "Tratamiento",
    sub: "Medicamento",
    path: "/quick/treatment",
    bg: "bg-purple-600",
    ring: "ring-purple-400",
    category: 'registro',
  },
  {
    id: "births",
    icon: <Baby className="h-[20px] w-[20px]" />,
    label: "Parto",
    sub: "Nacimiento",
    path: "/quick/birth",
    bg: "bg-pink-500",
    ring: "ring-pink-400",
    category: 'registro',
  },
  {
    id: "water",
    icon: <Droplets className="h-[20px] w-[20px]" />,
    label: "Consumo Agua",
    sub: "Hidratación",
    path: "/quick/water",
    bg: "bg-sky-500",
    ring: "ring-sky-400",
    category: 'registro',
  },
  {
    id: "new_animal",
    icon: <IconPlus size={22} />,
    label: "Nuevo Animal",
    sub: "Registrar",
    path: "/admin/animals?create=1",
    bg: "bg-amber-600",
    ring: "ring-amber-500",
    category: 'registro',
  },
  // Categoría: Animal / Hato
  {
    id: "animals",
    icon: <ListChecks className="h-[20px] w-[20px]" />,
    label: "Animales",
    sub: "Ver hato",
    path: "/admin/animals",
    bg: "bg-amber-500",
    ring: "ring-amber-400",
    category: 'animal',
  },
  {
    id: "scanner",
    icon: <IconQrcode size={22} />,
    label: "Escáner",
    sub: "QR / Tag",
    path: "/scanner",
    bg: "bg-slate-600",
    ring: "ring-slate-400",
    category: 'animal',
  },
  {
    id: "fields",
    icon: <MapPin className="h-[20px] w-[20px]" />,
    label: "Potreros",
    sub: "Campos",
    path: "/admin/fields",
    bg: "bg-green-600",
    ring: "ring-green-400",
    category: 'animal',
  },
  {
    id: "genetics",
    icon: <Dna className="h-[20px] w-[20px]" />,
    label: "Genética",
    sub: "Mejoras",
    path: "/admin/genetic-improvements",
    bg: "bg-indigo-600",
    ring: "ring-indigo-400",
    category: 'animal',
  },
  {
    id: "controls",
    icon: <ClipboardList className="h-[20px] w-[20px]" />,
    label: "Controles",
    sub: "Seguimiento",
    path: "/admin/controls",
    bg: "bg-cyan-600",
    ring: "ring-cyan-400",
    category: 'animal',
  },
  {
    id: "reproduction",
    icon: <Baby className="h-[20px] w-[20px]" />,
    label: "Reproducción",
    sub: "Servicios",
    path: "/admin/reproduction",
    bg: "bg-rose-600",
    ring: "ring-rose-500",
    category: 'animal',
  },
  // Categoría: Navegación
  {
    id: "home",
    icon: <Home className="h-[20px] w-[20px]" />,
    label: "Inicio",
    sub: "Dashboard",
    path: "/dashboard",
    bg: "bg-teal-500",
    ring: "ring-teal-400",
    category: 'navegacion',
  },
  {
    id: "reports",
    icon: <BarChart3 className="h-[20px] w-[20px]" />,
    label: "Reportes",
    sub: "Análisis",
    path: "/admin/reports",
    bg: "bg-sky-600",
    ring: "ring-sky-400",
    category: 'navegacion',
  },
  {
    id: "pdf",
    icon: <FileText className="h-[20px] w-[20px]" />,
    label: "Ficha PDF",
    sub: "Exportar",
    path: "/admin/animals",
    bg: "bg-stone-500",
    ring: "ring-stone-400",
    category: 'navegacion',
  },
  {
    id: "tasks",
    icon: <ListChecks className="h-[20px] w-[20px]" />,
    label: "Tareas",
    sub: "Pendientes",
    path: "/admin/tasks",
    bg: "bg-slate-500",
    ring: "ring-slate-400",
    category: 'navegacion',
  },
];

const DEFAULT_FAV: string[] = [
  "weight",      // Control de peso - lo más usado en campo
  "transfer",    // Traslado entre potreros
  "health",      // Reportar enfermedad
  "milk",        // Registro de ordeño
  "animals",     // Ver listado del hato
  "scanner",     // Escanear QR/Tag
];
const MAX_FAV = 8;
const LS_KEY = "vl_quick_fab_v5";

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  registro: '⚡ Registro Rápido',
  animal: '🐄 Hato y Campo',
  navegacion: '🏠 Navegación',
};

// ─── Componente principal ─────────────────────────────────────
export const FloatingQuickActions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { notifications, refreshAlerts } = useRealtimeNotifications({ loadHistorical: true });
  const notificationCounts = useMemo(
    () => getQuickActionNotificationCounts(notifications),
    [notifications],
  );

  const [favIds, setFavIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_FAV;
    } catch {
      return DEFAULT_FAV;
    }
  });

  const favorites = CATALOG.filter((a) => favIds.includes(a.id));

  const saveFavs = useCallback((next: string[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setFavIds(next);
  }, []);

  const toggleFav = useCallback(
    (id: string) => {
      setFavIds((prev) => {
        if (prev.includes(id)) {
          if (prev.length <= 1) return prev;
          const next = prev.filter((x) => x !== id);
          saveFavs(next);
          return next;
        }
        if (prev.length >= MAX_FAV) return prev;
        const next = [...prev, id];
        saveFavs(next);
        return next;
      });
    },
    [saveFavs]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setEditMode(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        // Check we're not clicking the FAB itself
        const fab = document.getElementById('fqa-fab');
        if (fab && fab.contains(e.target as Node)) return;
        close();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  // Mantener los badges alineados con la campana aun cuando el usuario no
  // tenga una conexión SSE activa.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshAlerts();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [refreshAlerts]);

  const go = useCallback(
    (path: string) => {
      close();
      if (path.startsWith('/quick/')) {
        const action = path.replace('/quick/', '');
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('quick', action);
        setSearchParams(newSearchParams, { replace: true });
      } else {
        navigate(path);
      }
    },
    [close, navigate, searchParams, setSearchParams]
  );

  return (
    <>
      {/* ── Bottom Sheet / Popover ────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={sheetRef}
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
            className={cn(
              // Mobile: Bottom Sheet (full width, desliza desde abajo)
              "fixed bottom-0 left-0 right-0 z-[9999]",
              // Desktop: Floating Popover (anclado a esquina inferior derecha)
              "md:bottom-24 md:left-auto md:right-5 md:w-[360px] md:rounded-lg md:bottom-[88px]",
              // Styles
              "bg-card/85 dark:bg-card/65 backdrop-blur-2xl",
              "border-t md:border border-border/20",
              "rounded-t-3xl",
              "shadow-[0_-20px_60px_rgba(0,0,0,0.25)] md:shadow-[0_20px_60px_rgba(0,0,0,0.25)]",
              "max-h-[80dvh] overflow-hidden flex flex-col"
            )}
          >
            {/* Drag handle - Mobile only */}
            <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
              <div className="h-[4px] w-10 rounded-full bg-foreground/15" />
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {editMode ? (
                <EditPanel
                  catalog={CATALOG}
                  favIds={favIds}
                  onToggle={toggleFav}
                  onDone={() => setEditMode(false)}
                  maxFav={MAX_FAV}
                />
              ) : (
                <ActionGrid
                  items={favorites}
                  notificationCounts={notificationCounts}
                  onAction={go}
                  onEdit={() => setEditMode(true)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB ───────────────────────────────────────────────── */}
      <motion.button
        id="fqa-fab"
        whileTap={{ scale: 0.88 }}
        onClick={() => { setIsOpen((v) => !v); setEditMode(false); }}
        className={cn(
          "fixed bottom-4 right-4 z-[9999]",
          "h-12 w-12 rounded-full",
          "flex items-center justify-center",
          "border-2",
          "shadow-[0_6px_22px_rgba(0,0,0,0.35)]",
          "transition-all duration-300",
          isOpen
            ? "bg-card text-foreground border-border/60 opacity-100"
            : "bg-primary text-white border-primary/30 opacity-45 hover:opacity-100 focus:opacity-100 active:opacity-100"
        )}
        aria-label={isOpen ? "Cerrar menú rápido" : "Abrir menú rápido"}
        aria-expanded={isOpen}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="flex items-center justify-center"
        >
          {isOpen ? <IconX size="md" /> : <Zap className="h-5 w-5" />}
        </motion.div>
      </motion.button>
    </>
  );
};

// ─── Grid de acciones ─────────────────────────────────────────
interface ActionGridProps {
  items: QuickAction[];
  notificationCounts: Record<string, number>;
  onAction: (path: string) => void;
  onEdit: () => void;
}

const ActionGrid: React.FC<ActionGridProps> = ({ items, notificationCounts, onAction, onEdit }) => {
  // Group favorites by category for display
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'registro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const hasMultipleCategories = Object.keys(grouped).length > 1;

  return (
    <div className="px-4 pt-3 pb-6 sm:pb-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 px-0.5">
        <div>
          <p className="text-[13px] font-bold text-foreground">
            Acceso Rápido
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Finca Digital · Campo sin señal
          </p>
        </div>
        <button
          onClick={onEdit}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            "bg-muted/60 border border-border/50",
            "text-[11px] font-semibold text-muted-foreground",
            "hover:bg-muted active:scale-95 transition-all"
          )}
        >
          <Settings2 className="h-3 w-3" />
          Editar
        </button>
      </div>

      {/* Grid — show categories if multiple */}
      {hasMultipleCategories ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-0.5">
                {CATEGORY_LABELS[cat] || cat}
              </p>
              <div className={cn(
                "grid gap-2",
                catItems.length === 1 ? "grid-cols-1" :
                catItems.length === 2 ? "grid-cols-2" :
                catItems.length === 3 ? "grid-cols-3" :
                "grid-cols-2"
              )}>
                {catItems.map((action, idx) => (
                  <Tile
                    key={action.id}
                    action={action}
                    index={idx}
                    notificationCount={notificationCounts[action.id] ?? 0}
                    onPress={() => onAction(action.path)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((action, idx) => (
            <Tile
              key={action.id}
              action={action}
              index={idx}
              notificationCount={notificationCounts[action.id] ?? 0}
              onPress={() => onAction(action.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tile individual ──────────────────────────────────────────
interface TileProps {
  action: QuickAction;
  onPress: () => void;
  index?: number;
  notificationCount?: number;
}

const Tile: React.FC<TileProps> = ({ action, onPress, index = 0, notificationCount = 0 }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.94, y: 12 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{
      type: "spring",
      stiffness: 150,
      damping: 14,
      delay: index * 0.035
    }}
    whileTap={{ scale: 0.93 }}
    whileHover={{ scale: 1.02, y: -2 }}
    onClick={onPress}
    className={cn(
      "flex items-center gap-3",
      "py-3.5 px-4 rounded-lg text-left",
      "bg-card/40 dark:bg-card/25 border border-border/40 backdrop-blur-md",
      "hover:bg-card/60 dark:hover:bg-card/35 transition-all duration-200",
      "min-h-[64px] shadow-sm hover:shadow-md relative"
    )}
    aria-label={notificationCount > 0
      ? `${action.label}. ${notificationCount} notificaciones pendientes`
      : action.label}
    title={notificationCount > 0
      ? `${action.label}: ${notificationCount} notificaciones pendientes`
      : action.label}
  >
    {notificationCount > 0 && (
      <span
        className="absolute -right-1.5 -top-1.5 z-10 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-black leading-none text-destructive-foreground shadow-md ring-2 ring-card"
        aria-hidden="true"
      >
        {formatNotificationCount(notificationCount)}
      </span>
    )}

    {/* Icon badge */}
    <div
      className={cn(
        "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110",
        action.bg
      )}
    >
      {action.icon}
    </div>

    {/* Labels */}
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-bold text-foreground leading-tight">
        {action.label}
      </p>
      <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">
        {action.sub}
      </p>
    </div>
  </motion.button>
);

// ─── Panel de edición de favoritos ───────────────────────────
interface EditPanelProps {
  catalog: QuickAction[];
  favIds: string[];
  onToggle: (id: string) => void;
  onDone: () => void;
  maxFav: number;
}

const EditPanel: React.FC<EditPanelProps> = ({
  catalog,
  favIds,
  onToggle,
  onDone,
  maxFav,
}) => {
  const count = favIds.length;
  
  // Group catalog by category
  const grouped = catalog.reduce((acc, item) => {
    const cat = item.category || 'registro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  return (
    <div className="px-4 pt-3 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[14px] font-bold text-foreground">
            Personalizar
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {count} / {maxFav} favoritos seleccionados
          </p>
        </div>
        <button
          onClick={onDone}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full",
            "bg-primary text-white text-[12px] font-bold",
            "shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Listo
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted/50 rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${(count / maxFav) * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        />
      </div>

      {/* Lista por categorías */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
              {CATEGORY_LABELS[cat] || cat}
            </p>
            <div className="space-y-1.5">
              {catItems.map((action) => {
                const isFav = favIds.includes(action.id);
                const disabled = !isFav && count >= maxFav;

                return (
                  <motion.button
                    key={action.id}
                    whileTap={disabled ? {} : { scale: 0.97 }}
                    onClick={() => !disabled && onToggle(action.id)}
                    disabled={disabled}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                      isFav
                        ? "border-primary/40 bg-primary/8 shadow-sm"
                        : disabled
                        ? "border-border/20 opacity-35 cursor-not-allowed"
                        : "border-border/40 bg-muted/20 hover:bg-muted/40"
                    )}
                  >
                    {/* Mini icon */}
                    <div
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm relative",
                        action.bg
                      )}
                    >
                      {action.icon}
                      {isFav && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-card shadow-sm">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-tight text-foreground">
                        {action.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">
                        {action.sub}
                      </p>
                    </div>

                    {/* Arrow if selected */}
                    {isFav && (
                      <ChevronRight className="h-4 w-4 text-primary/70 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloatingQuickActions;
