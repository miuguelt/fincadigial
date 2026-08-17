import { BadgeCheck, BellRing, ShieldAlert, Users } from 'lucide-react';
import type { AssistanceNetwork, AssistanceVeterinarian } from '@/entities/campesino';

interface Props {
  network: AssistanceNetwork | null;
  loading?: boolean;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]?.toLocaleUpperCase('es-CO')).join('');

function VeterinarianPill({ veterinarian }: { veterinarian: AssistanceVeterinarian }) {
  const verified = veterinarian.credential?.status === 'Verificado';
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/50 bg-background/90 py-1.5 pl-1.5 pr-3 shadow-sm" title={veterinarian.credential?.specialization || undefined}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary">
        {initials(veterinarian.fullname)}
      </span>
      <span className="min-w-0 text-fluid-xs font-bold text-foreground">{veterinarian.fullname}</span>
      {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Acreditación verificada" />}
    </div>
  );
}

function NetworkMembers({ network }: { network: AssistanceNetwork }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-[45%] sm:justify-end">
      {network.veterinarians.slice(0, 3).map((veterinarian) => (
        <VeterinarianPill key={veterinarian.id} veterinarian={veterinarian} />
      ))}
      {network.total > 3 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-fluid-xs font-bold text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden /> +{network.total - 3}
        </span>
      )}
    </div>
  );
}

function EmptyNetwork() {
  return (
    <section className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-100">
      <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-black">Aún no hay veterinarios activos en esta finca</h2>
          <p className="mt-1 text-xs leading-relaxed opacity-85">Tu solicitud quedará registrada en la bandeja. Pide al administrador vincular un veterinario para recibir la respuesta en la plataforma.</p>
        </div>
      </div>
    </section>
  );
}

export function VeterinarianNetworkBanner({ network, loading = false }: Props) {
  if (loading) return <div className="h-28 animate-pulse rounded-2xl border border-border/40 bg-muted/40" />;
  if (!network?.total) return <EmptyNetwork />;
  return (
    <section className="fit-container rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-background p-4 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><BellRing className="h-5 w-5" aria-hidden /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Red veterinaria de tu finca</p>
            <h2 className="mt-1 text-sm font-black text-foreground sm:text-base">{network.total} veterinario{network.total === 1 ? '' : 's'} recibirán tu solicitud</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Se envía un aviso dentro de Villa Luz y, si lo activaron, una notificación al dispositivo. El primero que tome el caso queda asignado.</p>
          </div>
        </div>
        <NetworkMembers network={network} />
      </div>
    </section>
  );
}

export default VeterinarianNetworkBanner;
