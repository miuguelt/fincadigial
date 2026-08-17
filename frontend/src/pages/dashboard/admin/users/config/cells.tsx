import { User as UserIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import type { UserRecord } from './columns';

export function PersonCell(value: unknown, item: UserRecord, avatarOverride?: string | null) {
  const name = typeof value === 'string' ? value : '';
  const avatarUrl = avatarOverride ?? (typeof item.avatar_url === 'string' ? item.avatar_url : null);
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 shadow-sm border border-primary/20">
        {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : name[0] || <UserIcon size={14} />}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-foreground fit-clamp">{name}</span>
        <span className="text-[11px] text-muted-foreground uppercase font-black tracking-widest">{String(item.role ?? '')}</span>
      </div>
    </div>
  );
}

const approvalStatus = {
  Pending: { label: 'Esperando', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  Approved: { label: 'Permitido', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  Rejected: { label: 'Negado', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  Suspended: { label: 'Suspendido', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
} as const;

export function ApprovalCell(value: unknown) {
  const status = approvalStatus[value as keyof typeof approvalStatus] ?? { label: String(value ?? ''), color: '' };
  return <Badge variant="outline" className={cn('text-[11px] font-black uppercase py-0.5', status.color)}>{status.label}</Badge>;
}

export function ActiveCell(value: unknown) {
  const isActive = Boolean(value);
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-success animate-pulse' : 'bg-muted')} />
      <span className="text-xs font-medium">{isActive ? 'Activo' : 'Inactivo'}</span>
    </div>
  );
}
