import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/api/client';
import {
  Users,
  Camera,
  LayoutGrid,
  Table,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { InviteUserDialog } from '../../../../features/multi-finca/ui/InviteUserDialog';
import { FincaImagesManager } from '@/widgets/finca/FincaImagesManager';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminFincaCard } from './components/AdminFincaCard';
import { FincasBentoHeader } from './components/FincasBentoHeader';
import { FincaPrivacyModal } from './components/FincaPrivacyModal';
import { FincaCustomDetail } from './components/FincaCustomDetail';
import type { FarmAdminRecord, FarmAdminInput } from './types';
import { normalizeFincaPerformanceRows } from './components/fincaPerformance';
import { fincasConfig } from './fincasConfig';
import { fincaFormDefaults } from './fincaFormDefaults';
import { fincasAdminService } from './fincasService';

export type { FarmAdminRecord, FarmAdminInput };
export { fincasConfig } from './fincasConfig';
export { fincaFormDefaults } from './fincaFormDefaults';
export { fincasAdminService } from './fincasService';

const FincasAdminPage: React.FC = () => {
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [items, setItems] = useState<FarmAdminRecord[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedFincaId, setSelectedFincaId] = useState<number | null>(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [imageManagerFinca, setImageManagerFinca] = useState<FarmAdminRecord | null>(null);
  const { data: performanceByFinca, isLoading: metricsLoading, isError: metricsError, dataUpdatedAt: metricsUpdatedAt } = useQuery({
    queryKey: ['admin-finca-performance'],
    queryFn: async () => normalizeFincaPerformanceRows(
      unwrapApi(await apiFetch({ url: '/fincas/performance' })),
    ),
    staleTime: 60_000,
  });
  const metrics = useMemo(() => performanceByFinca ?? new Map(), [performanceByFinca]);

  const handleInvite = (fincaId: number) => {
    setSelectedFincaId(fincaId);
    setInviteDialogOpen(true);
  };

  const handleOpenImages = (finca: FarmAdminRecord) => {
    setImageManagerFinca(finca);
  };

  return (
    <div className="space-y-4 h-full flex flex-col min-w-0">
      <AdminCRUDPage
        config={{
          ...fincasConfig,
          viewMode,
          cardGridClassName: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          customHeader: (
            <FincasBentoHeader
              items={items}
              onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
            />
          ),
          toolbarPlacement: 'row',
          customToolbar: (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
              {/* Selector de Vista: Tarjetas vs Tabla */}
              <div className="flex items-center border border-border/70 rounded-xl p-0.5 bg-card/60 shrink-0 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Ver en formato de tarjetas con fotos"
                >
                  <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Tarjetas</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'table'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Ver en formato de tabla"
                >
                  <Table className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Tabla</span>
                </Button>
              </div>

              {/* Botón Políticas de Privacidad */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPrivacyModalOpen(true)}
                  className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-foreground border-border/70 rounded-xl shadow-2xs"
                  title="Consultar marco de políticas de privacidad y visibilidad"
                >
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <span className="hidden sm:inline">Políticas de Privacidad</span>
                  <span className="sm:hidden">Privacidad</span>
                </Button>
              </div>
            </div>
          ),
          renderCard: (item, openDetail) => (
            <AdminFincaCard
              finca={{ ...item, kpis: metrics.get(item.id) }}
              onOpenDetail={openDetail}
              onManageImages={handleOpenImages}
              onInviteUsers={handleInvite}
              metricsLoading={metricsLoading}
              metricsError={metricsError}
              metricsUpdatedAt={metricsUpdatedAt}
            />
          ),
          customActions: (row) => (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenImages(row)}
                className="flex items-center gap-1.5 text-xs"
                title="Administrar fotos de la finca"
              >
                <Camera className="h-3.5 w-3.5 text-primary" />
                <span>Fotos</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleInvite(row.id)}
                className="flex items-center gap-1.5 text-xs"
                title="Invitar usuarios a la finca"
              >
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span>Invitar</span>
              </Button>
            </div>
          ),
        }}
        customDetailContent={(item) => (
          <FincaCustomDetail
            finca={{ ...item, kpis: metrics.get(item.id) }}
            onManageImages={handleOpenImages}
            onInviteUsers={handleInvite}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            metricsUpdatedAt={metricsUpdatedAt}
          />
        )}
        service={fincasAdminService}
        initialFormData={fincaFormDefaults}
        onItemsChange={setItems}
      />

      {/* Modal para invitar usuarios */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        fincaId={selectedFincaId}
      />

      {/* Modal para auditar Políticas de Privacidad */}
      <FincaPrivacyModal
        open={privacyModalOpen}
        onOpenChange={setPrivacyModalOpen}
      />

      {/* Modal para subir y gestionar fotos de la finca */}
      {imageManagerFinca && (
        <FincaImagesManager
          open={Boolean(imageManagerFinca)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setImageManagerFinca(null);
          }}
          fincaId={imageManagerFinca.id}
          fincaName={imageManagerFinca.name}
          onImagesChange={(newImages) => {
            setItems((prev) =>
              prev.map((f) =>
                f.id === imageManagerFinca.id
                  ? {
                      ...f,
                      images: newImages,
                      primary_image_url:
                        newImages.find((img) => img.is_primary)?.url ||
                        newImages[0]?.url ||
                        f.logo_url,
                    }
                  : f
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default FincasAdminPage;
