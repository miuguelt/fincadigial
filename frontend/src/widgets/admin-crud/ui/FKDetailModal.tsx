import React, { useState, useEffect } from 'react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { BaseService } from '@/shared/api/base-service';
import { Skeleton } from '@/shared/ui/skeleton';
import { Badge } from '@/shared/ui/badge';
import {
  User,
  Calendar,
  Tag,
  Info,
  Database,
  Clock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

interface FKDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entity: string;
  id: number;
  title?: string;
}

export const FKDetailModal: React.FC<FKDetailModalProps> = ({
  isOpen,
  onOpenChange,
  entity,
  id,
  title
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { rolePath, canAccess } = useRoleNavigation();

  // La ficha completa vive bajo el prefijo del rol; si no puede abrirla, no se ofrece.
  const fullRecordPath = rolePath(`/admin/${entity}?edit=${id}`);
  const canOpenFullRecord = canAccess(`/admin/${entity}`);

  useEffect(() => {
    if (!isOpen || !entity || !id) return;

    setLoading(true);
    setError(null);

    // El nombre de la entidad suele coincidir con el endpoint
    const endpoint = entity.startsWith('/') ? entity : `/${entity}`;
    const service = new BaseService(endpoint);

    service.getById(id)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        console.error(`Error fetching detail for ${entity}#${id}:`, err);
        setError('No se pudo cargar el detalle del registro.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, entity, id]);

  const renderValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? <Badge variant="default">Sí</Badge> : <Badge variant="outline">No</Badge>;
    if (key.includes('date') || key.includes('fecha')) return formatDateColombia(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('name') || k.includes('nombre') || k.includes('user')) return <User className="h-4 w-4 text-primary" />;
    if (k.includes('date') || k.includes('fecha')) return <Calendar className="h-4 w-4 text-primary" />;
    if (k.includes('id') || k.includes('code') || k.includes('ref')) return <Database className="h-4 w-4 text-primary" />;
    if (k.includes('status') || k.includes('estado')) return <Info className="h-4 w-4 text-primary" />;
    if (k.includes('created') || k.includes('updated')) return <Clock className="h-4 w-4 text-primary" />;
    return <Tag className="h-4 w-4 text-primary" />;
  };

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title || `Detalle: ${entity.charAt(0).toUpperCase() + entity.slice(1)} #${id}`}
      size="lg"
    >
      <div className="p-1">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Info className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-muted-foreground font-medium">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">
                  {data.record || data.registro || data.name || data.nombre || `${entity} #${id}`}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="uppercase tracking-wider font-bold text-primary/70">{entity}</span>
                  <ChevronRight className="h-3 w-3" />
                  ID Sistema: {id}
                </p>
              </div>
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                Activo
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {Object.entries(data)
                .filter(([key, value]) =>
                  !key.startsWith('_') &&
                  typeof value !== 'object' &&
                  key !== 'id' &&
                  key !== 'finca_id'
                )
                .map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all duration-200 group">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      {getIcon(key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-0.5">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-medium text-foreground fit-clamp">
                        {renderValue(key, value)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border/50 flex justify-end">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cerrar
              </button>
              {canOpenFullRecord && (
                <a
                  href={fullRecordPath}
                  className="ml-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md shadow-primary/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ir al Registro Completo
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center py-10 text-muted-foreground">No se encontró información.</p>
        )}
      </div>
    </GenericModal>
  );
};
