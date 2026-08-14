import { motion } from 'framer-motion';
import type { DashboardTip as DashboardTipData } from '../config/dashboard.config';

export function DashboardTip({ tip }: { tip: DashboardTipData | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mt-6 rounded-3xl border border-green-500/20 bg-gradient-to-r from-lime-500/10 via-green-500/10 to-emerald-500/10 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl dark:border-green-800/40 dark:from-lime-500/20 dark:via-green-500/20 dark:to-emerald-500/20 md:p-6"
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/50 shadow-sm dark:bg-black/20 md:h-20 md:w-20">
          <span className="text-4xl animate-bounce" style={{ animationDuration: '3s' }}>{tip?.icon || '💡'}</span>
        </div>
        <div className="text-center md:text-left flex-1">
          <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Consejo Útil del Día
          </p>
          <p className="text-base md:text-lg text-green-900 dark:text-green-100 leading-relaxed font-semibold max-w-4xl">
            {tip?.text || 'Usa la app sin internet. Los datos se sincronizan cuando vuelva la señal.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
