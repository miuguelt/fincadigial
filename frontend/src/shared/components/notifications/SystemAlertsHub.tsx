import { useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/shared/hooks/use-toast';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ToastItemData {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: string | null;
  duration?: number;
  open?: boolean;
}

const alertIcons: Record<string, React.ElementType> = {
  default: Bell,
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const alertColors: Record<string, string> = {
  default: 'bg-card/80 dark:bg-foreground/80 text-foreground dark:text-white border-white/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  error: 'bg-destructive/10 text-destructive border-destructive/20 dark:text-destructive/80',
  info: 'bg-info/10 text-info border-info/20 dark:text-info/80',
  warning: 'bg-warning/10 text-warning border-warning/20 dark:text-warning/80',
};

const ToastItem = forwardRef<HTMLDivElement, { toast: ToastItemData; dismiss: (id: string) => void }>(
  ({ toast, dismiss }, ref) => {
  const toastVariant = toast.variant || 'default';
  const variant = toastVariant === 'destructive' ? 'error' : toastVariant;
  const Icon = alertIcons[variant as keyof typeof alertIcons] || alertIcons.default;
  const durationSecs = ((toast.duration || 3000) / 1000);

  useEffect(() => {
    if (durationSecs > 0 && durationSecs !== Infinity) {
      const timer = setTimeout(() => dismiss(toast.id), durationSecs * 1000);
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
        transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] },
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        layout: { duration: 0.3 },
        filter: { type: 'tween', ease: 'easeOut', duration: 0.4 },
      }}
      className={cn(
        'pointer-events-auto relative flex items-center gap-4 w-full p-5 rounded-xl border shadow-md transition-all group overflow-hidden',
        'bg-card/70 dark:bg-foreground/70 backdrop-blur-2xl',
        alertColors[variant as keyof typeof alertColors],
      )}
    >
      <div className="absolute inset-0 rounded-xl border border-white/40 pointer-events-none z-20" />
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-30 pointer-events-none" />

      <div className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md relative z-10 border border-white/30 transition-transform group-hover:scale-110 duration-300',
        variant === 'default'
          ? 'bg-secondary/60 dark:bg-card/60 text-foreground/80 dark:text-foreground/80'
          : 'bg-card/60 text-current shadow-current/20',
      )}>
        <Icon className="h-6 w-6" strokeWidth={2.5} />
      </div>

      <div className="flex-1 space-y-1 relative z-10">
        {toast.title && (
          <h4 className="text-[11px] font-black uppercase tracking-[0.25em] leading-none opacity-60 mb-1">
            {toast.title}
          </h4>
        )}
        <div className="text-[14px] font-extrabold leading-tight tracking-tight pr-4 text-foreground dark:text-white">
          {toast.description || toast.title}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          dismiss(toast.id);
        }}
        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-black/10 dark:hover:bg-card/10 bg-black/5 dark:bg-card/5 transition-all hover:rotate-90 active:scale-90 relative z-30"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5 opacity-50 hover:opacity-100 transition-opacity" strokeWidth={3} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-black/5 dark:bg-card/5 pointer-events-none">
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
  const activeToasts = toasts.filter(t => t.open !== false).slice(0, 2);

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
