import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Leaf, Sun, WifiOff } from 'lucide-react';
import { FincaHeroBanner } from '@/widgets/finca/hero';
import { getGreeting, getTodayStr } from '../utils/dashboard.utils';

interface DashboardHeroProps {
  fincaName: string;
  isOnline: boolean;
  pendingCount: number;
}

function GreetingContent({ fincaName }: { fincaName: string }) {
  return (
    <div className="relative z-10 max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-md shadow-inner">
          <Sun className="w-4 h-4 text-lime-100" />
        </span>
        <p className="text-emerald-50 text-sm font-bold uppercase tracking-widest">{getTodayStr()}</p>
      </div>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-md">{getGreeting()} 👋</h1>
      <p className="max-w-xl text-base font-medium leading-relaxed text-emerald-50 opacity-95 md:text-lg lg:text-xl">
        Bienvenido a tu Módulo Campesino en{' '}
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-extrabold text-white ring-1 ring-inset ring-white/10">
          {fincaName}
        </span>
        . El panel central diseñado para que lleves el control de forma sencilla y rápida.
      </p>
    </div>
  );
}

function ConnectionStatus({ isOnline, pendingCount }: Pick<DashboardHeroProps, 'isOnline' | 'pendingCount'>) {
  return (
    <div className="relative z-10 flex w-full shrink-0 flex-row items-center justify-between gap-5 rounded-2xl border border-white/10 bg-black/10 p-5 shadow-inner backdrop-blur-xl md:w-auto md:flex-col md:items-end md:justify-center md:p-6">
      <div className="flex flex-col gap-1.5 items-start md:items-end w-full">
        <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1 hidden md:block">Estado de Conexión</p>
        {isOnline ? <OnlineBadge /> : <OfflineBadge />}
      </div>
      <SyncStatus isOnline={isOnline} pendingCount={pendingCount} />
    </div>
  );
}

function OnlineBadge() {
  return (
    <span className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-bold shadow-sm backdrop-blur-md md:w-auto md:justify-start">
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400" />
      </span>
      Sistema en línea
    </span>
  );
}

function OfflineBadge() {
  return (
    <span className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/40 px-5 py-2.5 text-sm font-bold text-red-50 shadow-sm backdrop-blur-md md:w-auto md:justify-start">
      <WifiOff className="w-4 h-4" /> Sin señal
    </span>
  );
}

function SyncStatus({ isOnline, pendingCount }: Pick<DashboardHeroProps, 'isOnline' | 'pendingCount'>) {
  if (!isOnline) return null;
  return (
    <div className="flex flex-col gap-2 items-end w-full">
      {pendingCount > 0 ? (
        <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/30 px-4 py-2 text-xs font-semibold text-amber-50 shadow-sm md:w-auto md:justify-start">
          <Clock className="w-4 h-4" /> {pendingCount} registros por sincronizar
        </span>
      ) : (
        <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/10 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-sm md:w-auto md:justify-start">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Datos al día
        </span>
      )}
    </div>
  );
}

function HeroCard({ fincaName, isOnline, pendingCount }: DashboardHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-emerald-600 via-green-600 to-lime-500 p-6 text-white shadow-xl shadow-green-200/40 md:flex-row md:items-center md:gap-8 md:p-10 dark:shadow-green-950/50"
    >
      <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-32 pointer-events-none" />
      <div className="absolute right-32 bottom-0 w-64 h-64 bg-lime-400/20 rounded-full blur-3xl translate-y-20 pointer-events-none" />
      <Leaf className="absolute right-12 bottom-8 w-48 h-48 text-white/10 rotate-12 pointer-events-none mix-blend-overlay" />
      <GreetingContent fincaName={fincaName} />
      <ConnectionStatus isOnline={isOnline} pendingCount={pendingCount} />
    </motion.div>
  );
}

function OfflineNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      className="flex flex-col items-center gap-4 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-800/60 dark:from-amber-950/40 dark:to-orange-950/40 sm:flex-row sm:items-start sm:p-6"
    >
      <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full shrink-0"><AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
      <div className="text-center sm:text-left">
        <p className="font-bold text-amber-900 dark:text-amber-300 text-base mb-1">Trabajando sin conexión a internet</p>
        <p className="text-amber-800/80 dark:text-amber-400/80 text-sm md:text-base">No te preocupes. Puedes seguir registrando todas tus labores con tranquilidad. Todo se guarda automáticamente en tu dispositivo y se enviará al servidor en cuanto recuperes la señal. 📶</p>
      </div>
    </motion.div>
  );
}

export function DashboardHero({ fincaName, isOnline, pendingCount }: DashboardHeroProps) {
  return (
    <>
      <FincaHeroBanner />
      <HeroCard fincaName={fincaName} isOnline={isOnline} pendingCount={pendingCount} />
      <AnimatePresence>{!isOnline && <OfflineNotice />}</AnimatePresence>
    </>
  );
}
