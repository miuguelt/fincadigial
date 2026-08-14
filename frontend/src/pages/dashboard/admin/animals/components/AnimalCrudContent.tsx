import type { ReactNode } from 'react';
import type { AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { AnimalImagePreUpload } from '@/widgets/dashboard/animals/AnimalImagePreUpload';
import { animalsService } from '@/entities/animal/api/animal.service';
import { AnimalPageOverlays, type AnimalPageOverlaysProps } from './AnimalPageOverlays';
import type { AnimalCrudConfig } from '../config/crud.config';

function AnimalImageField({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  return <div className="relative rounded-xl p-4 border border-border/40 bg-gradient-to-br from-card/30 via-card/20 to-transparent shadow-sm backdrop-blur-sm"><div className="mb-4 pb-2 border-b border-border/30"><h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Imágenes del Animal (Opcional)</h3></div><AnimalImagePreUpload files={files} onChange={onChange} maxFiles={20} /></div>;
}

interface AnimalCrudContentProps {
  config: AnimalCrudConfig;
  initialFormData: Partial<AnimalInput>;
  mapResponseToForm: (item: any) => Partial<AnimalInput>;
  validateForm: (data: Partial<AnimalInput>) => string | null;
  renderDetail: (item: any) => ReactNode;
  onFormDataChange: (data: Partial<AnimalInput>) => void;
  pendingImages: File[];
  setPendingImages: (files: File[]) => void;
  overlays: AnimalPageOverlaysProps;
}

export function AnimalCrudContent({ config, initialFormData, mapResponseToForm, validateForm, renderDetail, onFormDataChange, pendingImages, setPendingImages, overlays }: AnimalCrudContentProps) {
  return (
    <>
      <AdminCRUDPage config={config} service={animalsService} initialFormData={initialFormData} mapResponseToForm={mapResponseToForm} validateForm={validateForm} customDetailContent={renderDetail} onFormDataChange={onFormDataChange} realtime pollIntervalMs={0} refetchOnFocus={false} refetchOnReconnect enhancedHover additionalFormContent={(_formData: any, editingItem: any) => editingItem ? null : <AnimalImageField files={pendingImages} onChange={setPendingImages} />} />
      <AnimalPageOverlays {...overlays} />
    </>
  );
}
