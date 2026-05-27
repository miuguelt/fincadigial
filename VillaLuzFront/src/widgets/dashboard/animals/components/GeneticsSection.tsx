import React from "react";
import {
  SectionCard,
  InfoField,
  modalStyles,
} from "@/shared/ui/common/ModalStyles";
import { AnimalResponse } from "@/shared/api/generated/swaggerTypes";
import { IconDna } from "@/shared/ui/icons";
interface GeneticsSectionProps {
  animal: AnimalResponse;
}
export const GeneticsSection: React.FC<GeneticsSectionProps> = ({ animal }) => {
  return (
    <div className={modalStyles.spacing.section}>
      {" "}
      <SectionCard title="Genealogía y Genética">
        {" "}
        <div className={modalStyles.twoColGrid}>
          {" "}
          <div className="space-y-4">
            {" "}
            <div className="flex items-center gap-2 mb-2">
              {" "}
              <IconDna size="md" className="text-purple-500" />{" "}
              <h4 className="font-semibold text-foreground">
                Ascendencia
              </h4>{" "}
            </div>{" "}
            <InfoField
              label="Padre (Semental)"
              value={
                animal.idFather ? `ID: ${animal.idFather}` : "No registrado"
              }
            />{" "}
            <InfoField
              label="Madre"
              value={
                animal.idMother ? `ID: ${animal.idMother}` : "No registrada"
              }
            />{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            <div className="flex items-center gap-2 mb-2">
              {" "}
              <IconDna size="md" className="text-indigo-500" />{" "}
              <h4 className="font-semibold text-foreground">
                Pureza y Raza
              </h4>{" "}
            </div>{" "}
            <InfoField
              label="Raza Predominante"
              value={(animal as any).breed?.name || "-"}
            />{" "}
            <InfoField
              label="Porcentaje de Sangre"
              value={
                (animal as any).blood_purity
                  ? `${(animal as any).blood_purity}%`
                  : "100%"
              }
            />{" "}
          </div>{" "}
        </div>{" "}
      </SectionCard>{" "}
    </div>
  );
};
