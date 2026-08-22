import { motion } from 'framer-motion';
import { DollarSign, Scale, Zap, LogOut, Baby, Milk, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  IconMilk,
  IconRoute as IconRouteCattle,
  IconHealthAlert,
  IconHealthCheck,
} from '@/shared/icons/cattle';
import { RECORD_KINDS, NEUTRAL_CHIP, RECORD_TILE_CLASS, RECORD_CHIP_CLASS } from '../record-kinds';

interface LivestockTabProps {
  onOpenModal: (type: string) => void;
}

interface LivestockAction {
  type: string;
  label: string;
  sub: string;
  icon: LucideIcon | typeof IconMilk;
  chip: string;
}

/**
 * Las once acciones se agrupan por cuándo se usan, no por módulo del sistema.
 * Un campesino entra a anotar el ordeño de esta mañana; que la Guía ICA y la
 * liquidación de leche compitieran con el mismo peso visual en una cuadrícula
 * plana obligaba a leerlas todas cada vez.
 */
const GROUPS: { id: string; title: string; hint: string; actions: LivestockAction[] }[] = [
  {
    id: 'rutina',
    title: 'Todos los días',
    hint: 'Lo que se anota en la jornada normal.',
    actions: [
      { type: 'milk', label: 'Registrar ordeño', sub: 'Litros de la mañana o la tarde', icon: IconMilk, chip: RECORD_KINDS.milking.chip },
      { type: 'control', label: 'Control y pesaje', sub: 'Peso, alzada y estado', icon: Scale, chip: RECORD_KINDS.control.chip },
      { type: 'transfer', label: 'Trasladar ganado', sub: 'Cambio de potrero', icon: IconRouteCattle, chip: RECORD_KINDS.transfer.chip },
    ],
  },
  {
    id: 'novedades',
    title: 'Cuando pasa algo',
    hint: 'Novedades de salud y movimientos del hato.',
    actions: [
      { type: 'disease', label: 'Reportar enfermedad', sub: 'Síntomas y diagnóstico', icon: IconHealthAlert, chip: RECORD_KINDS.disease.chip },
      { type: 'treatment', label: 'Aplicar tratamiento', sub: 'Vacunas y medicinas', icon: IconHealthCheck, chip: RECORD_KINDS.treatment.chip },
      { type: 'weaning', label: 'Destetar ternero', sub: 'Paso a levante y peso a 205 días', icon: Baby, chip: RECORD_KINDS.control.chip },
      { type: 'exit', label: 'Salida, venta o muerte', sub: 'Dar de baja del hato', icon: LogOut, chip: RECORD_KINDS.disease.chip },
    ],
  },
  {
    id: 'cuentas',
    title: 'Cuentas y papeles',
    hint: 'Plata de la finca y trámites con el comprador o el ICA.',
    actions: [
      { type: 'finance', label: 'Ingreso o gasto', sub: 'Ventas, insumos, jornales', icon: DollarSign, chip: RECORD_KINDS.finance.chip },
      { type: 'milk-settlement', label: 'Liquidar leche', sub: 'Calidad, sólidos y pago neto', icon: Milk, chip: RECORD_KINDS.milking.chip },
      { type: 'gsmi', label: 'Guía ICA (GSMI)', sub: 'Borrador oficial y chapetas', icon: FileText, chip: NEUTRAL_CHIP },
    ],
  },
];

export function LivestockTab({ onOpenModal }: LivestockTabProps) {
  const renderAction = (action: LivestockAction) => {
    const Icon = action.icon;
    return (
      <motion.button
        key={action.type}
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => onOpenModal(action.type)}
        className={`${RECORD_TILE_CLASS} min-h-[4.5rem] hover:shadow-md`}
      >
        <span className={`${RECORD_CHIP_CLASS} ${action.chip}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground" style={{ overflowWrap: 'break-word' }}>
            {action.label}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground" style={{ overflowWrap: 'break-word' }}>
            {action.sub}
          </span>
        </span>
      </motion.button>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Toque una opción. La fecha de hoy ya viene lista.</p>

      {/* Única acción destacada: es un modo de trabajo en la manga, no un registro suelto. */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => onOpenModal('corral-rapido')}
        className="w-full flex items-center gap-3 rounded-lg border border-primary bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {/* Verde oscuro, no `bg-primary`: el par primary/primary-foreground queda en 2,8:1 y el icono se pierde. */}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white dark:bg-emerald-600 dark:text-emerald-50" aria-hidden="true">
          <Zap className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Modo manga rápida</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Pese un lote entero seguido, sin salir de la pantalla.
          </span>
        </span>
      </motion.button>

      {GROUPS.map(group => (
        <section key={group.id} className="space-y-2" aria-labelledby={`grupo-${group.id}`}>
          <div>
            <h3 id={`grupo-${group.id}`} className="vl-section-title">{group.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.hint}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.actions.map(renderAction)}
          </div>
        </section>
      ))}
    </div>
  );
}
