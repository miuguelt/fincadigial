import React from "react";
import {
  SectionCard,
  InfoField,
  modalStyles,
} from "@/shared/ui/common/ModalStyles";
import { AnimalResponse } from "@/shared/api/generated/swaggerTypes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
interface BasicInfoSectionProps {
  animal: AnimalResponse;
}
export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  animal,
}) => {
  const formatDate = (date?: string) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "PPP", { locale: es });
    } catch {
      return date;
    }
  };
  return (
    <div className={modalStyles.spacing.section}>
      {" "}
      <SectionCard title="Información Básica">
        {" "}
        <div className={modalStyles.twoColGrid}>
          {" "}
          <div className="space-y-4">
            {" "}
            <InfoField
              label="Número de Arete / Registro"
              value={animal.record}
              valueSize="large"
            />{" "}
            <InfoField label="Nombre" value={animal.name || "Sin nombre"} />{" "}
            <InfoField label="Sexo" value={animal.sex} />{" "}
            <InfoField
              label="Especie"
              value={
                (animal as any).specie?.name ||
                (animal as any).species?.name ||
                "-"
              }
            />{" "}
            <InfoField
              label="Raza"
              value={(animal as any).breed?.name || "-"}
            />{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            <InfoField label="Estado Actual" value={animal.status} />{" "}
            <InfoField
              label="Fecha de Nacimiento"
              value={formatDate(animal.birth_date)}
            />{" "}
            <InfoField
              label="Peso al Nacer"
              value={animal.birth_weight ? `${animal.birth_weight} kg` : "-"}
            />{" "}
            <InfoField
              label="Potrero"
              value={(animal as any).field?.name || "-"}
            />{" "}
          </div>{" "}
        </div>{" "}
      </SectionCard>{" "}
    </div>
  );
};
