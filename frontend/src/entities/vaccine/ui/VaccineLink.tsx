import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { Badge } from '@/shared/ui/badge';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';

export const VaccineLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderVaccineContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
                <InfoField label="Tipo" value={item.type || '-'} />
                {item.national_plan !== undefined && (
                  <div className="mt-2">
                    <div className={modalStyles.fieldLabel}>Plan Nacional</div>
                    <Badge className={`text-sm px-3 py-1 ${item.national_plan ? 'bg-blue-500/90 hover:bg-blue-600 text-white' : 'bg-gray-500/90 hover:bg-gray-600 text-white'}`}>
                      {item.national_plan ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                )}
              </div>
            </SectionCard>
            <SectionCard title="Dosificación">
              <InfoField label="Dosis" value={item.dosis || '-'} valueSize="large" />
              <InfoField label="Intervalo de Vacunación" value={item.vaccination_interval ? `${item.vaccination_interval} días` : '-'} />
            </SectionCard>
          </div>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Administración">
              <InfoField label="Ruta de Administración" value={item.route_administration_id ? `ID ${item.route_administration_id}` : '-'} />
              <InfoField label="Enfermedad Objetivo" value={item.target_disease_id ? `ID ${item.target_disease_id}` : '-'} />
            </SectionCard>
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
      service={vaccinesService}
      modalTitle="Detalle de la Vacuna"
      renderContent={renderVaccineContent}
    />
  );
};
