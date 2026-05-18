import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';

export const BreedLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderBreedContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
              </div>
            </SectionCard>
            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </SectionCard>
            )}
            {item.characteristics && (
              <SectionCard title="Características">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.characteristics}
                </p>
              </SectionCard>
            )}
          </div>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Especie">
              <InfoField
                label="Especie"
                value={item.species?.name || (item.species_id ? `ID ${item.species_id}` : '-')}
                valueSize="large"
              />
            </SectionCard>
            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={breedsService}
      modalTitle="Detalle de la Raza"
      renderContent={renderBreedContent}
    />
  );
};
