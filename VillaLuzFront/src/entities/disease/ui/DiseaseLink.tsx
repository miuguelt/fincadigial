import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';

export const DiseaseLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderDiseaseContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Enfermedad" value={item.disease || item.name || '-'} valueSize="xlarge" />
              </div>
            </SectionCard>
            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </SectionCard>
            )}
            {item.symptoms && (
              <SectionCard title="Síntomas">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.symptoms}</p>
              </SectionCard>
            )}
          </div>
          <div className={modalStyles.spacing.section}>
            {item.treatment && (
              <SectionCard title="Tratamiento">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.treatment}</p>
              </SectionCard>
            )}
            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Creado" value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'} />
                <InfoField label="Actualizado" value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'} />
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
      service={diseaseService}
      modalTitle="Detalle de la Enfermedad"
      renderContent={renderDiseaseContent}
    />
  );
};
