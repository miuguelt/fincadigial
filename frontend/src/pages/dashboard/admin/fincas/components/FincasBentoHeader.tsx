import React from 'react';
import { Card } from '@/shared/ui/card';
import { Building2, CheckCircle2, BookOpen, Camera, ShieldCheck } from 'lucide-react';
import type { FarmAdminRecord } from '../types';

interface FincasBentoHeaderProps {
  items: FarmAdminRecord[];
  onOpenPrivacyModal?: () => void;
}

export const FincasBentoHeader: React.FC<FincasBentoHeaderProps> = ({
  items,
  onOpenPrivacyModal,
}) => {
  const total = items.length;
  const activeCount = items.filter((f) => f.is_active).length;
  const educationalCount = items.filter((f) => f.type === 'Educativa').length;
  const traditionalCount = items.filter((f) => f.type === 'Tradicional').length;
  const withPhotosCount = items.filter((f) => (f.images?.length || 0) > 0).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
      {/* Total Fincas */}
      <Card className="p-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card to-primary/[0.04] flex items-center gap-3.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.6)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground fit-clamp">
            Total Fincas
          </p>
          <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
            {total}
          </p>
        </div>
      </Card>

      {/* Activas */}
      <Card className="p-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card to-emerald-500/[0.04] flex items-center gap-3.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.6)] transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-md">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground fit-clamp">
            Operativas
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {activeCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              ({total > 0 ? Math.round((activeCount / total) * 100) : 0}%)
            </span>
          </div>
        </div>
      </Card>

      {/* Tipos: Tradicional vs Educativa */}
      <Card className="p-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card to-blue-500/[0.04] flex items-center gap-3.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.6)] transition-all hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-md">
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground fit-clamp">
            Modalidad
          </p>
          <div className="flex items-baseline gap-1.5 text-xs text-foreground font-bold">
            <span className="text-emerald-700 dark:text-emerald-400">{traditionalCount} Trad.</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-blue-700 dark:text-blue-400">{educationalCount} Educ.</span>
          </div>
        </div>
      </Card>

      {/* Con Fotos & Políticas */}
      <Card
        onClick={onOpenPrivacyModal}
        className="p-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card to-amber-500/[0.04] flex items-center gap-3.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.6)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all group"
      >
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground fit-clamp flex items-center justify-between">
            <span>Privacidad y Fotos</span>
            <span className="text-[11px] text-primary underline">Ver políticas</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-black text-foreground tabular-nums flex items-center gap-1">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              {withPhotosCount} con fotos
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
