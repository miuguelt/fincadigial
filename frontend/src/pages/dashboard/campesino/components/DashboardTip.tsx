import { motion } from 'framer-motion';
import type { DashboardTip as DashboardTipData } from '../config/dashboard.config';

export function DashboardTip({ tip }: { tip: DashboardTipData | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.25 }}
      className="rounded-2xl border border-green-500/20 bg-green-50/70 p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-green-800/40 dark:bg-green-950/20 sm:p-5"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-black/20 sm:h-12 sm:w-12">
          <span className="text-2xl" aria-hidden="true">{tip?.icon || '💡'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Consejo útil
          </p>
          <p className="text-sm font-semibold leading-relaxed text-green-900 dark:text-green-100 sm:text-base">
            {tip?.text || 'Usa la app sin internet. Los datos se sincronizan cuando vuelva la señal.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
