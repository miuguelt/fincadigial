import React from 'react';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/widgets/feedback/EmptyState';
import { FloatingScrollArea } from '@/shared/ui/FloatingScrollArea';
import { CRUDTable } from './CRUDTable';
import { CRUDCardGrid } from './CRUDCardGrid';

interface CRUDPageBodyProps<T extends { id: number }> {
  config: any;
  t: (key: string, fallback: string) => string;
  items: T[];
  empty: boolean;
  /** El encabezado propio de la pantalla viaja dentro del scroll. */
  usesScrollableHeader: boolean;
  isCardsView: boolean;
  pagination: React.ReactNode;

  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  openCreate: (prefill?: any) => void;
  openEdit: (item: T) => void;
  openDetail: (item: T) => void;
  openDeleteConfirm: (id: number) => void;

  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onUpdateCell?: (item: T, key: string, value: any) => Promise<void>;
  enhancedHover: boolean;
  refreshing?: boolean;
}

/** Lista vacía: el estado ofrece crear el primer registro si hay permiso. */
const BodyEmptyState = ({ config, t, canCreate, openCreate }: any) => (
  <EmptyState
    title={config.emptyStateMessage || `${t('state.empty.title', 'Sin datos')}: ${config.entityName}`}
    description={config.emptyStateDescription || t('state.empty.description', 'Crea el primer registro para comenzar.')}
    icon={config.emptyStateIcon}
    action={canCreate && (
      <button onClick={() => openCreate()} aria-label={`${t('common.create', 'Crear')} registro desde el estado vacío`}>
        <Plus className="h-4 w-4 mr-2" />
        {t('common.create', 'Crear')} {config.entityName.toLowerCase()}
      </button>
    )}
  />
);

/**
 * El listado en sí: tarjetas, tabla o estado vacío, más su paginación.
 *
 * `renderGrouped` releva por completo a la rejilla porque las vistas agrupadas
 * (tableros) gestionan su propio scroll y su propia altura.
 */
export function CRUDPageBody<T extends { id: number }>({
  config, t, items, empty, usesScrollableHeader, isCardsView, pagination,
  canCreate, canUpdate, canDelete, openCreate, openEdit, openDetail, openDeleteConfirm,
  selectedIds, onToggleSelect, onToggleSelectAll, onUpdateCell, enhancedHover, refreshing,
}: CRUDPageBodyProps<T>) {
  if (empty) {
    return <BodyEmptyState config={config} t={t} canCreate={canCreate} openCreate={openCreate} />;
  }

  if (isCardsView) {
    return (
      <div className="flex flex-col flex-1 min-h-0 mt-1">
        {config.renderGrouped ? (
          <div className="flex-1 min-h-0 rounded-xl flex flex-col overflow-hidden">
            {config.renderGrouped(items)}
          </div>
        ) : (
          <FloatingScrollArea
            containerClassName="flex-1 rounded-xl"
            horizontal={false}
            className="p-2 sm:p-3 lg:p-4 pb-20 md:pb-24"
          >
            {usesScrollableHeader && config.customHeader}
            <CRUDCardGrid<T>
              items={items}
              config={config}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onOpenDetail={openDetail}
            />
          </FloatingScrollArea>
        )}
        {pagination}
      </div>
    );
  }

  return (
    <>
      <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0 mt-1">
        <CRUDTable
          headerSlot={usesScrollableHeader ? config.customHeader : undefined}
          items={items}
          columns={config.columns}
          config={{
            ...config,
            customActions: config.customActions
              ? (item: T) => config.customActions!(item, { openCreate })
              : undefined,
          }}
          onOpenDetail={config.enableDetailModal !== false ? openDetail : undefined}
          onOpenEdit={canUpdate ? openEdit : undefined}
          onOpenDelete={canDelete ? openDeleteConfirm : undefined}
          enhancedHover={enhancedHover}
          refreshing={refreshing}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onToggleSelectAll={onToggleSelectAll}
          onUpdateCell={onUpdateCell}
        />
      </div>
      {pagination}
    </>
  );
}
