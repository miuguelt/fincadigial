import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import type React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { UserResponse } from '@/shared/api/generated/swaggerTypes';

type UserMembership = {
  id?: number;
  finca_id?: number;
  finca_name?: string | null;
  finca_type?: string | null;
  name?: string | null;
  type?: string | null;
  role?: string | null;
  is_active?: boolean;
  is_primary?: boolean;
};

export type UserProfileData = UserResponse & {
  avatar_url?: string | null;
  finca_name?: string | null;
  finca_type?: string | null;
  is_system_admin?: boolean;
  fincas?: UserMembership[];
};

interface UserProfileDetailProps {
  user: UserProfileData;
  roleHint?: string;
}

const FALLBACK = 'No registrado';

const formatDate = (value?: string | null) => {
  if (!value) return FALLBACK;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatLabel = (value?: string | null) => {
  if (!value) return FALLBACK;
  return value.replaceAll('_', ' ');
};

const getInitials = (name?: string | null) => {
  const initials = String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'U';
};

const isUserActive = (user: UserProfileData) => {
  if (typeof user.status === 'boolean') return user.status;
  return String(user.status).toLowerCase() === 'active';
};

const InfoField: React.FC<{
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="min-w-0 rounded-xl border border-border/70 bg-background/70 p-3.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]">
    <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      {label}
    </dt>
    <dd className="mt-1.5 min-w-0 text-sm font-semibold leading-relaxed text-foreground">{children}</dd>
  </div>
);

const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <Card className="min-w-0 overflow-hidden border-border/70 shadow-sm">
    <CardHeader className="border-b border-border/60 bg-muted/25 px-4 py-3.5 sm:px-5">
      <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 sm:p-5">{children}</CardContent>
  </Card>
);

export const UserProfileDetail: React.FC<UserProfileDetailProps> = ({ user, roleHint }) => {
  const active = isUserActive(user);
  const role = user.role || roleHint || 'Usuario';
  const approvalStatus = user.approval_status || 'Pending';
  const approvalLabel: Record<string, string> = {
    Pending: 'Por revisar',
    Approved: 'Aprobado',
    Rejected: 'Rechazado',
    Suspended: 'Suspendido',
  };
  const memberships = Array.isArray(user.fincas) && user.fincas.length > 0
    ? user.fincas
    : user.finca_id
      ? [{
          finca_id: user.finca_id,
          finca_name: user.finca_name,
          finca_type: user.finca_type,
          role,
          is_active: active,
          is_primary: true,
        }]
      : [];

  return (
    <div className="space-y-4 py-1 sm:space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-background p-4 shadow-sm sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 text-xl font-black text-primary shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={`Foto de ${user.fullname}`} className="h-full w-full object-cover" />
              ) : (
                getInitials(user.fullname)
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">Perfil completo</Badge>
                <Badge variant="outline" className={active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300'}>
                  {active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <h2 className="break-words text-xl font-black leading-tight tracking-tight text-foreground sm:text-2xl">
                {user.fullname || FALLBACK}
              </h2>
              <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                {role}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 sm:min-w-32 sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Código interno</p>
            <p className="mt-1 text-base font-black text-foreground">#{user.id}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title="Datos personales" icon={UserRound}>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoField icon={Fingerprint} label="Identificación">{user.identification || FALLBACK}</InfoField>
            <InfoField icon={ShieldCheck} label="Rol">{role}</InfoField>
            <InfoField icon={UserRound} label="Nombre completo">{user.fullname || FALLBACK}</InfoField>
            <InfoField icon={Building2} label="Finca principal">{user.finca_name || FALLBACK}</InfoField>
          </dl>
        </Section>

        <Section title="Datos de contacto" icon={Mail}>
          <dl className="grid grid-cols-1 gap-3">
            <InfoField icon={Mail} label="Correo electrónico">
              {user.email ? <a href={`mailto:${user.email}`} className="text-primary underline-offset-4 hover:underline">{user.email}</a> : FALLBACK}
            </InfoField>
            <InfoField icon={Phone} label="Teléfono">
              {user.phone ? <a href={`tel:${user.phone}`} className="text-primary underline-offset-4 hover:underline">{user.phone}</a> : FALLBACK}
            </InfoField>
            <InfoField icon={MapPin} label="Dirección">{user.address || FALLBACK}</InfoField>
          </dl>
        </Section>

        <Section title="Estado y acceso" icon={ShieldCheck}>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoField icon={active ? CheckCircle2 : XCircle} label="Estado">
              <span className={active ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}>{active ? 'Activo' : 'Inactivo'}</span>
            </InfoField>
            <InfoField icon={ShieldCheck} label="Permiso de acceso">{approvalLabel[approvalStatus] || formatLabel(approvalStatus)}</InfoField>
            <InfoField icon={CalendarDays} label="Creado">{formatDate(user.created_at)}</InfoField>
            <InfoField icon={Clock3} label="Última actualización">{formatDate(user.updated_at)}</InfoField>
          </dl>
          {user.is_system_admin && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3.5 py-3 text-sm font-semibold text-violet-700 dark:text-violet-300">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Administrador del sistema
            </div>
          )}
        </Section>

        <Section title={`Fincas asociadas (${memberships.length})`} icon={Building2}>
          {memberships.length > 0 ? (
            <ul className="space-y-2.5" aria-label="Fincas asociadas">
              {memberships.map((membership, index) => {
                const name = membership.finca_name || membership.name || `Finca ${membership.finca_id || index + 1}`;
                const isMembershipActive = membership.is_active !== false;
                return (
                  <li key={`${membership.finca_id || membership.id || name}-${index}`} className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/70 p-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-foreground">{name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatLabel(membership.finca_type || membership.type)} · {membership.role || role}</p>
                      </div>
                    </div>
                    <span className={isMembershipActive ? 'shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300' : 'shrink-0 text-xs font-bold text-muted-foreground'}>
                      {membership.is_primary ? 'Principal' : isMembershipActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">No tiene fincas asociadas.</p>
          )}
        </Section>
      </div>
    </div>
  );
};
