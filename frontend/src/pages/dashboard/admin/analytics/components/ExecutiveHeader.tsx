import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { FileText, BarChart3 } from 'lucide-react';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { Button } from '@/shared/ui/button';

interface ExecutiveHeaderProps {
  fechaActualizacion?: Date;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({ fechaActualizacion }) => {
  const { rolePath } = useRoleNavigation();
  return (
    <DataScreenHeader
      icon={<BarChart3 className="h-5 w-5 text-white" />}
      title="Panel Integral de Analítica"
      description="Monitoree inventario, salud, producción y alertas en tiempo real"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {fechaActualizacion && (
            <div className="flex items-center gap-2 text-xs md:text-sm font-medium bg-muted/60 border border-border/70 px-3.5 py-1.5 rounded-full shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-muted-foreground">Actualizado:</span>
              <span className="text-foreground font-semibold">
                {format(fechaActualizacion, "d MMM, h:mm a", { locale: es })}
              </span>
            </div>
          )}

          <Link to={rolePath('/admin/reports')}>
            <Button size="sm" className="gap-2 rounded-xl shadow-xs">
              <FileText className="w-4 h-4" />
              <span>Centro de Reportes</span>
            </Button>
          </Link>
        </div>
      }
    />
  );
};
