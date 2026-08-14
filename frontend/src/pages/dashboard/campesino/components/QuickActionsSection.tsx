import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';
import { QUICK_ACTIONS } from '../config/dashboard.config';

interface QuickActionsSectionProps {
  onNavigate: (path: string) => void;
}

export function QuickActionsSection({ onNavigate }: QuickActionsSectionProps) {
  return (
    <section className="pt-2">
      <h2 className="mb-5 flex items-center gap-3 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
        <span className="rounded-lg bg-muted-foreground/10 p-1.5"><Plus className="h-4 w-4" /></span>
        Acciones Rápidas Diarias
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4, type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(action.path)}
              className={`group relative flex min-h-[132px] cursor-pointer items-center gap-5 overflow-hidden rounded-3xl border-0 bg-gradient-to-br ${action.color} p-5 text-left text-white shadow-xl transition-all md:p-6 ${action.glow}`}
            >
              <div className="shrink-0 rounded-2xl bg-white/20 p-3.5 shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                <Icon className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <FitText as="h3" className="text-xl md:text-2xl font-bold leading-tight mb-1">
                  {action.label}
                </FitText>
                <FitText as="p" className="text-sm md:text-base text-white/80 font-medium">
                  {action.sublabel}
                </FitText>
              </div>
              <div className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300">
                <ChevronRight className="w-6 h-6 text-white/50" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
