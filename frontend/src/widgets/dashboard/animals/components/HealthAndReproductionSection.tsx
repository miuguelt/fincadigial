import React from "react";
import {
  SectionCard,
  InfoField,
  modalStyles,
} from "@/shared/ui/common/ModalStyles";
import { AnimalResponse } from "@/shared/api/generated/swaggerTypes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/shared/ui/badge";
import { IconHeart, IconActivity, IconCalendar } from "@/shared/ui/icons";
interface HealthAndReproductionSectionProps {
  animal: AnimalResponse;
}
export const HealthAndReproductionSection: React.FC<
  HealthAndReproductionSectionProps
> = ({ animal }) => {
  const formatDate = (date?: string) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "PPP", { locale: es });
    } catch {
      return date;
    }
  };
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Saludable: "success",
      "En Tratamiento": "warning",
      Enfermo: "destructive",
      Cuarentena: "secondary",
    };
    return (
      <Badge variant={(variants[status] || "default") as any}>{status}</Badge>
    );
  };
  return (
    <div className={modalStyles.spacing.section}>
      {" "}
      <SectionCard title="Sanidad y Reproducción">
        {" "}
        <div className={modalStyles.twoColGrid}>
          {" "}
          <div className="space-y-4">
            {" "}
            <div className="flex items-center gap-2 mb-2">
              {" "}
              <IconHeart size="md" className="text-red-500" />{" "}
              <h4 className="font-semibold text-foreground">
                Estado Sanitario
              </h4>{" "}
            </div>{" "}
            <div className="flex items-center gap-4">
              {" "}
              <span className="text-sm text-muted-foreground">
                Estado de Salud:
              </span>{" "}
              {getStatusBadge(animal.health_status || "Saludable")}{" "}
            </div>{" "}
            <InfoField
              label="Última Vacunación"
              value={formatDate((animal as any).last_vaccination)}
            />{" "}
            <InfoField
              label="Último Tratamiento"
              value={formatDate((animal as any).last_treatment)}
            />{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            <div className="flex items-center gap-2 mb-2">
              {" "}
              <IconActivity size="md" className="text-blue-500" />{" "}
              <h4 className="font-semibold text-foreground">
                Estado Reproductivo
              </h4>{" "}
            </div>{" "}
            <InfoField
              label="Etapa"
              value={animal.reproductive_status || "No aplica"}
            />{" "}
            {animal.sex === "Hembra" && (
              <>
                {" "}
                <InfoField
                  label="Último Parto"
                  value={formatDate((animal as any).last_calving)}
                />{" "}
                <InfoField
                  label="Días Abiertos"
                  value={(animal as any).open_days?.toString() || "0"}
                />{" "}
              </>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </SectionCard>{" "}
    </div>
  );
};
