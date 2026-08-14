import { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Clock3, Inbox, RefreshCw, ShieldCheck, Stethoscope, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/model/useAuth';
import { usePushSubscription } from '@/shared/hooks/usePushSubscription';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { VeterinarianAssistanceCard } from './VeterinarianAssistanceCard';
import { VeterinarianResponseDialog } from './VeterinarianResponseDialog';
import { useVeterinarianAssistanceInbox } from './useVeterinarianAssistanceInbox';

type InboxState = ReturnType<typeof useVeterinarianAssistanceInbox>;
type InboxFilter = 'all' | 'waiting' | 'mine';

function PanelHeader({ state }: { state: InboxState }) {
  const push = usePushSubscription();
  return (
    <div className="flex flex-col gap-4 border-b border-border/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Stethoscope className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="veterinarian-assistance-title" className="text-base font-black text-foreground sm:text-lg">Solicitudes de asistencia</h2>
            {state.inbox.counts.waiting > 0 && <Badge variant="destructive">{state.inbox.counts.waiting} sin asignar</Badge>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Toma un caso, responde desde aquí y Villa Luz avisa al solicitante automáticamente.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {push.supported && (
          <Button size="sm" variant={push.subscribed ? 'secondary' : 'primary'} loading={push.busy} onClick={push.toggle} className="rounded-xl">
            {push.subscribed ? <ShieldCheck className="mr-2 h-4 w-4" /> : <BellRing className="mr-2 h-4 w-4" />}
            {push.subscribed ? 'Avisos activos' : 'Activar avisos'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => state.load()} disabled={state.loading} className="rounded-xl">
          <RefreshCw className={`mr-2 h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} aria-hidden /> Actualizar
        </Button>
      </div>
    </div>
  );
}

function AssistanceMetric({ icon: Icon, value, label }: { icon: typeof Inbox; value: number; label: string }) {
  return (
    <div className="min-w-0 bg-card px-2 py-3 text-center sm:px-4">
      <div className="flex items-center justify-center gap-1.5 text-primary">
        <Icon className="h-4 w-4 shrink-0" aria-hidden /><span className="text-lg font-black tabular-nums">{value}</span>
      </div>
      <p className="mt-0.5 text-fluid-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function InboxFilterButton({ filter, active, count, label, onClick }: { filter: InboxFilter; active: boolean; count: number; label: string; onClick: (filter: InboxFilter) => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onClick(filter)}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
    >
      {label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-primary-foreground/20' : 'bg-background/70'}`}>{count}</span>
    </button>
  );
}

function NewRequestsNotice({ state }: { state: InboxState }) {
  if (!state.newRequestCount) return null;
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
      <span className="font-bold text-foreground">
        {state.newRequestCount === 1 ? 'Hay 1 solicitud nueva.' : `Hay ${state.newRequestCount} solicitudes nuevas.`}
        <span className="ml-1 font-normal text-muted-foreground">La bandeja se actualizó en segundo plano.</span>
      </span>
      <Button type="button" size="sm" variant="ghost" onClick={state.acknowledgeNewRequests} className="h-8 rounded-lg px-2 text-xs">
        Marcar vistas
      </Button>
    </div>
  );
}

function InboxContent({ state, veterinarianId, filter }: { state: InboxState; veterinarianId: number; filter: InboxFilter }) {
  const [visibleLimit, setVisibleLimit] = useState(8);
  useEffect(() => setVisibleLimit(8), [filter]);
  const filteredItems = useMemo(() => state.inbox.items.filter((item) => {
    if (filter === 'waiting') return !item.assigned_user_id;
    if (filter === 'mine') return item.assigned_user_id === veterinarianId;
    return true;
  }), [filter, state.inbox.items, veterinarianId]);
  const visibleItems = filteredItems.slice(0, visibleLimit);

  if (state.loading) return <div className="grid gap-3 lg:grid-cols-2">{[1, 2].map((key) => <div key={key} className="h-44 animate-pulse rounded-2xl bg-muted/50" />)}</div>;
  if (filteredItems.length === 0) return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="text-sm font-black text-foreground">{filter === 'mine' ? 'No tienes casos asignados' : filter === 'waiting' ? 'No hay casos esperando' : 'Bandeja al día'}</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Las nuevas solicitudes aparecerán aquí y se avisarán de forma agrupada.</p>
    </div>
  );
  return <>
    <div className="grid gap-3 lg:grid-cols-2">{visibleItems.map((item) => (
    <VeterinarianAssistanceCard key={item.id} item={item} veterinarianId={veterinarianId} claiming={state.claimingId === item.id} onClaim={state.claimAndRespond} onRespond={state.setSelected} />
    ))}</div>
    {visibleItems.length < filteredItems.length && (
      <div className="mt-4 flex items-center justify-center">
        <Button type="button" size="sm" variant="ghost" onClick={() => setVisibleLimit((limit) => limit + 8)} className="rounded-xl">
          Mostrar más ({filteredItems.length - visibleItems.length})
        </Button>
      </div>
    )}
  </>;
}

export function VeterinarianAssistancePanel() {
  const { user } = useAuth();
  const state = useVeterinarianAssistanceInbox();
  const [filter, setFilter] = useState<InboxFilter>('all');
  return (
    <section id="veterinarian-assistance" ref={state.sectionRef} className="fit-container scroll-mt-24 rounded-3xl border border-primary/20 bg-card shadow-sm" aria-labelledby="veterinarian-assistance-title">
      <PanelHeader state={state} />
      <div className="grid grid-cols-3 gap-px border-b border-border/30 bg-border/30">
        <AssistanceMetric icon={Inbox} value={state.inbox.counts.waiting} label="Esperando" />
        <AssistanceMetric icon={UserRoundCheck} value={state.inbox.counts.mine} label="Asignadas a ti" />
        <AssistanceMetric icon={Clock3} value={state.inbox.counts.active} label="Activas" />
      </div>
      <div className="p-3 sm:p-5">
        <NewRequestsNotice state={state} />
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtrar solicitudes">
          <InboxFilterButton filter="all" active={filter === 'all'} count={state.inbox.counts.active} label="Todas" onClick={setFilter} />
          <InboxFilterButton filter="waiting" active={filter === 'waiting'} count={state.inbox.counts.waiting} label="Sin asignar" onClick={setFilter} />
          <InboxFilterButton filter="mine" active={filter === 'mine'} count={state.inbox.counts.mine} label="Mis casos" onClick={setFilter} />
        </div>
        <InboxContent state={state} veterinarianId={Number(user?.id || 0)} filter={filter} />
      </div>
      <VeterinarianResponseDialog item={state.selected} open={Boolean(state.selected)} onOpenChange={(open) => { if (!open) state.setSelected(null); }} onSubmit={state.submitResponse} />
    </section>
  );
}

export default VeterinarianAssistancePanel;
