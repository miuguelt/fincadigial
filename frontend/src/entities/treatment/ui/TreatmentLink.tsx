import React from 'react';
import { ForeignKeyLink } from '@/shared/ui/common/ForeignKeyLink';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { Badge } from '@/shared/ui/badge';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';

/**
 * Formatea una fecha del backend evitando el desfase de zona horaria:
 * las fechas "solo día" (YYYY-MM-DD) se anclan al mediodía local.
 */
const formatDay = (value?: string | null): string => {
  if (!value) return '-';
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCurrency = (value?: number | string | null): string => {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

export const TreatmentLink: React.FC<{ id: number | string; label: string; children?: React.ReactNode }> = ({ id, label, children }) => {
  const renderTreatmentContent = (item: any) => {
    const animalRecord = item.animals?.record ?? item.animal_record;
    const withdrawalDays = Number(item.withdrawal_days ?? 0);

    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField
                  label="Diagnóstico / Descripción"
                  value={item.description || item.diagnosis || '-'}
                  valueSize="xlarge"
                />
                <InfoField label="Fecha del tratamiento" value={formatDay(item.treatment_date)} valueSize="large" />
                <InfoField
                  label="Animal"
                  value={animalRecord ? `${animalRecord} (ID ${item.animal_id})` : (item.animal_id ? `ID ${item.animal_id}` : '-')}
                />
              </div>
            </SectionCard>
            <SectionCard title="Posología">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Dosis" value={item.dosis || '-'} valueSize="large" />
                <InfoField label="Frecuencia" value={item.frequency || '-'} />
              </div>
            </SectionCard>
            {item.observations && (
              <SectionCard title="Observaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{item.observations}</p>
              </SectionCard>
            )}
          </div>
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Periodo de Retiro">
              <div className={modalStyles.spacing.sectionSmall}>
                <div>
                  <div className={modalStyles.fieldLabel}>Estado</div>
                  <Badge className={`text-sm px-3 py-1 ${withdrawalDays > 0 ? 'bg-warning/90 hover:bg-warning text-white' : 'bg-success/90 hover:bg-success text-white'}`}>
                    {withdrawalDays > 0 ? `${withdrawalDays} días de retiro` : 'Sin periodo de retiro'}
                  </Badge>
                </div>
                <InfoField label="Fin del retiro" value={formatDay(item.withdrawal_end_date)} />
              </div>
            </SectionCard>
            <SectionCard title="Registro">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Costo" value={formatCurrency(item.cost)} />
                <InfoField label="Control asociado" value={item.control_id ? `ID ${item.control_id}` : '-'} />
                <InfoField label="Realizado por" value={item.performed_by ? `ID ${item.performed_by}` : '-'} />
                <InfoField label="Finca" value={item.finca_id ? `ID ${item.finca_id}` : '-'} />
              </div>
            </SectionCard>
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
      service={treatmentsService}
      modalTitle="Detalle del Tratamiento"
      renderContent={renderTreatmentContent}
    >
      {children}
    </ForeignKeyLink>
  );
};
