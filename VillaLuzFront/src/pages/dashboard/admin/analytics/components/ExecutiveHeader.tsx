import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

interface ExecutiveHeaderProps {
  fechaActualizacion?: Date;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({ fechaActualizacion }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          Panel Integral de Analítica
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Monitorea inventario, salud, producción y alertas en tiempo real
        </p>
      </div>
      
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {fechaActualizacion && (
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium bg-surface-secondary/50 border border-border/50 px-4 py-2 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
            </span>
            <span className="text-muted-foreground">Actualizado:</span>
            <span className="text-foreground">{format(fechaActualizacion, "d MMM, h:mm a", { locale: es })}</span>
          </div>
        )}
        
        <Link to="/admin/analytics/reports" className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-full shadow-md hover:shadow-lg hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600">
          <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
          Visión Finca 360° (Offline)
        </Link>
      </div>
    </motion.div>
  );
};
