import React from 'react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { getCategoryConfig, STATUS_CONFIG, PRIORITY_CONFIG } from './assistance.constants';
import { formatDateLong } from './timeUtils';
import { User, Calendar, MessageCircle, CheckCircle2, Clock } from 'lucide-react';

interface AssistanceDetailDialogProps {
  item: TechnicalAssistanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve?: (item: TechnicalAssistanceRequest) => void;
}

const STATUS_STEPS = [
  { key: 'open', label: 'Solicitud creada', icon: Clock },
  { key: 'in_progress', label: 'Técnico asignado', icon: User },
  { key: 'resolved', label: 'Problema resuelto', icon: CheckCircle2 },
  { key: 'closed', label: 'Cancelada', icon: Clock },
];

const STATUS_ORDER: Record<string, number> = { open: 0, in_progress: 1, resolved: 2 };

function isStepActive(idx: number, status: string): boolean {
  if (status === 'closed') return idx === 0;
  const maxIdx = STATUS_ORDER[status] ?? 0;
  return idx <= maxIdx;
}

function isLineActive(idx: number, status: string): boolean {
  if (status === 'closed') return idx <= 1;
  const maxIdx = STATUS_ORDER[status] ?? 0;
  return idx < maxIdx;
}

export const AssistanceDetailDialog = React.memo<AssistanceDetailDialogProps>(({ item, open, onOpenChange, onResolve }) => {
  if (!item) return null;

  const cat = getCategoryConfig(item.category || 'otro');
  const statusCfg = STATUS_CONFIG[item.status || 'open'] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const CatIcon = cat.icon;
  const currentStatus = item.status || 'open';
  const currentStatusIdx = STATUS_ORDER[currentStatus] ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center`}>
              <CatIcon className={`w-5 h-5 ${cat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusCfg.badge} size="sm">{statusCfg.label}</Badge>
                <Badge variant={priorityCfg.badge} size="sm">{priorityCfg.label}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Descripción del problema</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description || 'Sin descripción'}</p>
          </div>

          <div className="border-t border-border/30 pt-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Información</h3>
            <div className="space-y-2 text-sm">
              {item.requested_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Solicitado: {formatDateLong(item.requested_at)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span>Técnico: {(item as any).assignee?.name || (item as any).assignee?.username || 'Sin asignar'}</span>
              </div>
              {item.resolved_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Resuelto: {formatDateLong(item.resolved_at)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/30 pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Estado de la solicitud</h3>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const active = isStepActive(idx, currentStatus);
                const current = idx === currentStatusIdx && currentStatus !== 'closed';
                const cancelled = currentStatus === 'closed' && idx === 3;
                return (
                  <div key={step.key} className={`flex items-start gap-3 pb-3 last:pb-0 ${cancelled ? 'opacity-100' : ''}`}>
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        cancelled ? 'bg-gray-100 dark:bg-gray-800 text-muted-foreground' :
                        active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      } ${current ? 'ring-2 ring-primary/30' : ''} ${cancelled ? 'ring-2 ring-gray-300 dark:ring-gray-600' : ''}`}>
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={[
                          "w-0.5 h-full mt-1",
                          isLineActive(idx, currentStatus) ? 'bg-primary/20' : cancelled ? 'bg-gray-200 dark:bg-gray-700' : 'bg-border'
                        ].filter(Boolean).join(' ')} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-medium ${
                        cancelled ? 'text-muted-foreground' :
                        current ? 'text-primary' : active ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {item.resolution_notes && (
            <div className="border-t border-border/30 pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Notas del técnico
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{item.resolution_notes}</p>
            </div>
          )}

          {item.status === 'open' && onResolve && (
            <div className="border-t border-border/30 pt-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => onResolve(item)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como resuelta
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

AssistanceDetailDialog.displayName = 'AssistanceDetailDialog';
