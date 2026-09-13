import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { QUICK_ACTIONS } from '../config/dashboard.config';

interface QuickActionsSectionProps {
  onNavigate: (path: string) => void;
}

export function QuickActionsSection({ onNavigate }: QuickActionsSectionProps) {
  return (
    <section aria-labelledby="quick-actions-title" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="quick-actions-title" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary"><Plus className="h-4 w-4" /></span>
            Registrar ahora
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Acciones frecuentes, disponibles también sin señal.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.25 }}
              whileHover={{ translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(action.path)}
              className={`group relative flex min-h-[116px] cursor-pointer flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border-0 bg-gradient-to-br ${action.color} p-4 text-left text-white shadow-lg transition-all sm:min-h-[124px] sm:p-5 ${action.glow}`}
              aria-label={`${action.label}. ${action.sublabel}`}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="shrink-0 rounded-xl bg-white/20 p-2.5 shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/70" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight sm:text-base">
                  {action.label}
                </h3>
                <p className="mt-1 text-xs font-medium leading-tight text-white/80 sm:text-sm">
                  {action.sublabel}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
