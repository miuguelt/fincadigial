import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Building2,
  Camera,
  Eye,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  Users,
} from 'lucide-react';
import { FincaImageCarousel } from '@/entities/finca/ui/FincaImageCarousel';
import type { FarmAdminRecord } from '../types';
import { cn } from '@/shared/ui/cn';
import FincaPerformancePanel from './FincaPerformancePanel';

interface AdminFincaCardProps {
  finca: FarmAdminRecord;
  onOpenDetail?: (finca: FarmAdminRecord) => void;
  onManageImages: (finca: FarmAdminRecord) => void;
  onInviteUsers: (fincaId: number) => void;
  metricsLoading?: boolean;
  metricsError?: boolean;
  metricsUpdatedAt?: number;
}

const getVisibilityBadge = (visibility?: string) => {
  switch (visibility) {
    case 'full':
      return {
        label: 'Privacidad pública',
        description: 'Estadísticas e inventario de ganado visibles públicamente',
        variant: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        icon: <Globe className="h-3 w-3" />,
      };
    case 'standard':
      return {
        label: 'Privacidad estándar',
        description: 'Ubicación y datos generales visibles',
        variant: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
        icon: <Eye className="h-3 w-3" />,
      };
    case 'minimal':
    default:
      return {
        label: 'Privacidad mínima',
        description: 'Datos pecuarios y ganado protegidos',
        variant: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        icon: <Lock className="h-3 w-3" />,
      };
  }
};

export const AdminFincaCard: React.FC<AdminFincaCardProps> = ({
  finca,
  onOpenDetail,
  onManageImages,
  onInviteUsers,
  metricsLoading,
  metricsError,
  metricsUpdatedAt,
}) => {
  const images = finca.images || [];
  const visibilityInfo = getVisibilityBadge(finca.public_visibility);
  const location = [finca.municipality, finca.department].filter(Boolean).join(', ');

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-border/80 bg-gradient-to-b from-card via-card to-primary/[0.025] shadow-[0_14px_28px_-22px_rgba(15,23,42,0.65)] ring-1 ring-black/[0.025] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_42px_-24px_rgba(15,23,42,0.55)] dark:ring-white/[0.04]">
      <div className="relative h-48 w-full shrink-0 overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 dark:from-emerald-950/60 dark:via-slate-900 dark:to-slate-950">
        <FincaImageCarousel
          images={images}
          fincaName={finca.name}
          className="h-full w-full bg-transparent"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-slate-950/10" />

        <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2">
          <Badge
            className={cn(
              'rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-lg backdrop-blur-md',
              finca.type === 'Educativa' ? 'bg-blue-600/90' : 'bg-emerald-600/90',
            )}
          >
            {finca.type}
          </Badge>

          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1 rounded-full border-white/30 bg-slate-950/45 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-md',
              !finca.is_active && 'bg-rose-950/65',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', finca.is_active ? 'bg-emerald-300' : 'bg-rose-300')} />
            {finca.is_active ? 'Operativa' : 'Inactiva'}
          </Badge>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            onManageImages(finca);
          }}
          className="absolute bottom-3 right-3 z-10 min-h-[42px] rounded-xl border border-white/25 bg-slate-950/65 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:bg-slate-950/85"
          title="Subir o gestionar fotos de esta finca"
        >
          <Camera className="h-3.5 w-3.5" />
          <span>{images.length > 0 ? `${images.length} fotos` : 'Subir fotos'}</span>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.13em] text-primary/80">Perfil de gestión</p>
              <button
                type="button"
                onClick={() => onOpenDetail?.(finca)}
                className="mt-1 block min-h-[42px] max-w-full text-left text-lg font-black leading-tight tracking-tight text-foreground transition-colors hover:text-primary focus-visible:text-primary"
                title={finca.name}
                aria-label={`Abrir ficha de ${finca.name}`}
              >
                <span className="line-clamp-2">{finca.name}</span>
              </button>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-sm" aria-hidden="true">
              <Building2 className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn('inline-flex min-h-[26px] items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.06em]', visibilityInfo.variant)}
              title={visibilityInfo.description}
            >
              {visibilityInfo.icon}
              {visibilityInfo.label}
            </span>
            {finca.nit && <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">NIT {finca.nit}</span>}
          </div>

          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            {location && (
              <div className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="fit-clamp font-medium">{location}</span>
              </div>
            )}
            {finca.address && (
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="fit-clamp">{finca.address}</span>
              </div>
            )}
            {!location && !finca.address && <span className="text-muted-foreground/70">Ubicación pendiente de registrar</span>}
          </div>
        </div>

        <FincaPerformancePanel
          kpis={finca.kpis}
          compact
          loading={metricsLoading}
          error={metricsError}
          lastUpdated={metricsUpdatedAt}
        />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onManageImages(finca);
              }}
              className="min-h-[42px] rounded-xl px-3 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              title="Administrar galería de imágenes"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span>Fotos</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onInviteUsers(finca.id);
              }}
              className="min-h-[42px] rounded-xl px-3 text-xs font-bold text-muted-foreground hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-700 dark:hover:text-emerald-300"
              title="Invitar usuarios a la finca"
            >
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              <span>Invitar</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenDetail?.(finca)}
            className="min-h-[42px] rounded-xl px-3 text-xs font-black text-primary hover:bg-primary/10"
          >
            <span>Ver ficha</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
};
