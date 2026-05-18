import { useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/shared/hooks/use-toast';
import { 
  IconX, 
  IconCircleCheck, 
  IconAlertCircle, 
  IconInfoCircle, 
  IconAlertTriangle,
  IconBell
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';

const alertIcons = {
  default: IconBell,
  success: IconCircleCheck,
  error: IconAlertCircle,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
};

const alertColors = {
  default: 'bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white border-white/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  error: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
};

const alertGlows = {
  default: 'shadow-slate-500/5',
  success: 'shadow-emerald-500/10',
  error: 'shadow-rose-500/10',
  info: 'shadow-blue-500/10',
  warning: 'shadow-amber-500/10',
};

const ToastItem = forwardRef<HTMLDivElement, { toast: any; dismiss: (id: string) => void }>(
  ({ toast, dismiss }, ref) => {
  const toastVariant = toast.variant || 'default';
  const variant = toastVariant === 'destructive' ? 'error' : toastVariant;
  const Icon = alertIcons[variant as keyof typeof alertIcons] || alertIcons.default;
  
  // Usar la duración real del toast, o 3 segundos por defecto para ser más rápido
  const durationSecs = ((toast.duration || 3000) / 1000);

  useEffect(() => {
    if (durationSecs > 0 && durationSecs !== Infinity) {
      const timer = setTimeout(() => {
        dismiss(toast.id);
      }, durationSecs * 1000);
      return () => clearTimeout(timer);
    }
  }, [durationSecs, dismiss, toast.id]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -30, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ 
        opacity: 0, 
        scale: 0.8, 
        filter: 'blur(12px)',
        y: 20,
        transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] } 
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 350, 
        damping: 25,
        layout: { duration: 0.3 },
        filter: { type: 'tween', ease: 'easeOut', duration: 0.4 }
      }}
      className={cn(
        "pointer-events-auto relative flex items-center gap-4 w-full p-5 rounded-[2rem] border shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all group overflow-hidden",
        "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl",
        alertColors[variant as keyof typeof alertColors],
        alertGlows[variant as keyof typeof alertGlows]
      )}
    >
      {/* Reflejo Crystal y Borde Gradiente */}
      <div className="absolute inset-0 rounded-[2rem] border border-white/40 pointer-events-none z-20" />
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-20" />
      
      {/* Brillo dinámico de fondo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-30 pointer-events-none" />

      <div className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] shadow-[var(--shadow-token-md)] relative z-10 border border-white/30 transition-transform group-hover:scale-110 duration-300",
        variant === 'default' 
          ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200" 
          : "bg-white/60 text-current shadow-current/20"
      )}>
        <Icon size="lg" strokeWidth={2.5} />
      </div>

      <div className="flex-1 space-y-1 relative z-10">
        {toast.title && (
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] leading-none opacity-60 mb-1">
            {toast.title}
          </h4>
        )}
        <div className="text-[14px] font-extrabold leading-tight tracking-tight pr-4 text-slate-900 dark:text-white">
          {toast.description || toast.title}
        </div>
      </div>

      {/* Botón Cerrar Premium */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismiss(toast.id);
        }}
        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-[var(--radius-lg)] hover:bg-black/10 dark:hover:bg-white/10 bg-black/5 dark:bg-white/5 transition-all hover:rotate-90 active:scale-90 relative z-30"
        aria-label="Cerrar"
      >
        <IconX size="md" className="opacity-50 hover:opacity-100 transition-opacity" strokeWidth={3} />
      </button>

      {/* Temporizador Visual Crystal */}
      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-black/5 dark:bg-white/5 pointer-events-none">
        <motion.div 
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: durationSecs, ease: 'linear' }}
          className="h-full bg-current opacity-40 origin-left"
        />
      </div>
    </motion.div>
  );
});

export function SystemAlertsHub() {
  const { toasts, dismiss } = useToast();

  // Filtrar solo los mensajes que están abiertos y limitar a los 2 más recientes
  const activeToasts = toasts
    .filter(t => t.open !== false)
    .slice(0, 2);

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100000] flex flex-col items-center gap-4 w-full max-w-[440px] pointer-events-none px-6">
      <AnimatePresence mode="popLayout" initial={false}>
        {activeToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

