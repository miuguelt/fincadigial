import React from 'react';
import { motion } from 'framer-motion';

interface ExecutiveProductionProps {
  productionStats: any;
  dashboard: any;
}

export const ExecutiveProduction: React.FC<ExecutiveProductionProps> = ({ productionStats, dashboard }) => {
  const formatNumber = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number(val).toLocaleString('es-CO');
  };

  const utilization = productionStats?.field_utilization ?? 0;
  const productivity = productionStats?.productivity_index ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg className="w-24 h-24 text-success-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 3.8l6.2 14.2H5.8L12 5.8z" />
          </svg>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 relative z-10">Uso de Potreros</h2>
        
        <div className="space-y-6 relative z-10">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Utilización de capacidad</span>
              <span className="text-sm font-black text-success-600 dark:text-success-400">{utilization}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(utilization, 100)}%` }}
                transition={{ duration: 1, delay: 1 }}
                className="h-3 rounded-full bg-success-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-surface-secondary/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Potreros Activos</p>
              <p className="text-xl font-black text-foreground">{productionStats?.total_fields ?? dashboard?.campos_registrados?.valor ?? 0}</p>
            </div>
            <div className="bg-surface-secondary/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Carga Promedio</p>
              <p className="text-xl font-black text-foreground">{productionStats?.animals_per_field ?? 0} <span className="text-xs font-semibold text-muted-foreground">ani/campo</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg className="w-24 h-24 text-info" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6 relative z-10">Eficiencia Productiva</h2>
        
        <div className="space-y-6 relative z-10">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Índice de Productividad</span>
              <span className="text-sm font-black text-info">{productivity}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(productivity, 100)}%` }}
                transition={{ duration: 1, delay: 1.1 }}
                className="h-3 rounded-full bg-info" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-surface-secondary/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Consumo Alimento</p>
              <p className="text-xl font-black text-foreground">
                {productionStats?.feed_consumption ? formatNumber(productionStats.feed_consumption) : '—'} <span className="text-xs font-semibold text-muted-foreground">kg</span>
              </p>
            </div>
            <div className="bg-surface-secondary/50 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Costos Operativos</p>
              <p className="text-xl font-black text-foreground">
                <span className="text-xs font-semibold text-muted-foreground">$</span> {formatNumber(productionStats?.monthly_costs)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
