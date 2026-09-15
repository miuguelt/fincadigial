import { motion } from 'framer-motion';
import { ChevronRight, Zap } from 'lucide-react';
import { QUICK_ACTIONS } from '../config/dashboard.config';
import { ModuleHeading } from '@/widgets/layout/ModuleHeading';

interface QuickActionsSectionProps {
  onNavigate: (path: string) => void;
}

export function QuickActionsSection({ onNavigate }: QuickActionsSectionProps) {
  return (
    <section aria-labelledby="quick-actions-title" className="space-y-3">
      <ModuleHeading
        title={<span id="quick-actions-title">Registrar Novedad</span>}
        description="Acciones operativas frecuentes en campo, disponibles también sin señal"
        icon={<Zap className="h-5 w-5 text-white" />}
        headingLevel="h2"
        titleClassName="text-base sm:text-lg"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              whileHover={{ translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(action.path)}
              className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-left shadow-2xs transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[120px]"
              aria-label={`${action.label}. ${action.sublabel}`}
            >
              <div className="flex w-full items-start justify-between gap-3 mb-3">
                <div className={`rounded-xl p-2.5 ${action.color} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
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
