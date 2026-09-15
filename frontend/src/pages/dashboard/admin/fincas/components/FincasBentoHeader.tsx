import React from 'react';
import { Building2, CheckCircle2, BookOpen, ShieldCheck } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
      {/* Total Fincas */}
      <KPICard
        compact
        title="Total Fincas"
        value={total}
        icon={<Building2 className="h-4 w-4 text-primary" />}
      />

      {/* Operativas */}
      <KPICard
        compact
        title="Operativas"
        value={activeCount}
        subtitle={total > 0 ? `${Math.round((activeCount / total) * 100)}% del total` : undefined}
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      />

      {/* Modalidad: Tradicional vs Educativa */}
      <KPICard
        compact
        title="Modalidad"
        value={`${traditionalCount} Trad. · ${educationalCount} Educ.`}
        icon={<BookOpen className="h-4 w-4 text-blue-500" />}
      />

      {/* Privacidad y Fotos */}
      <KPICard
        compact
        title="Privacidad y Fotos"
        value={`${withPhotosCount} con fotos`}
        subtitle="Ver políticas"
        icon={<ShieldCheck className="h-4 w-4 text-amber-500" />}
        onClick={onOpenPrivacyModal}
        className="cursor-pointer hover:border-amber-500/40"
      />
    </div>
  );
};
