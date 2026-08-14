import { MessageSquareText, UserRoundCheck } from 'lucide-react';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { getCategoryConfig, PRIORITY_CONFIG } from './assistance.constants';
import { timeAgo } from './timeUtils';

interface Props {
  item: TechnicalAssistanceRequest;
  veterinarianId: number;
  claiming: boolean;
  onClaim: (item: TechnicalAssistanceRequest) => void;
  onRespond: (item: TechnicalAssistanceRequest) => void;
}

function CardHeader({ item }: { item: TechnicalAssistanceRequest }) {
  const category = getCategoryConfig(item.category || 'otro');
  const priority = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const CategoryIcon = category.icon;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.bg}`}>
        <CategoryIcon className={`h-5 w-5 ${category.color}`} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={priority.badge} size="sm">{priority.label}</Badge>
          <span className="text-fluid-xs font-bold text-muted-foreground">{category.label}</span>
          {item.requested_at && <span className="text-fluid-xs text-muted-foreground">{timeAgo(item.requested_at)}</span>}
        </div>
        <h3 className="mt-2 text-sm font-black leading-snug text-foreground sm:text-base">{item.title}</h3>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          Solicitó {item.requester?.fullname || 'un miembro de la finca'}
        </p>
      </div>
    </div>
  );
}

function AssignmentButton({ item, veterinarianId, claiming, onClaim, onRespond }: Props) {
  const assignedToMe = item.assigned_user_id === veterinarianId;
  if (assignedToMe) return (
    <Button size="sm" onClick={() => onRespond(item)} className="rounded-xl">
      <MessageSquareText className="mr-2 h-4 w-4" aria-hidden /> Responder
    </Button>
  );
  if (item.assigned_user_id) return null;
  return (
    <Button size="sm" variant="secondary" loading={claiming} onClick={() => onClaim(item)} className="rounded-xl">
      <UserRoundCheck className="mr-2 h-4 w-4" aria-hidden /> Tomar y responder
    </Button>
  );
}

function CardAction(props: Props) {
  const { item, veterinarianId } = props;
  const assignedToMe = item.assigned_user_id === veterinarianId;
  const assignedToOther = Boolean(item.assigned_user_id) && !assignedToMe;
  let state = 'Disponible para tomar';
  let stateClass = 'text-amber-700 dark:text-amber-300';
  if (assignedToMe) { state = 'Asignada a ti'; stateClass = 'text-primary'; }
  if (assignedToOther) { state = `Atiende ${item.assignee?.fullname || 'otro veterinario'}`; stateClass = 'text-muted-foreground'; }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-3">
      <span className={`text-xs font-bold ${stateClass}`}>{state}</span>
      <AssignmentButton {...props} />
    </div>
  );
}

export function VeterinarianAssistanceCard(props: Props) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-border/50 bg-background p-4 shadow-sm">
      <CardHeader item={props.item} />
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {props.item.description || 'La solicitud no incluye una descripción.'}
      </p>
      <CardAction {...props} />
    </article>
  );
}
