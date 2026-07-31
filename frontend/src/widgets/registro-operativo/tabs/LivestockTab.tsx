import { motion } from 'framer-motion';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import {
  IconMilk,
  IconRoute as IconRouteCattle,
  IconHealthAlert,
  IconHealthCheck,
} from '@/shared/icons/cattle';

interface LivestockTabProps {
  onOpenModal: (type: string) => void;
}

export function LivestockTab({ onOpenModal }: LivestockTabProps) {
  const { isOnline } = useOnlineStatus();

  const actions = [
    { type: 'milk', label: 'Registrar Ordeño', sub: 'Producción diaria', icon: IconMilk, tone: 'bg-warning text-warning-foreground border-warning' },
    { type: 'transfer', label: 'Trasladar Ganado', sub: 'Rotación de potreros', icon: IconRouteCattle, tone: 'bg-primary text-primary-foreground border-primary' },
    { type: 'disease', label: 'Reportar Enfermedad', sub: 'Diagnosticar síntomas', icon: IconHealthAlert, tone: 'bg-danger text-danger-foreground border-danger' },
    { type: 'treatment', label: 'Aplicar Tratamiento', sub: 'Vacunas y medicinas', icon: IconHealthCheck, tone: 'bg-info text-info-foreground border-info' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <motion.button key={action.type} whileTap={{ scale: 0.96 }} onClick={() => onOpenModal(action.type)}
              className={`p-4 rounded-lg ${action.tone} shadow-sm text-left flex flex-col gap-2 border cursor-pointer hover:shadow-md`}>
              <div className="bg-black/10 p-2 rounded-lg w-fit"><Icon className="w-5 h-5" /></div>
              <span className="font-bold text-sm">{action.label}</span>
              <span className="text-[11px] text-current/80">{action.sub}</span>
            </motion.button>
          );
        })}
      </div>

      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/40 rounded-lg p-4 flex items-start gap-3">
          <span className="text-lg">📶</span>
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Sin conexión a internet</p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">Los datos se guardan localmente y se sincronizan al recuperar señal.</p>
          </div>
        </div>
      )}
    </div>
  );
}
