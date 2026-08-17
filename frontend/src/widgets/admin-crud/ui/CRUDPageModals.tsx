import React from 'react';
import { CRUDForm } from './CRUDForm';
import { DetailModal, ConfirmDeleteDialog } from './CRUDModals';
import type { DependencyInfo } from './hooks/useCrudDelete';

interface CRUDPageModalsProps<T extends { id: number }, TInput extends Record<string, any>> {
  config: any;
  t: (key: string, fallback: string) => string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;

  // Formulario de creación y edición
  isModalOpen: boolean;
  onModalClose: () => void;
  editingItem: T | null;
  formData: TInput;
  setFormData: React.Dispatch<React.SetStateAction<TInput>>;
  formErrors: Record<string, string>;
  updateFieldValue: (key: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  additionalFormContent?: (formData: TInput, editingItem: T | null) => React.ReactNode;

  // Detalle
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  detailItem: T | null;
  setDetailItem: (item: T | null) => void;
  detailIndex: number | null;
  setDetailIndex: (index: number | null) => void;
  items: T[];
  openEdit: (item: T) => void;
  customDetailContent?: (item: T, navigateToItem?: (item: T) => void) => React.ReactNode;

  // Confirmación de borrado
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  resetConfirmState: () => void;
  onConfirmDelete: () => void;
  isCheckingDependencies: boolean;
  dependencyInfo: DependencyInfo | null;
}

/**
 * Las tres capas modales de la pantalla: formulario, detalle y confirmación.
 *
 * Van juntas porque comparten el mismo registro seleccionado y los mismos
 * permisos; separarlas obligaría a repetir esos hilos tres veces.
 */
export function CRUDPageModals<T extends { id: number }, TInput extends Record<string, any>>({
  config, t, canCreate, canUpdate, canDelete,
  isModalOpen, onModalClose, editingItem, formData, setFormData, formErrors,
  updateFieldValue, onSubmit, saving, additionalFormContent,
  isDetailOpen, setIsDetailOpen, detailItem, setDetailItem, detailIndex, setDetailIndex,
  items, openEdit, customDetailContent,
  confirmOpen, setConfirmOpen, resetConfirmState, onConfirmDelete,
  isCheckingDependencies, dependencyInfo,
}: CRUDPageModalsProps<T, TInput>) {
  const entityLabel = config.entityName;

  return (
    <>
      {(canCreate || canUpdate) && (
        <CRUDForm
          isOpen={isModalOpen}
          onOpenChange={onModalClose}
          title={editingItem
            ? `${t('common.edit', 'Editar')} ${entityLabel}: ${editingItem.id}`
            : `${t('common.create', 'Crear')} ${entityLabel}`}
          formData={formData}
          setFormData={setFormData as unknown as React.Dispatch<React.SetStateAction<Record<string, any>>>}
          formSections={config.formSections || []}
          fieldErrors={formErrors}
          onFieldValueChange={updateFieldValue}
          onSubmit={onSubmit}
          saving={saving}
          editingItem={editingItem}
          showEditTimestamps={config.showEditTimestamps}
          additionalFormContent={additionalFormContent as any}
        />
      )}

      {config.enableDetailModal !== false && (
        <DetailModal
          isOpen={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={detailItem
            ? `Detalle del ${entityLabel}${config.showIdInDetailTitle === false ? '' : `: ${detailItem.id}`}`
            : `Detalle del ${entityLabel}`}
          item={detailItem}
          config={config}
          onEdit={canUpdate ? openEdit : undefined}
          customDetailContent={customDetailContent}
          showDetailTimestamps={config.showDetailTimestamps}
          showIdInDetailTitle={config.showIdInDetailTitle}
          detailIndex={detailIndex}
          setDetailIndex={setDetailIndex}
          items={items}
          setDetailItem={setDetailItem}
        />
      )}

      {canDelete && (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) resetConfirmState();
          }}
          title={config.confirmDeleteTitle || '⚠️ Confirmar eliminación'}
          description={config.confirmDeleteDescription || `¿Está seguro que desea eliminar este ${entityLabel.toLowerCase()}? Esta acción no se puede deshacer.`}
          onConfirm={onConfirmDelete}
          confirmLabel={t('common.delete', 'Eliminar')}
          cancelLabel={t('common.cancel', 'Cancelar')}
          entityName={entityLabel}
          loadingDependencies={isCheckingDependencies}
          dependencyInfo={dependencyInfo}
        />
      )}
    </>
  );
}
