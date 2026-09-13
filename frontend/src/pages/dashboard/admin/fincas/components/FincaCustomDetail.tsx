import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Compass,
  Eye,
  Globe,
  Lock,
  MapPin,
  Users,
} from 'lucide-react';
import { FincaImageCarousel } from '@/entities/finca/ui/FincaImageCarousel';
import type { FarmAdminRecord } from '../types';
import { cn } from '@/shared/ui/cn';
import FincaPerformancePanel from './FincaPerformancePanel';

interface FincaCustomDetailProps {
  finca: FarmAdminRecord;
  onManageImages: (finca: FarmAdminRecord) => void;
  onInviteUsers: (fincaId: number) => void;
  metricsLoading?: boolean;
  metricsError?: boolean;
  metricsUpdatedAt?: number;
}

const visibilityCopy = {
  full: {
    label: 'Pública',
    description: 'Esta finca comparte inventario, censo y resumen sanitario en el catálogo público.',
    icon: Globe,
    tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  standard: {
    label: 'Estándar',
    description: 'Comparte ubicación institucional y datos generales, manteniendo protegidas las cifras pecuarias.',
    icon: Eye,
    tone: 'border-sky-200 bg-sky-50/70 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
  },
  minimal: {
    label: 'Mínima',
    description: 'Protege el inventario pecuario y solo expone los datos básicos necesarios para la administración.',
    icon: Lock,
    tone: 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  },
} as const;

const InfoRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="min-w-0 rounded-xl border border-border/60 bg-background/60 p-3.5 shadow-sm">
    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-1.5 min-w-0 text-sm font-bold leading-snug text-foreground">{value}</div>
  </div>
);

const formatDate = (value?: string) => {
  if (!value) return 'No registrada';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'No registrada'
    : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

export const FincaCustomDetail: React.FC<FincaCustomDetailProps> = ({
  finca,
  onManageImages,
  onInviteUsers,
  metricsLoading,
  metricsError,
  metricsUpdatedAt,
}) => {
  const images = finca.images || [];
  const visibility = visibilityCopy[finca.public_visibility || 'minimal'];
  const VisibilityIcon = visibility.icon;
  const hasCoordinates = typeof finca.latitude === 'number' && typeof finca.longitude === 'number';
  const location = [finca.municipality, finca.department].filter(Boolean).join(', ') || 'Ubicación no registrada';

  return (
    <div className="space-y-5 pb-1">
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_18px_38px_-26px_rgba(15,23,42,0.7)]">
        <FincaImageCarousel
          images={images}
          fincaName={finca.name}
          useThumbnail={false}
          className="h-56 rounded-none sm:h-72"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3 sm:inset-x-5 sm:bottom-5">
          <div className="min-w-0 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-200">Ficha administrativa</p>
            <h3 className="mt-1 text-xl font-black leading-tight sm:text-2xl">{finca.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-white/80">
              <MapPin className="h-3.5 w-3.5 text-emerald-300" />
              {location}
            </p>
          </div>
          <Badge className={cn('rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] shadow-lg backdrop-blur-md', finca.is_active ? 'border-emerald-300/40 bg-emerald-500/85 text-white' : 'border-rose-300/40 bg-rose-500/85 text-white')}>
            <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', finca.is_active ? 'bg-emerald-100' : 'bg-rose-100')} />
            {finca.is_active ? 'Finca operativa' : 'Finca inactiva'}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onManageImages(finca)}
          className="absolute right-4 top-4 min-h-[42px] rounded-xl border border-white/25 bg-slate-950/60 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:bg-slate-950/85"
        >
          <Camera className="h-4 w-4" />
          Fotos ({images.length})
        </Button>
      </section>

      <FincaPerformancePanel
        kpis={finca.kpis}
        loading={metricsLoading}
        error={metricsError}
        lastUpdated={metricsUpdatedAt}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary">Identidad</p>
              <h4 className="text-base font-black text-foreground">Información general</h4>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow label="Modalidad" value={<Badge variant="secondary" className="rounded-full font-bold">{finca.type}</Badge>} />
            <InfoRow label="Estado operativo" value={<span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{finca.is_active ? 'Activa' : 'Inactiva'}</span>} />
            <InfoRow label="NIT / identificación" value={<span className="font-mono">{finca.nit || 'No registrado'}</span>} />
            <InfoRow label="Fecha de registro" value={formatDate(finca.created_at)} icon={<Calendar className="h-3.5 w-3.5" />} />
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">Territorio</p>
              <h4 className="text-base font-black text-foreground">Ubicación y georreferenciación</h4>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InfoRow label="Departamento" value={finca.department || 'No registrado'} />
            <InfoRow label="Municipio" value={finca.municipality || 'No registrado'} />
            <InfoRow label="Dirección / vereda" value={finca.address || 'No registrada'} />
            <InfoRow label="Coordenadas GPS" value={hasCoordinates ? `${finca.latitude?.toFixed(4)}, ${finca.longitude?.toFixed(4)}` : 'Sin geolocalizar'} icon={<Compass className="h-3.5 w-3.5" />} />
          </div>
        </section>
      </div>

      <section className={cn('rounded-2xl border p-4 shadow-sm sm:p-5', visibility.tone)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-white/70 shadow-sm dark:bg-black/15">
              <VisibilityIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-75">Protección de datos</p>
              <h4 className="text-base font-black">Política de privacidad y visibilidad pública</h4>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full border-current/30 bg-white/60 font-black uppercase dark:bg-black/15">{visibility.label}</Badge>
        </div>
        <p className="mt-4 text-xs leading-relaxed opacity-80">{visibility.description}</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4 text-emerald-600" />
          <span>Administra el equipo y las operaciones de esta finca desde sus accesos directos.</span>
        </div>
        <Button type="button" variant="outline" onClick={() => onInviteUsers(finca.id)} className="min-h-[42px] rounded-xl px-4 font-bold hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-700 dark:hover:text-emerald-300">
          <Users className="h-4 w-4 text-emerald-600" />
          Invitar usuarios
        </Button>
      </div>
    </div>
  );
};
