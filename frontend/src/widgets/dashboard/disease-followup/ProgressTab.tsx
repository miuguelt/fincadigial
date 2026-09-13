import { AlertTriangle, Pencil, Plus, Scale, Stethoscope, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { FollowupChart } from './FollowupChart';
import { ProgressForm } from './ProgressForm';
import type { ProgressPayload } from './useDiseaseFollowup';
import type { DiseaseFollowupData, FollowupProgressEntry } from './types';
import { EmptyList, SectionCard, inputClass, statusBadge } from './DiseaseFollowupUi';

interface ProgressTabProps {
  followup: DiseaseFollowupData | null;
  episode: DiseaseFollowupData['episode'];
  isClosed: boolean;
  saving: boolean;
  showForm: boolean;
  editing: FollowupProgressEntry | null;
  deletingId: number | string | null;
  closeStatus: string;
  onShowForm: () => void;
  onCancelForm: () => void;
  onCancelEdit: () => void;
  onEditToggle: (entry: FollowupProgressEntry) => void;
  onSubmit: (p: ProgressPayload) => void;
  onUpdate: (p: ProgressPayload) => void;
  onDelete: (id: number | string) => void;
  onCloseStatusChange: (s: string) => void;
  onClose: () => void;
}

export function ProgressTab({
  followup,
  episode,
  isClosed,
  saving,
  showForm,
  editing,
  deletingId,
  closeStatus,
  onShowForm,
  onCancelForm,
  onCancelEdit,
  onEditToggle,
  onSubmit,
  onUpdate,
  onDelete,
  onCloseStatusChange,
  onClose,
}: ProgressTabProps) {
  return (
    <SectionCard
      title={<>Evolución clínica</>}
      actions={
        !showForm && (
          <Button
            size="sm"
            type="button"
            onClick={onShowForm}
            className="h-8 px-3 rounded-lg text-xs font-bold gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Registrar avance</span>
            <span className="sm:hidden">Avance</span>
          </Button>
        )
      }
    >
      <FollowupChart series={followup?.chart?.series || []} />

      {showForm && (
        <ProgressForm
          defaultStatus={episode.status || 'Activo'}
          onCancel={onCancelForm}
          onSubmit={onSubmit}
          saving={saving}
        />
      )}

      {editing && (
        <ProgressForm
          title="Editar avance clínico"
          initial={editing}
          defaultStatus={editing.status || episode.status || 'Activo'}
          onCancel={onCancelEdit}
          onSubmit={onUpdate}
          saving={saving}
        />
      )}

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {(!followup?.progress || followup.progress.length === 0) && (
          <EmptyList message="Todavía no hay avances registrados de esta enfermedad." />
        )}
        {(followup?.progress || []).map((p) => (
          <div
            key={p.id}
            className="p-2.5 rounded-lg bg-background/70 dark:bg-card/50 border border-border/50 flex items-start gap-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold">{p.progress_date}</span>
                {statusBadge(p.status || undefined)}
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                {p.weight != null && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Scale className="h-3 w-3" /> {p.weight} kg
                  </span>
                )}
                {p.temperature != null && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Stethoscope className="h-3 w-3" /> {p.temperature} °C
                  </span>
                )}
              </div>
              {p.observation && (
                <p className="text-[11px] italic text-muted-foreground mt-1 fit-clamp">
                  «{p.observation}»
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditToggle(p)}
                className="h-6.5 w-6.5 p-0 rounded-md text-blue-600 hover:text-blue-700"
                title={editing?.id === p.id ? 'Cancelar edición' : 'Editar avance'}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(p.id)}
                disabled={saving}
                className={cn(
                  'h-6.5 w-6.5 p-0 rounded-md text-rose-600 hover:text-rose-700',
                  deletingId === p.id && 'bg-destructive text-destructive-foreground animate-pulse'
                )}
                title={deletingId === p.id ? 'Confirmar eliminación' : 'Eliminar avance'}
              >
                {deletingId === p.id ? '✓' : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!isClosed && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">
              Cerrar caso:
            </span>
            <select
              value={closeStatus}
              onChange={(e) => onCloseStatusChange(e.target.value)}
              className={cn(inputClass, 'w-36')}
            >
              {(followup?.status_options?.resolved || ['Recuperado', 'Tratado']).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-8 rounded-lg text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Marcar como {closeStatus} (hoy)
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
