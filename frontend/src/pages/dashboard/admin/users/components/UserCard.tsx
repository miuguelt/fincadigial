import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { IdCard, Mail, MessagesSquare, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { UserAvatarUpload } from '@/widgets/dashboard/users/UserAvatarUpload';
import { cn } from '@/shared/ui/cn';
import { getChatAvailability } from '../utils/user.utils';
import type { UserWithProfile } from '../types';
import type { User } from '@/entities/user/model/types';

interface UserCardProps {
  user: UserWithProfile;
  currentUser: User | null;
  chatContactIds: Set<number> | null;
  resolveAvatar: (user: UserWithProfile) => string | null | undefined;
  onAvatarUpdated: (userId: number, avatarUrl: string | null) => void;
  onOpenChat: (user: UserWithProfile) => void;
  onOpenDetail?: (user: UserWithProfile) => void;
}

interface UserCardHeaderProps {
  user: UserWithProfile;
  avatarUrl: string | null | undefined;
  onAvatarUpdated: (userId: number, avatarUrl: string | null) => void;
}

function UserCardHeader({ user, avatarUrl, onAvatarUpdated }: UserCardHeaderProps) {
  const nameParts = user.fullname?.split(' ') ?? [];
  const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1';
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="shrink-0">
        <UserAvatarUpload userId={user.id!} currentAvatarUrl={avatarUrl} firstName={nameParts[0]} lastName={nameParts[1]} size="md" onUpdate={(url) => onAvatarUpdated(Number(user.id), url)} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-black text-base leading-snug tracking-tight text-foreground break-words group-hover:text-primary transition-colors">{user.fullname}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 px-2 py-0 text-[11px] font-black uppercase text-primary">{user.role}</Badge>
          <div className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase', isActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-border bg-muted text-muted-foreground')}>
            <div className={cn('h-1 w-1 rounded-full', isActive ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground')} />
            {isActive ? 'En Finca' : 'Fuera'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactInfo({ user }: { user: UserWithProfile }) {
  return (
    <div className="grid min-w-0 flex-grow grid-cols-1 gap-2">
      <ContactItem icon={<IdCard className="h-4 w-4 shrink-0 text-primary opacity-70" />} label="Cédula / Código" value={user.identification} />
      <ContactItem icon={<Mail className="h-4 w-4 shrink-0 text-primary opacity-70" />} label="Correo Electrónico" value={user.email} />
      <ContactItem icon={<Phone className="h-4 w-4 shrink-0 text-primary opacity-70" />} label="Teléfono" value={user.phone || '-'} />
    </div>
  );
}

function ContactItem({ icon, label, value }: { icon: ReactNode; label: string; value: unknown }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-transparent bg-muted/20 p-2 transition-colors group-hover:border-border/40">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[11px] font-black uppercase leading-none tracking-widest text-muted-foreground">{label}</p>
        <p className="break-words text-xs font-semibold text-foreground [overflow-wrap:anywhere]">{String(value ?? '')}</p>
      </div>
    </div>
  );
}

function ContactActions({ user, chat, hasWhatsApp, onOpenChat }: { user: UserWithProfile; chat: ReturnType<typeof getChatAvailability>; hasWhatsApp: boolean; onOpenChat: (user: UserWithProfile) => void }) {
  const phoneDigits = String(user.phone ?? '').replace(/\D/g, '');
  const whatsappNumber = phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits;
  return (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="outline" size="icon" disabled={!chat.enabled} onClick={() => chat.enabled && onOpenChat(user)} title={chat.reason} aria-label={chat.reason} className="h-8 w-8 shrink-0 rounded-lg border-sky-500/30 bg-sky-500/10 p-0 text-sky-600 shadow-sm transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-35 dark:text-sky-400"><MessagesSquare className="h-4 w-4" /></Button>
      {hasWhatsApp && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${user.fullname?.split(' ')[0] || ''}, te escribo desde la finca Villaluz.`)}`} target="_blank" rel="noopener noreferrer" title={`Enviar WhatsApp a ${user.fullname}`} aria-label={`Enviar WhatsApp a ${user.fullname}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#25D366]/35 bg-[#25D366]/10 p-0 text-[#128C7E] shadow-sm transition-all duration-200 hover:scale-105 hover:bg-[#25D366]/20 active:scale-95 dark:text-[#25D366]"><FaWhatsapp className="h-4 w-4" /></a>}
    </div>
  );
}

function UserCardFooter({ user }: { user: UserWithProfile }) {
  const fincas = user.fincas ?? [];
  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 pt-2 text-[11px] font-black uppercase tracking-tighter text-muted-foreground">
      <div className="flex flex-col"><span className="opacity-50">Vinculado desde</span><span className="text-foreground/60">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO') : '-'}</span></div>
      {fincas.length > 0 && <div className="flex -space-x-2 overflow-hidden py-1" title={`${fincas.length} fincas asociadas`}>
        {fincas.slice(0, 3).map((finca) => <div key={finca.id} className="inline-block h-6 w-6 rounded-lg ring-2 ring-card bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-[11px]">{finca.name?.[0] || finca.finca_name?.[0]}</div>)}
        {fincas.length > 3 && <div className="inline-block h-6 w-6 rounded-lg ring-2 ring-card bg-muted border border-border flex items-center justify-center text-muted-foreground font-black text-[11px]">+{fincas.length - 3}</div>}
      </div>}
    </div>
  );
}

export function UserCard({ user, currentUser, chatContactIds, resolveAvatar, onAvatarUpdated, onOpenChat, onOpenDetail }: UserCardProps) {
  const chat = getChatAvailability(user, currentUser, chatContactIds);
  const phoneDigits = String(user.phone ?? '').replace(/\D/g, '');
  const hasWhatsApp = Boolean(phoneDigits);
  return (
    <article
      role="group"
      tabIndex={0}
      aria-label={`Ver perfil de ${user.fullname}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a, input, textarea')) return;
        onOpenDetail?.(user);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetail?.(user);
        }
      }}
      className="relative group flex h-full min-w-0 flex-col p-3 sm:p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3">
        <UserCardHeader user={user} avatarUrl={resolveAvatar(user)} onAvatarUpdated={onAvatarUpdated} />
        <ContactInfo user={user} />
        <ContactActions user={user} chat={chat} hasWhatsApp={hasWhatsApp} onOpenChat={onOpenChat} />
        <UserCardFooter user={user} />
      </div>
    </article>
  );
}
