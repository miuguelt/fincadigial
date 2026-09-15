import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { getCategoryConfig, STATUS_CONFIG, PRIORITY_CONFIG } from './assistance.constants';
import { formatDateLong } from './timeUtils';
import { AssistanceAttachmentPreview } from './AssistanceAttachmentPreview';
import { openFloatingChat } from '@/features/chat/model/floatingChat';
import { User, Calendar, MessageCircle, CheckCircle2, Clock, BadgeCheck, ShieldCheck, Sparkles } from 'lucide-react';

interface AssistanceDetailDialogProps {
  item: TechnicalAssistanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve?: (item: TechnicalAssistanceRequest) => void;
}

const STATUS_STEPS = [
  { key: 'open', label: 'Solicitud creada en la finca', icon: Clock },
  { key: 'in_progress', label: 'Veterinario asignado al caso', icon: User },
  { key: 'resolved', label: 'Caso resuelto satisfactoriamente', icon: CheckCircle2 },
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
  const priorityCfg = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const CatIcon = cat.icon;
  const currentStatus = item.status === 'in_progress' && !item.assigned_user_id ? 'open' : (item.status || 'open');
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.open;
  const currentStatusIdx = STATUS_ORDER[currentStatus] ?? 0;
  const canChat = Boolean(item.assignee?.id && currentStatus !== 'closed');
  const hasAnswer = Boolean(item.resolution_notes && item.resolution_notes.trim().length > 0);

  const handleOpenChat = () => {
    if (!item.assignee?.id) return;
    openFloatingChat({
      id: item.assignee.id,
      fullname: item.assignee.fullname,
      role: 'Veterinario',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto p-6 rounded-2xl gap-4">
        {/* Encabezado con zona de resguardo para el botón flotante de cierre */}
        <DialogHeader className="pr-10 text-left space-y-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`shrink-0 w-11 h-11 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center shadow-xs`}>
              <CatIcon className={`w-5 h-5 ${cat.color}`} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className={`text-[11px] font-black uppercase tracking-wider ${cat.color}`}>
                  {cat.label}
                </span>
                <Badge variant={statusCfg.badge} size="sm" className="text-fluid-xs font-semibold">
                  {statusCfg.label}
                </Badge>
                <Badge variant={priorityCfg.badge} size="sm" className="text-fluid-xs font-semibold">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityCfg.dotColor}`} />
                  {priorityCfg.label}
                </Badge>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                {item.title || 'Solicitud sin título'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detalle y seguimiento de la solicitud de asistencia técnica.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Respuesta destacada del profesional si ya fue emitida */}
        {hasAnswer && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-300 dark:border-emerald-800 p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Respuesta e Indicaciones del Veterinario:</span>
            </div>
            <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-100 whitespace-pre-line bg-background/80 dark:bg-background/40 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40">
              {item.resolution_notes}
            </p>
          </div>
        )}

        {/* Descripción del caso reportado */}
        <div className="space-y-1.5 rounded-xl bg-muted/30 p-3.5 border border-border/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Descripción del problema reportado
          </h3>
          <p className="text-sm text-foreground leading-relaxed">
            {item.description || 'Sin descripción detallada.'}
          </p>
        </div>

        {/* Archivos adjuntos (Fotos / Audios) */}
        <AssistanceAttachmentPreview attachment={item.attachment} />

        {/* Metadatos y Asignación */}
        <div className="rounded-xl border border-border/40 p-3.5 space-y-2.5 bg-card text-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Información del caso
          </h3>
          <div className="grid gap-2 text-xs sm:text-sm">
            {item.requested_at && (
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Calendar className="w-4 h-4 shrink-0 text-primary" />
                <span>Fecha de reporte: <strong className="text-foreground">{formatDateLong(item.requested_at)}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <User className="w-4 h-4 shrink-0 text-primary" />
              <span>
                Profesional a cargo:{' '}
                <strong className={item.assignee?.fullname ? 'text-foreground' : 'text-amber-700 dark:text-amber-400'}>
                  {item.assignee?.fullname || 'Esperando asignación'}
                </strong>
              </span>
            </div>
            {item.assignee_credential?.status === 'Verificado' && (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 min-w-0">
                <BadgeCheck className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">
                  Matrícula profesional verificada
                  {item.assignee_credential.specialization ? ` · ${item.assignee_credential.specialization}` : ''}
                </span>
              </div>
            )}
            {item.resolved_at && (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">Resuelto: {formatDateLong(item.resolved_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Canal directo de chat seguro */}
        {canChat && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">Chat directo de seguimiento</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Comunícate con {item.assignee?.fullname} para coordinar visitas o aclarar dudas del tratamiento.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleOpenChat}
                  className="mt-3 min-h-11 w-full sm:w-auto font-bold rounded-xl shadow-xs"
                >
                  <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
                  Abrir conversación segura
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Línea de tiempo del estado */}
        <div className="rounded-xl border border-border/40 p-3.5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Línea de tiempo de atención
          </h3>
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
                      cancelled
                        ? 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                        : active
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-muted text-muted-foreground'
                    } ${current ? 'ring-2 ring-primary/40' : ''}`}>
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={[
                        'w-0.5 h-6 mt-1',
                        isLineActive(idx, currentStatus) ? 'bg-primary' : cancelled ? 'bg-slate-300 dark:bg-slate-700' : 'bg-border/60'
                      ].filter(Boolean).join(' ')} />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-xs font-bold ${
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

        {/* Acción de resolver (si aplica) */}
        {item.status === 'open' && onResolve && (
          <div className="pt-2">
            <Button
              variant="secondary"
              className="w-full min-h-11 rounded-xl font-bold"
              onClick={() => onResolve(item)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
              Marcar como resuelta
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

AssistanceDetailDialog.displayName = 'AssistanceDetailDialog';
