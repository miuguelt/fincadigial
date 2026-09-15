import React from 'react';
import { Calendar, MessageCircle, Clock, AlertTriangle, Camera, Mic, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { Badge } from '@/shared/ui/badge';
import { FitText } from '@/shared/ui/FitText';
import { getCategoryConfig, STATUS_CONFIG, PRIORITY_CONFIG } from './assistance.constants';
import { timeAgo, isOverdue, formatDateLong } from './timeUtils';

interface AssistanceCardProps {
  item: TechnicalAssistanceRequest;
  onDetail: (item: TechnicalAssistanceRequest) => void;
  onCancel?: (item: TechnicalAssistanceRequest) => void;
}

const getInitials = (name?: string | null) => {
  if (!name) return 'V';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('es-CO'))
    .join('');
};

/**
 * Tarjeta de solicitud de asistencia técnica con codificación semántica de colores:
 * - Indicador lateral izquierdo por estado/urgencia.
 * - Snippet de la descripción del caso.
 * - Callout destacado cuando el veterinario ya emitió respuesta.
 * - Ficha visual del profesional asignado o aviso de espera en cola.
 * - Responsive con .fit-container y escalado fluido.
 */
export const AssistanceCard = React.memo<AssistanceCardProps>(({ item, onDetail, onCancel }) => {
  const cat = getCategoryConfig(item.category || 'otro');
  const displayStatus = item.status === 'in_progress' && !item.assigned_user_id ? 'open' : (item.status || 'open');
  const statusCfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const CatIcon = cat.icon;
  const elapsed = timeAgo(item.requested_at);
  const overdue = !item.assigned_user_id && isOverdue(item.requested_at);
  const assignee = item.assignee?.fullname;
  const hasAnswer = Boolean(item.resolution_notes && item.resolution_notes.trim().length > 0);
  const isUrgent = item.priority === 'high' || item.priority === 'critical';

  // Determinación de la franja de color lateral izquierda para escaneo visual rápido en campo
  let borderStripe = statusCfg.borderColor;
  let cardAccentBg = statusCfg.accentBg;
  if (displayStatus === 'resolved') {
    borderStripe = 'border-l-emerald-500';
    cardAccentBg = 'bg-emerald-500/[0.03]';
  } else if (hasAnswer) {
    borderStripe = 'border-l-emerald-500';
    cardAccentBg = 'bg-emerald-500/[0.04]';
  } else if (isUrgent) {
    borderStripe = 'border-l-rose-500';
    cardAccentBg = 'bg-rose-500/[0.03]';
  } else if (displayStatus === 'in_progress') {
    borderStripe = 'border-l-sky-500';
    cardAccentBg = 'bg-sky-500/[0.03]';
  } else if (displayStatus === 'closed') {
    borderStripe = 'border-l-slate-400 dark:border-l-slate-600';
    cardAccentBg = 'bg-slate-500/[0.02]';
  }

  const isAudio = item.attachment?.content_type?.startsWith('audio/');
  const isImage = item.attachment?.content_type?.startsWith('image/');

  return (
    <article className={`fit-container flex flex-col h-full min-w-0 bg-card border border-border/70 border-l-4 ${borderStripe} ${cardAccentBg} rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
      {/* Cabecera superior con Categoría, Título y Badges */}
      <div className="p-3.5 sm:p-4 pb-2.5 space-y-2.5 flex-shrink-0 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`shrink-0 w-10 h-10 rounded-xl ${cat.bg} border ${cat.border} flex items-center justify-center shadow-xs`}>
            <CatIcon className={`w-5 h-5 ${cat.color}`} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
              <span className={`text-[11px] font-black uppercase tracking-wider ${cat.color}`}>
                {cat.label}
              </span>
              {elapsed && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium ${overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  {elapsed}
                  {overdue && <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600" />}
                </span>
              )}
            </div>

            <FitText
              as="h3"
              maxLines={2}
              className="block text-sm font-bold text-foreground leading-snug"
            >
              {item.title || 'Solicitud sin título'}
            </FitText>
          </div>
        </div>

        {/* Píldoras de Estado y Urgencia */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 pt-0.5">
          {hasAnswer ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-fluid-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800/60 shadow-xs">
              <Sparkles className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ¡Respuesta lista!
            </span>
          ) : (
            <Badge variant={statusCfg.badge} size="sm" className="text-fluid-xs font-semibold max-w-full">
              {statusCfg.label}
            </Badge>
          )}

          <Badge variant={priorityCfg.badge} size="sm" className="text-fluid-xs font-semibold max-w-full">
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${priorityCfg.dotColor}`} />
            {priorityCfg.label}
          </Badge>
        </div>
      </div>

      {/* Cuerpo de la tarjeta: Extracto de descripción y metadatos */}
      <div className="px-3.5 sm:px-4 py-2 flex-1 min-w-0 space-y-2 text-fluid-xs">
        {item.description ? (
          <p className="text-muted-foreground/90 line-clamp-2 leading-relaxed text-fluid-xs">
            {item.description}
          </p>
        ) : (
          <p className="text-muted-foreground/60 italic text-fluid-xs">
            Sin descripción adicional
          </p>
        )}

        {/* Chips de archivos adjuntos (Foto / Audio) */}
        {item.attachment && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              {isAudio ? (
                <>
                  <Mic className="w-3.5 h-3.5 shrink-0" />
                  Nota de audio adjunta
                </>
              ) : isImage ? (
                <>
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  Foto adjunta
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  Evidencia adjunta
                </>
              )}
            </span>
          </div>
        )}

        {/* Bloque destacado si el veterinario ya dejó respuesta */}
        {hasAnswer ? (
          <div className="rounded-xl bg-gradient-to-r from-emerald-50/90 to-emerald-100/40 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 p-2.5 space-y-1 mt-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-900 dark:text-emerald-300">
              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Diagnóstico veterinario:</span>
            </div>
            <p className="text-emerald-950/90 dark:text-emerald-100/90 line-clamp-2 italic text-fluid-xs leading-relaxed">
              &ldquo;{item.resolution_notes}&rdquo;
            </p>
          </div>
        ) : item.assigned_user_id ? (
          /* Bloque de veterinario asignado en atención */
          <div className="flex items-center gap-2 rounded-xl bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/40 p-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-[11px] shrink-0 shadow-xs">
              {getInitials(assignee)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sky-950 dark:text-sky-200 fit-clamp">{assignee || 'Veterinario asignado'}</p>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-medium">Revisando caso en la finca</p>
            </div>
          </div>
        ) : (
          /* Bloque de espera de asignación (compacto y limpio) */
          <div className="flex items-center gap-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/40 p-2 text-amber-900 dark:text-amber-200 mt-1">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="font-medium fit-clamp">Esperando que un veterinario tome el caso</span>
          </div>
        )}

        {/* Fecha de solicitud */}
        {item.requested_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="fit-clamp">{formatDateLong(item.requested_at)}</span>
          </div>
        )}
      </div>

      {/* Footer con botones de acción interactivos */}
      <div className="px-3.5 sm:px-4 py-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 bg-muted/25 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {displayStatus === 'resolved' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Caso cerrado
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {onCancel && item.status === 'open' && (
            <button
              onClick={() => onCancel(item)}
              data-compact
              className="min-h-9 px-2.5 py-1.5 rounded-xl font-semibold text-fluid-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            onClick={() => onDetail(item)}
            data-compact
            className={`min-h-9 px-3.5 py-1.5 rounded-xl font-bold text-fluid-xs transition-all flex items-center gap-1 shadow-xs ${
              hasAnswer
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <span>{hasAnswer ? 'Ver respuesta' : 'Ver detalle'}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </article>
  );
});

AssistanceCard.displayName = 'AssistanceCard';
