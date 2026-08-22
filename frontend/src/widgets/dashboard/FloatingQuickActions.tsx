import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  MessageCircle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/shared/ui/cn";
import { useAuth } from "@/features/auth/model/useAuth";
import { normalizeRole } from "@/features/auth/api/auth.service";
import { canAccessRoutePath, toRolePath } from "@/shared/lib/routeAccess";
import { openFloatingChat } from "@/features/chat/model/floatingChat";

// ─── Tipos ────────────────────────────────────────────────────
export interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  path: string;
  bg: string;       // Tailwind bg-* class
  ring: string;     // Tailwind ring-* class for focus / active selection
  category?: 'registro' | 'animal' | 'navegacion';
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
  // Categoría: Animal / Ganado
  {
    id: "animals",
    icon: <ListChecks className="h-[20px] w-[20px]" />,
    label: "Animales",
    sub: "Ver ganado",
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
    id: "chat",
    icon: <MessageCircle className="h-[20px] w-[20px]" />,
    label: "Chat",
    sub: "Mensajes y soporte",
    path: "/chat",
    bg: "bg-emerald-600",
    ring: "ring-emerald-400",
    category: 'navegacion',
  },
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
  "chat",        // Chat y mensajes en 1ª posición
  "weight",      // Control de peso - lo más usado en campo
  "transfer",    // Traslado entre potreros
  "health",      // Reportar enfermedad
  "milk",        // Registro de ordeño
  "animals",     // Ver listado del ganado
  "scanner",     // Escanear QR/Tag
];
const MAX_FAV = 8;
const LS_KEY = "vl_quick_fab_v5";

import { offlineQueue, type QueuedOperation } from "@/shared/api/offline/offlineQueue";
import { alertService, type Alert } from "@/entities/alert/api/alert.service";
import { OfflineChatService } from "@/shared/api/offline/OfflineChatService";

// Helper para mapear operaciones encoladas a IDs de acciones del catálogo
function mapOpToActionId(op: QueuedOperation): string | null {
  const url = (op.url || '').toLowerCase();
  const entity = (op.entityType || '').toLowerCase();

  if (url.includes('milk') || entity.includes('milk')) return 'milk';
  if (url.includes('control') || url.includes('corral') || entity.includes('control')) return 'weight';
  if (url.includes('disease') || entity.includes('disease')) return 'health';
  if (url.includes('transfer') || url.includes('animal-fields') || entity.includes('field')) return 'transfer';
  if (url.includes('treatment') || entity.includes('treatment')) return 'treatment';
  if (url.includes('vaccine') || entity.includes('vaccine')) return 'vaccine';
  if (url.includes('birth') || entity.includes('birth')) return 'births';
  if (url.includes('water') || entity.includes('water')) return 'water';
  if (url.includes('animal') || entity.includes('animal')) return 'new_animal';
  return null;
}

// Helper para mapear alertas del backend a IDs de acciones del catálogo por área/módulo
function mapAlertToActionId(alert: Alert): string {
  const alertType = (alert.alert_type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const message = `${alert.message || ''} ${alert.recommendation || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (alertType.includes('produccion') || alertType.includes('leche') || message.includes('leche') || message.includes('orden')) return 'milk';
  if (alertType.includes('crecimiento') || alertType.includes('peso') || message.includes('peso') || message.includes('pesaje') || message.includes('corporal')) return 'weight';
  if (alertType.includes('salud') || alertType.includes('sanidad') || message.includes('salud') || message.includes('enfermedad') || message.includes('sintoma') || message.includes('mastitis') || message.includes('fiebre')) return 'health';
  if (alertType.includes('vacuna') || message.includes('vacuna') || message.includes('inmuniz') || message.includes('aftosa') || message.includes('brucelosis')) return 'vaccine';
  if (alertType.includes('tratamiento') || message.includes('tratamiento') || message.includes('medicamento') || message.includes('dosis') || message.includes('farmaco')) return 'treatment';
  if (alertType.includes('reproduccion') || message.includes('reproduccion') || message.includes('celo') || message.includes('servicio') || message.includes('inseminac') || message.includes('prenada')) {
    return (message.includes('parto') || message.includes('nacimiento')) ? 'births' : 'reproduction';
  }
  if (alertType.includes('parto') || message.includes('parto') || message.includes('nacimiento') || message.includes('cria')) return 'births';
  if (alertType.includes('potrero') || alertType.includes('traslado') || message.includes('potrero') || message.includes('traslado') || message.includes('rotacion') || alert.field_id) return 'transfer';
  if (message.includes('agua') || message.includes('hidrat')) return 'water';
  if (message.includes('genet') || message.includes('cruce')) return 'genetics';
  if (message.includes('report') || message.includes('predic')) return 'reports';

  return 'tasks';
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  registro: '⚡ Registro Rápido',
  animal: '🐄 Ganado y Campo',
  navegacion: '🏠 Navegación',
};

export const DEFAULT_FIELD_MESSAGES = [
  {
    id: 'signal',
    icon: '📶',
    title: 'Si estás sin señal',
    text: 'Guarda el registro en el celular; se sincroniza cuando vuelva internet.',
    path: '/quick/milk',
  },
  {
    id: 'daily-record',
    icon: '📝',
    title: 'Antes de cerrar la jornada',
    text: 'Registra el ordeño y cualquier novedad de salud del ganado.',
    path: '/quick/milk',
  },
  {
    id: 'water-and-field',
    icon: '💧',
    title: 'Antes de mover el ganado',
    text: 'Confirma agua disponible y revisa el potrero de destino.',
    path: '/quick/transfer',
  },
] as const;

const formatQuickCount = (count: number): string => (count > 99 ? '99+' : String(count));

const notificationLabel = (actionId: string, count: number): string => {
  if (actionId === 'chat') return count === 1 ? 'nuevo' : 'nuevos';
  return count === 1 ? 'pendiente' : 'pendientes';
};

// ─── Componente principal ─────────────────────────────────────
export const FloatingQuickActions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sheetRef = useRef<HTMLDivElement>(null);

  const { user, role } = useAuth() as any;
  const currentRoleRaw = role ?? user?.role ?? null;
  const currentRole = currentRoleRaw ? normalizeRole(currentRoleRaw) || String(currentRoleRaw) : null;

  /**
   * El catálogo se declara con rutas `/admin/...`; aquí se traducen al prefijo
   * del rol y se descartan las acciones que su RBAC no permite.
   */
  const allowedCatalog = useMemo(
    () => CATALOG
      .map((action) => ({ ...action, path: toRolePath(currentRole, action.path) }))
      .filter((action) => canAccessRoutePath(currentRole, action.path)),
    [currentRole],
  );

  const [favIds, setFavIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_FAV;
    } catch {
      return DEFAULT_FAV;
    }
  });

  const [badgesMap, setBadgesMap] = useState<Record<string, number>>({});

  /**
   * Al desplegar el menú de acceso rápido, mostramos:
   * 1. Las acciones favoritas elegidas por el usuario.
   * 2. Cualquier otra acción permitida que TENGA notificaciones/alertas pendientes (badgesMap > 0),
   *    para asegurar que al desplegar el menú NUNCA queden notificaciones ocultas.
   */
  const visibleItems = useMemo(() => {
    const favs = allowedCatalog.filter((a) => favIds.includes(a.id));
    const extraWithBadges = allowedCatalog.filter(
      (a) => !favIds.includes(a.id) && (badgesMap[a.id] || 0) > 0
    );
    return [...favs, ...extraWithBadges];
  }, [allowedCatalog, favIds, badgesMap]);

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
        const fab = document.getElementById('fqa-fab');
        if (fab && fab.contains(e.target as Node)) return;
        close();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  const refreshBadges = useCallback(async () => {
    const nextMap: Record<string, number> = {};

    // 1. Mensajes no leídos de chat
    try {
      const userId = user?.id || user?.user_id || '';
      if (userId) {
        const chatUnread = await OfflineChatService.getUnreadCount(userId);
        if (chatUnread > 0) {
          nextMap['chat'] = chatUnread;
        }
      }
    } catch { /* noop */ }

    // 2. Operaciones offline pendientes por módulo
    try {
      const pendingOps = await offlineQueue.getPendingOperations();
      for (const op of pendingOps) {
        const actionId = mapOpToActionId(op);
        if (actionId) {
          nextMap[actionId] = (nextMap[actionId] || 0) + 1;
        }
      }
    } catch { /* noop */ }

    // 3. Alertas no leídas clasificadas correctamente por área
    try {
      const page = await alertService.getAlertsPage({ is_read: false, limit: 200 });
      for (const alert of page.items) {
        const actionId = mapAlertToActionId(alert);
        nextMap[actionId] = (nextMap[actionId] || 0) + 1;
      }
      // El área se deduce del texto de cada alerta, así que las que no caben en la
      // página no se pueden clasificar. Se agrupan en 'tasks' para que el total
      // del badge siga siendo el real y no se quede clavado en el tamaño de página.
      const unclassified = page.total - page.items.length;
      if (unclassified > 0) {
        nextMap.tasks = (nextMap.tasks || 0) + unclassified;
      }
    } catch { /* noop */ }

    setBadgesMap(nextMap);
  }, [user]);

  // Suscribirse a actualizaciones de notificaciones/chat/offlineQueue/alerts
  useEffect(() => {
    refreshBadges();

    const handleChatUnread = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.unreadCount === 'number') {
        setBadgesMap((prev) => ({
          ...prev,
          chat: detail.unreadCount,
        }));
      }
    };

    const handleOfflineSynced = () => {
      refreshBadges();
    };

    window.addEventListener('chat-unread-count-updated', handleChatUnread as EventListener);
    window.addEventListener('offline-queue-synced', handleOfflineSynced);
    window.addEventListener('alerts-updated', refreshBadges);
    window.addEventListener('alert-marked-read', refreshBadges);
    window.addEventListener('online', refreshBadges);
    window.addEventListener('offline', refreshBadges);

    const interval = setInterval(refreshBadges, 15000);

    return () => {
      window.removeEventListener('chat-unread-count-updated', handleChatUnread as EventListener);
      window.removeEventListener('offline-queue-synced', handleOfflineSynced);
      window.removeEventListener('alerts-updated', refreshBadges);
      window.removeEventListener('alert-marked-read', refreshBadges);
      window.removeEventListener('online', refreshBadges);
      window.removeEventListener('offline', refreshBadges);
      clearInterval(interval);
    };
  }, [refreshBadges]);

  const totalBadgeCount = useMemo(() => {
    return Object.values(badgesMap).reduce((acc, count) => acc + (count || 0), 0);
  }, [badgesMap]);

  const go = useCallback(
    (path: string) => {
      close();
      if (path === '/chat') {
        openFloatingChat();
      } else if (path.startsWith('/quick/')) {
        const action = path.replace('/quick/', '');
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('quick', action);
        setSearchParams(newSearchParams, { replace: true });
      } else {
        navigate(toRolePath(currentRole, path));
      }
    },
    [close, currentRole, navigate, searchParams, setSearchParams]
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
              "md:left-auto md:right-5 md:w-[420px] md:max-w-[calc(100vw-1rem)] md:rounded-lg md:bottom-[88px]",
              // Styles
              "bg-card/85 dark:bg-card/65 backdrop-blur-2xl",
              "border-t md:border border-border/20",
              "rounded-t-3xl",
              "shadow-[0_-20px_60px_rgba(0,0,0,0.25)] md:shadow-[0_20px_60px_rgba(0,0,0,0.25)]",
              "max-h-[80dvh] max-w-[100vw] overflow-hidden flex flex-col"
            )}
          >
            {/* Drag handle - Mobile only */}
            <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
              <div className="h-[4px] w-10 rounded-full bg-foreground/15" />
            </div>

            {/* Scrollable content area */}
            <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
              {editMode ? (
                <EditPanel
                  catalog={allowedCatalog}
                  favIds={favIds}
                  badgesMap={badgesMap}
                  onToggle={toggleFav}
                  onDone={() => setEditMode(false)}
                  maxFav={MAX_FAV}
                />
              ) : (
                <ActionGrid
                  items={visibleItems}
                  badgesMap={badgesMap}
                  totalBadgeCount={totalBadgeCount}
                  favIds={favIds}
                  onAction={go}
                  onEdit={() => setEditMode(true)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB principal (Bottom Right) ────────────────────────── */}
      <motion.button
        id="fqa-fab"
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.08 }}
        onClick={() => { setIsOpen((v) => !v); setEditMode(false); }}
        className={cn(
          "fixed bottom-3 right-3 sm:bottom-4 sm:right-4",
          isOpen ? "z-[9999]" : "z-40 sm:z-[9999]",
          "h-11 w-11 sm:h-12 sm:w-12 rounded-full",
          "flex items-center justify-center backdrop-blur-md",
          "transition-all duration-300 shadow-lg cursor-pointer",
          isOpen
            ? "bg-card/90 text-foreground border border-border/50 opacity-100 scale-105"
            : "bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-400/30 opacity-90 hover:opacity-100 shadow-[0_4px_15px_rgba(16,185,129,0.35)]"
        )}
        aria-label={isOpen ? "Cerrar menú rápido" : "Abrir menú rápido"}
        aria-expanded={isOpen}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="flex items-center justify-center"
        >
          {isOpen ? <IconX size="md" /> : <Zap className="h-6 w-6 fill-white" />}
        </motion.div>

        {totalBadgeCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-black h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-bounce">
            {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
          </span>
        )}
      </motion.button>
    </>
  );
};

// ─── Grid de acciones ─────────────────────────────────────────
interface ActionGridProps {
  items: QuickAction[];
  badgesMap: Record<string, number>;
  totalBadgeCount: number;
  favIds: string[];
  onAction: (path: string) => void;
  onEdit: () => void;
}

export const ActionGrid: React.FC<ActionGridProps> = ({
  items,
  badgesMap,
  totalBadgeCount,
  favIds,
  onAction,
  onEdit,
}) => {
  // Group items by category for display
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'registro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const hasMultipleCategories = Object.keys(grouped).length > 1;

  return (
    <div className="min-w-0 px-4 pt-3 pb-6 sm:pb-8">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-0.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 text-[13px] font-bold text-foreground">
              Acceso Rápido
            </p>
            {totalBadgeCount > 0 && (
              <span
                title={`${totalBadgeCount.toLocaleString('es-CO')} ${totalBadgeCount === 1 ? 'pendiente' : 'pendientes'}`}
                className="max-w-full shrink-0 whitespace-nowrap rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white shadow-sm animate-pulse"
              >
                {formatQuickCount(totalBadgeCount)} {totalBadgeCount === 1 ? 'pendiente' : 'pendientes'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Finca Digital · Campo sin señal
          </p>
        </div>
        <button
          onClick={onEdit}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5",
            "bg-muted/60 border border-border/50",
            "text-[11px] font-semibold text-muted-foreground",
            "hover:bg-muted active:scale-95 transition-all"
          )}
        >
          <Settings2 className="h-3 w-3" />
          Editar
        </button>
      </div>

      <div className="mb-4 min-w-0 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <p className="min-w-0 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-200">
            Mensajes para el campo
          </p>
        </div>
        <div className="grid min-w-0 gap-1.5">
          {DEFAULT_FIELD_MESSAGES.map((message) => (
            <button
              key={message.id}
              type="button"
              onClick={() => onAction(message.path)}
              className="group flex min-w-0 items-start gap-2 rounded-lg border border-emerald-200/60 bg-white/60 px-2.5 py-2 text-left transition-colors hover:bg-white dark:border-emerald-800/40 dark:bg-black/10 dark:hover:bg-black/20"
            >
              <span className="shrink-0 text-base leading-none" aria-hidden="true">{message.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold leading-tight text-foreground">{message.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{message.text}</span>
              </span>
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700/60 transition-transform group-hover:translate-x-0.5 dark:text-emerald-300/60" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Grid — show categories if multiple */}
      {hasMultipleCategories ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catItems]) => {
            const catBadgeTotal = catItems.reduce((acc, action) => acc + (badgesMap[action.id] || 0), 0);

            return (
              <div key={cat}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
                  <p className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {CATEGORY_LABELS[cat] || cat}
                  </p>
                  {catBadgeTotal > 0 && (
                    <span
                      title={`${catBadgeTotal.toLocaleString('es-CO')} ${catBadgeTotal === 1 ? 'notificación' : 'notificaciones'}`}
                      className="flex max-w-full shrink-0 items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[11px] font-extrabold text-rose-600 dark:text-rose-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      {formatQuickCount(catBadgeTotal)} {catBadgeTotal === 1 ? 'notificación' : 'notificaciones'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2">
                  {catItems.map((action, idx) => (
                    <Tile
                      key={action.id}
                      action={action}
                      badgeCount={badgesMap[action.id] || 0}
                      isExtraNotif={!favIds.includes(action.id)}
                      index={idx}
                      onPress={() => onAction(action.path)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
          {items.map((action, idx) => (
            <Tile
              key={action.id}
              action={action}
              badgeCount={badgesMap[action.id] || 0}
              isExtraNotif={!favIds.includes(action.id)}
              index={idx}
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
  badgeCount?: number;
  isExtraNotif?: boolean;
  onPress: () => void;
  index?: number;
}

const Tile: React.FC<TileProps> = ({ action, badgeCount = 0, isExtraNotif = false, onPress, index = 0 }) => (
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
      "relative flex min-w-0 w-full items-center gap-2.5 overflow-hidden",
      "rounded-lg px-3 py-3 text-left backdrop-blur-md",
      "min-h-[64px] shadow-sm transition-all duration-200 hover:shadow-md",
      badgeCount > 0
        ? "bg-rose-500/10 dark:bg-rose-950/30 border-2 border-rose-500/60 ring-2 ring-rose-500/20 hover:bg-rose-500/15"
        : isExtraNotif
        ? "bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/40 hover:bg-amber-500/10"
        : "bg-card/40 dark:bg-card/25 border border-border/40 hover:bg-card/60 dark:hover:bg-card/35"
    )}
    aria-label={`${action.label}${badgeCount > 0 ? ` (${badgeCount} notificaciones)` : ''}`}
  >
    {/* Badge único sobre el icono: evita competir por el ancho del texto. */}
    <div
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110",
        action.bg
      )}
    >
      {action.icon}
      {badgeCount > 0 && (
        <span
          title={`${badgeCount.toLocaleString('es-CO')} ${notificationLabel(action.id, badgeCount)}`}
          className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-card bg-rose-600 px-1 text-[11px] font-black text-white shadow-md animate-pulse"
        >
          {formatQuickCount(badgeCount)}
        </span>
      )}
    </div>

    {/* Labels */}
    <div className="min-w-0 flex-1">
      <p className="min-w-0 text-[13px] font-bold leading-tight text-foreground fit-clamp">
        {action.label}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground/70 fit-clamp">
        {action.sub}
      </p>
    </div>
  </motion.button>
);

// ─── Panel de edición de favoritos ───────────────────────────
interface EditPanelProps {
  catalog: QuickAction[];
  favIds: string[];
  badgesMap: Record<string, number>;
  onToggle: (id: string) => void;
  onDone: () => void;
  maxFav: number;
}

const EditPanel: React.FC<EditPanelProps> = ({
  catalog,
  favIds,
  badgesMap,
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
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
            "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2",
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
              {CATEGORY_LABELS[cat] || cat}
            </p>
            <div className="space-y-1.5">
              {catItems.map((action) => {
                const isFav = favIds.includes(action.id);
                const disabled = !isFav && count >= maxFav;
                const badgeCount = badgesMap[action.id] || 0;

                return (
                  <motion.button
                    key={action.id}
                    whileTap={disabled ? {} : { scale: 0.97 }}
                    onClick={() => !disabled && onToggle(action.id)}
                    disabled={disabled}
                    className={cn(
                      "relative flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
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
                      {badgeCount > 0 && (
                        <span
                          title={`${badgeCount.toLocaleString('es-CO')} ${notificationLabel(action.id, badgeCount)}`}
                          className="absolute -right-1 -top-1 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-card bg-rose-500 px-0.5 text-[11px] font-extrabold text-white shadow-sm animate-pulse"
                        >
                          {formatQuickCount(badgeCount)}
                        </span>
                      )}
                      {isFav && badgeCount === 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-card shadow-sm">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[13px] font-bold leading-tight text-foreground fit-clamp">
                          {action.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight fit-clamp">
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
