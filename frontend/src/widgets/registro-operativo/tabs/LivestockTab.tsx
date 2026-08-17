import { motion } from 'framer-motion';
import { DollarSign, Scale, Zap, LogOut, Baby, Milk, FileText } from 'lucide-react';
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
  const actions = [
    { type: 'corral-rapido', label: '⚡ Modo Manga Rápida', sub: 'Pesaje continuo en lote', icon: Zap, tone: 'bg-emerald-700 text-white border-emerald-700 col-span-2 shadow-emerald-700/20' },
    { type: 'milk', label: 'Registrar Ordeño', sub: 'Producción diaria', icon: IconMilk, tone: 'bg-warning text-warning-foreground border-warning' },
    { type: 'milk-settlement', label: 'Liquidar Leche', sub: 'Calidad, sólidos y pago neto', icon: Milk, tone: 'bg-cyan-700 text-white border-cyan-700' },
    { type: 'gsmi', label: 'Guía ICA (GSMI)', sub: 'Borrador oficial y chapetas', icon: FileText, tone: 'bg-emerald-800 text-white border-emerald-800' },
    { type: 'transfer', label: 'Trasladar Ganado', sub: 'Rotación de potreros', icon: IconRouteCattle, tone: 'bg-primary text-primary-foreground border-primary' },
    { type: 'disease', label: 'Reportar Enfermedad', sub: 'Diagnosticar síntomas', icon: IconHealthAlert, tone: 'bg-danger text-danger-foreground border-danger' },
    { type: 'treatment', label: 'Aplicar Tratamiento', sub: 'Vacunas y medicinas', icon: IconHealthCheck, tone: 'bg-info text-info-foreground border-info' },
    { type: 'control', label: 'Control y Pesaje', sub: 'Peso, alzada y estado', icon: Scale, tone: 'bg-teal-600 text-white border-teal-600' },
    { type: 'weaning', label: 'Destetar Ternero', sub: 'Paso a levante y peso 205d', icon: Baby, tone: 'bg-indigo-600 text-white border-indigo-600' },
    { type: 'exit', label: 'Salida / Venta / Muerte', sub: 'Dar de baja del hato', icon: LogOut, tone: 'bg-rose-700 text-white border-rose-700' },
    { type: 'finance', label: 'Ingreso o Gasto', sub: 'Ventas, insumos, compras', icon: DollarSign, tone: 'bg-sky-600 text-white border-sky-600' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Toque una opción. La fecha de hoy ya viene lista.</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <motion.button key={action.type} whileTap={{ scale: 0.96 }} type="button" onClick={() => onOpenModal(action.type)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenModal(action.type);
                }
              }}
              className={`p-4 min-h-28 rounded-lg ${action.tone} shadow-sm text-left flex flex-col gap-2 border cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary`}>
              <div className="bg-black/15 p-2 rounded-lg w-fit"><Icon className="w-5 h-5" aria-hidden="true" /></div>
              <span className="font-bold text-sm" style={{ overflowWrap: 'break-word' }}>{action.label}</span>
              <span className="text-[11px] opacity-90" style={{ overflowWrap: 'break-word' }}>{action.sub}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
