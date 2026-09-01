import React, { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  IdCard,
  Layers,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { isDialogClosingRecently } from '@/shared/utils/modalGuard';
import type { UserWithProfile } from '../types';
import { formatDate } from '../utils/user.utils';

interface GlobalUserCardProps {
  user: UserWithProfile;
  onOpenDetail: (user: UserWithProfile) => void;
}

export function GlobalUserCard({ user, onOpenDetail }: GlobalUserCardProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isActive = typeof user.status === 'boolean' ? user.status : user.status === '1' || user.status === 1;
  const fincas = Array.isArray(user.fincas) ? user.fincas : [];
  const isMultiFinca = fincas.length > 1;

  const phoneDigits = String(user.phone ?? '').replace(/\D/g, '');
  const hasWhatsApp = Boolean(phoneDigits);
  const whatsappNumber = phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.email) return;
    navigator.clipboard.writeText(user.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const getRoleBadgeVariant = (roleName?: string) => {
    switch (roleName) {
      case 'Administrador':
        return 'border-primary/30 bg-primary/10 text-primary';
      case 'Propietario':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300';
      case 'Veterinario':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'Instructor':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
      case 'Aprendiz':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'Capataz':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'Operario':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300';
      default:
        return 'border-border bg-muted/60 text-foreground/80';
    }
  };

  const roleText = typeof user.role === 'string' ? user.role : (user.role as any)?.value || 'Usuario';

  return (
    <article
      role="group"
      tabIndex={0}
      aria-label={`Ver perfil de ${user.fullname || 'Usuario'}`}
      onClick={(e) => {
        if (isDialogClosingRecently()) return;
        if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
        onOpenDetail(user);
      }}
      onKeyDown={(e) => {
        if (isDialogClosingRecently()) return;
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(user);
        }
      }}
      className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer min-h-[300px]"
    >
      {/* Decorative gradient blur on hover */}
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header: Avatar, Name, Global Role, Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-black text-lg shadow-sm">
                {user.fullname ? user.fullname.charAt(0).toUpperCase() : <UserIcon className="h-6 w-6" />}
              </div>
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card',
                  isActive ? 'bg-emerald-500' : 'bg-muted-foreground'
                )}
                title={isActive ? 'Usuario Activo' : 'Usuario Inactivo'}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-black text-[clamp(0.8125rem,1.6vw,1rem)] leading-snug tracking-tight text-foreground [overflow-wrap:normal] hyphens-none group-hover:text-primary transition-colors"
                title={user.fullname || 'Sin Nombre'}
              >
                {user.fullname || 'Sin Nombre'}
              </h3>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase shrink-0',
              isActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted/60 text-muted-foreground'
            )}
          >
            <div className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground')} />
            {isActive ? 'Activo' : 'Inactivo'}
          </div>
        </div>

        {/* Role badges: fila propia a ancho completo para que la palabra nunca desborde */}
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'w-fit max-w-full whitespace-normal [overflow-wrap:normal] hyphens-none text-left text-[11px] font-black uppercase leading-tight px-2 py-0.5 rounded-md border',
              getRoleBadgeVariant(roleText)
            )}
          >
            <ShieldCheck className="h-3 w-3 mr-1 shrink-0 opacity-70" />
            {roleText}
          </Badge>
          {isMultiFinca && (
            <Badge
              variant="outline"
              className="w-fit max-w-full whitespace-normal [overflow-wrap:normal] hyphens-none text-left leading-tight border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold px-1.5 py-0.5 rounded-md"
            >
              <Layers className="h-2.5 w-2.5 mr-0.5 shrink-0" />
              Multi-Finca ({fincas.length})
            </Badge>
          )}
        </div>

        {/* Contact info cards */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 border border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              <IdCard className="h-3.5 w-3.5 text-primary shrink-0 opacity-80" />
              <span className="text-muted-foreground font-semibold text-[11px]">Cédula:</span>
              <span className="font-bold text-foreground font-mono fit-clamp">{user.identification ?? '-'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 border border-border/40">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0 opacity-80" />
              <span className="font-semibold text-foreground fit-clamp text-[11px]" title={user.email || ''}>
                {user.email || 'Sin correo'}
              </span>
            </div>
            {user.email && (
              <button
                type="button"
                onClick={handleCopyEmail}
                className="p-1 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-muted"
                title="Copiar correo"
                aria-label="Copiar correo"
              >
                {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 border border-border/40">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Phone className="h-3.5 w-3.5 text-primary shrink-0 opacity-80" />
              <span className="font-semibold text-foreground text-[11px]">
                {user.phone || 'No registrado'}
              </span>
            </div>
            {hasWhatsApp && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${user.fullname?.split(' ')[0] || ''}, te escribo desde la administración del sistema.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Enviar WhatsApp a ${user.fullname}`}
                aria-label={`Enviar WhatsApp a ${user.fullname}`}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#25D366]/35 bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] transition-transform hover:scale-110 hover:bg-[#25D366]/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Associated Farms List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" /> Fincas Asociadas
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              {fincas.length} {fincas.length === 1 ? 'predio' : 'predios'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {fincas.length > 0 ? (
              fincas.map((finca: any, idx: number) => (
                <div
                  key={finca.id || finca.finca_id || idx}
                  className="group/finca flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] shadow-sm hover:border-primary/40 hover:bg-muted/70 transition-all"
                  title={`${finca.name || finca.finca_name || 'Finca'} (${finca.type || finca.finca_type || 'Finca'}) - Rol: ${finca.role || 'Miembro'}`}
                >
                  <Building2 className="h-3 w-3 text-primary shrink-0 opacity-70" />
                  <span className="min-w-0 max-w-[120px] fit-clamp font-bold text-foreground/90">
                    {finca.name || finca.finca_name || 'Finca'}
                  </span>
                  <span className="min-w-0 fit-clamp whitespace-nowrap text-[11px] uppercase font-semibold text-muted-foreground">
                    • {typeof finca.role === 'string' ? finca.role : 'Miembro'}
                  </span>
                  {finca.is_primary && (
                    <span title="Finca Principal" className="inline-flex">
                      <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />
                    </span>
                  )}
                  {finca.is_active && (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Membresía activa" />
                  )}
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/80 italic py-1">Sin fincas asignadas</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Vinculado date & CTA button */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
        <div className="flex flex-col text-[11px] text-muted-foreground font-semibold">
          <span className="opacity-60 uppercase tracking-tighter">Registrado</span>
          <span className="text-foreground/80 font-medium">
            {formatDate(user.created_at)}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => onOpenDetail(user)}
          aria-label={`Ver detalles de ${user.fullname}`}
          className="h-8 rounded-xl font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white shadow-none transition-all duration-200 text-xs px-3"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Ver Perfil Completo
        </Button>
      </div>
    </article>
  );
}
