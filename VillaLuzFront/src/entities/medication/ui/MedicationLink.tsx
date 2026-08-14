import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { Badge } from '@/shared/ui/badge';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';

export const MedicationLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderMedicationContent = (item: any) => {
    const availability = item.availability;
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
                {availability !== undefined && (
                  <div className="mt-2">
                    <div className={modalStyles.fieldLabel}>Disponibilidad</div>
                    <Badge className={`text-sm px-3 py-1 ${availability ? 'bg-success/90 hover:bg-success text-white' : 'bg-muted/500/90 hover:bg-secondary text-white'}`}>
                      {availability ? 'Disponible' : 'No disponible'}
                    </Badge>
                  </div>
                )}
              </div>
            </SectionCard>
            <SectionCard title="Dosificación">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Dosis" value={item.dosis || item.dosage_form || '-'} valueSize="large" />
                <InfoField label="Concentración" value={item.concentration || '-'} />
              </div>
            </SectionCard>
            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
              </SectionCard>
            )}
          </div>
          <div className={modalStyles.spacing.section}>
            {item.indications && (
              <SectionCard title="Indicaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.indications}</p>
              </SectionCard>
            )}
            {item.contraindications && (
              <SectionCard title="Contraindicaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.contraindications}</p>
              </SectionCard>
            )}
            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Creado" value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO') : '-'} />
                <InfoField label="Actualizado" value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-CO') : '-'} />
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
      service={medicationsService}
      modalTitle="Detalle del Medicamento"
      renderContent={renderMedicationContent}
    />
  );
};
