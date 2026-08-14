import React from 'react';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { FitText } from '@/shared/ui/FitText';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { getCategoryConfig, STATUS_CONFIG, PRIORITY_CONFIG } from './assistance.constants';
import { formatDateLong } from './timeUtils';
import { User, Calendar, MessageCircle, CheckCircle2, Clock, BadgeCheck } from 'lucide-react';

interface AssistanceDetailDialogProps {
  item: TechnicalAssistanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve?: (item: TechnicalAssistanceRequest) => void;
}

const STATUS_STEPS = [
  { key: 'open', label: 'Solicitud creada', icon: Clock },
  { key: 'in_progress', label: 'Veterinario asignado', icon: User },
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
        <div className="fit-container p-4 sm:p-6 space-y-5 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`shrink-0 w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center`}>
              <CatIcon className={`w-5 h-5 ${cat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <FitText as="h2" maxLines={2} className="block text-lg font-semibold text-foreground leading-snug">
                {item.title || 'Solicitud sin título'}
              </FitText>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 min-w-0">
                <Badge variant={statusCfg.badge} size="sm" className="text-fluid-xs max-w-full">{statusCfg.label}</Badge>
                <Badge variant={priorityCfg.badge} size="sm" className="text-fluid-xs max-w-full">{priorityCfg.label}</Badge>
                <span className="text-fluid-xs text-muted-foreground">{cat.label}</span>
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
                <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                  <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">Solicitado: {formatDateLong(item.requested_at)}</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                <User className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 flex-1">
                  Veterinario: {item.assignee?.fullname || 'Pendiente de asignación'}
                </span>
              </div>
              {item.assignee_credential?.status === 'Verificado' && (
                <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300 min-w-0">
                  <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1 text-xs">
                    Acreditación profesional cotejada
                    {item.assignee_credential.specialization
                      ? ` · ${item.assignee_credential.specialization}`
                      : ''}
                  </span>
                </div>
              )}
              {item.resolved_at && (
                <div className="flex items-start gap-2 text-muted-foreground min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">Resuelto: {formatDateLong(item.resolved_at)}</span>
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
                Respuesta del veterinario
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
