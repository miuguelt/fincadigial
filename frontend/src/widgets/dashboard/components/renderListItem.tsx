import {
  IconDna,
  IconActivity,
  IconMapPin,
  IconSyringe,
  IconPill,
  IconClipboardList,
} from "@/shared/ui/icons";
import { Badge } from "@/shared/ui/badge";
import type { ModalType } from "../AnimalActionsMenu.types";
export function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}
export function formatFullDate(dateStr: string) {
  return formatDate(dateStr);
}
function getIcon(type: ModalType) {
  switch (type) {
    case "genetic_improvement":
      return <IconDna size="sm" className="text-emerald-500" />;
    case "animal_disease":
      return <IconActivity size="sm" className="text-destructive" />;
    case "animal_field":
      return <IconMapPin size="sm" className="text-warning" />;
    case "vaccination":
      return <IconSyringe size="sm" className="text-info" />;
    case "treatment":
      return <IconPill size="sm" className="text-purple-500" />;
    case "control":
      return <IconClipboardList size="sm" className="text-orange-500" />;
    case "milk_production":
      return <IconActivity size="sm" className="text-sky-500" />;
    default:
      return null;
  }
}
function getLabel(id: number | string, list: any[]) {
  if (!list) return `ID: ${id}`;
  return list.find((o) => o.value === id)?.label || `ID: ${id}`;
}
export function renderListItemInternal(
  item: any,
  type: ModalType,
  options: any,
) {
  const content = (() => {
    switch (type) {
      case "genetic_improvement":
        return (
          <div className="space-y-1">
            {" "}
            <div className="flex justify-between items-start gap-2">
              {" "}
              <span className="text-sm font-bold text-foreground leading-tight">
                {" "}
                {item.improvement_type ||
                  item.genetic_event_technique ||
                  "Mejora Genética"}{" "}
              </span>{" "}
              <Badge
                variant="outline"
                className="text-[11px] h-5 bg-emerald-500/5 text-emerald-600 border-emerald-200 shrink-0"
              >
                {" "}
                {formatDate(item.date)}{" "}
              </Badge>{" "}
            </div>{" "}
            {item.details && (
              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-1.5 rounded-md mt-1 italic">
                "{item.details}"
              </p>
            )}{" "}
            {item.results && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-foreground/70">
                {" "}
                <span className="w-1 h-1 rounded-[var(--radius-full)] bg-emerald-500" />{" "}
                Resultado: {item.results}{" "}
              </div>
            )}{" "}
          </div>
        );
      case "animal_disease":
        return (
          <div className="space-y-1.5">
            {" "}
            <div className="flex justify-between items-center gap-2">
              {" "}
              <span className="text-sm font-bold text-foreground fit-clamp">
                {" "}
                {getLabel(item.disease_id, options.diseases)}{" "}
              </span>{" "}
              <Badge
                variant={item.status === "Activo" ? "destructive" : "default"}
                className={`text-[11px] h-5 ${item.status === "Curado" ? "bg-success text-white" : ""}`}
              >
                {" "}
                {item.status}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {" "}
              <div className="flex items-center gap-1">
                {" "}
                <span className="font-semibold text-foreground/60">
                  Diagnóstico:
                </span>{" "}
                <span>{formatDate(item.diagnosis_date)}</span>{" "}
              </div>{" "}
              <div className="flex items-center gap-1">
                {" "}
                <span className="font-semibold text-foreground/60">
                  Por:
                </span>{" "}
                <span className="fit-clamp max-w-[100px]">
                  {getLabel(item.instructor_id, options.users)}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            {item.notes && (
              <p className="text-[11px] text-muted-foreground/80 border-l-2 border-rose-200 pl-2 mt-1">
                {" "}
                {item.notes}{" "}
              </p>
            )}{" "}
          </div>
        );
      case "animal_field":
        return (
          <div className="space-y-1.5">
            {" "}
            <div className="flex justify-between items-start gap-2">
              {" "}
              <div className="flex flex-col">
                {" "}
                <span className="text-sm font-bold text-foreground">
                  {" "}
                  {getLabel(item.field_id, options.fields)}{" "}
                </span>{" "}
                <div className="flex items-center gap-2 mt-0.5">
                  {" "}
                  <Badge
                    variant="outline"
                    className="text-[11px] h-4 bg-warning/5 text-warning border-amber-200"
                  >
                    {" "}
                    Desde: {formatDate(item.assignment_date)}{" "}
                  </Badge>{" "}
                  {item.removal_date && (
                    <Badge
                      variant="outline"
                      className="text-[11px] h-4 bg-muted/500/5 text-muted-foreground border-border"
                    >
                      {" "}
                      Hasta: {formatDate(item.removal_date)}{" "}
                    </Badge>
                  )}{" "}
                </div>{" "}
              </div>{" "}
              <Badge
                variant={item.removal_date ? "secondary" : "default"}
                className={`text-[11px] h-5 ${!item.removal_date ? "bg-success text-white animate-pulse" : ""}`}
              >
                {" "}
                {item.removal_date ? "Retirado" : "Activo"}{" "}
              </Badge>{" "}
            </div>{" "}
            {item.notes && (
              <p className="text-[11px] text-muted-foreground/80 italic line-clamp-1 border-l-2 border-amber-200 pl-2">
                {" "}
                {item.notes}{" "}
              </p>
            )}{" "}
          </div>
        );
      case "vaccination":
        return (
          <div className="space-y-1.5">
            {" "}
            <div className="flex justify-between items-center gap-2">
              {" "}
              <span className="text-sm font-bold text-foreground">
                {" "}
                {getLabel(item.vaccine_id, options.vaccines)}{" "}
              </span>{" "}
              <Badge
                variant="outline"
                className="text-[11px] h-5 bg-info/5 text-info border-info/30"
              >
                {" "}
                {formatDate(item.vaccination_date)}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {" "}
              <span className="font-semibold">Instructor:</span>{" "}
              <span className="fit-clamp">
                {getLabel(item.instructor_id, options.users)}
              </span>{" "}
              {item.batch_number && (
                <>
                  {" "}
                  <span className="text-muted-foreground/30">•</span>{" "}
                  <span className="font-semibold">Lote:</span>{" "}
                  <span>{item.batch_number}</span>{" "}
                </>
              )}{" "}
            </div>{" "}
          </div>
        );
      case "treatment":
        return (
          <div className="space-y-2">
            {" "}
            <div className="flex justify-between items-start gap-2">
              {" "}
              <span className="text-sm font-bold text-foreground leading-tight">
                {" "}
                {item.diagnosis || item.description || "Tratamiento"}{" "}
              </span>{" "}
              <Badge
                variant="outline"
                className="text-[11px] h-5 bg-purple-500/5 text-purple-600 border-purple-200 shrink-0"
              >
                {" "}
                {formatDate(item.treatment_date)}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-2 p-2 bg-purple-500/5 rounded-lg">
              {" "}
              <div className="flex flex-col gap-0.5">
                {" "}
                <span className="text-[11px] font-bold text-purple-700 uppercase">
                  Dosis
                </span>{" "}
                <span className="text-[11px] text-foreground font-medium fit-clamp">
                  {item.dosis || "-"}
                </span>{" "}
              </div>{" "}
              <div className="flex flex-col gap-0.5">
                {" "}
                <span className="text-[11px] font-bold text-purple-700 uppercase">
                  Frecuencia
                </span>{" "}
                <span className="text-[11px] text-foreground font-medium fit-clamp">
                  {item.frequency || "-"}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            {item.veterinarian && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                {" "}
                <div className="w-1.5 h-1.5 rounded-[var(--radius-full)] bg-purple-400" />{" "}
                <span>
                  Veterinario:{" "}
                  <span className="text-foreground">{item.veterinarian}</span>
                </span>{" "}
              </div>
            )}{" "}
          </div>
        );
      case "control": {
        const healthStatus = item.health_status || "Desconocido";
        const healthConfig = (
          {
            Excelente: {
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
              border: "border-emerald-200",
              icon: "✓",
            },
            Bueno: {
              color: "text-success",
              bg: "bg-success/10",
              border: "border-success/30",
              icon: "✓",
            },
            Sano: {
              color: "text-success",
              bg: "bg-success/10",
              border: "border-success/30",
              icon: "✓",
            },
            Regular: {
              color: "text-warning",
              bg: "bg-warning/10",
              border: "border-amber-200",
              icon: "⚠",
            },
            Malo: {
              color: "text-destructive",
              bg: "bg-destructive/10",
              border: "border-rose-200",
              icon: "✗",
            },
          } as Record<
            string,
            { color: string; bg: string; border: string; icon: string }
          >
        )[healthStatus] || {
          color: "text-muted-foreground",
          bg: "bg-muted/50",
          border: "border-border",
          icon: "?",
        };
        return (
          <div className="space-y-3">
            {" "}
            <div className="flex justify-between items-start gap-3">
              {" "}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] text-xs font-bold ${healthConfig.bg} ${healthConfig.color} border ${healthConfig.border}`}
              >
                {" "}
                <span>{healthConfig.icon}</span> {healthStatus}{" "}
              </span>{" "}
              <Badge
                variant="outline"
                className="text-[11px] h-6 px-2 bg-orange-500/5 text-orange-600 border-orange-200 font-semibold"
              >
                {" "}
                📅 {formatDate(item.checkup_date)}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-3">
              {" "}
              {item.weight && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                  {" "}
                  <div className="w-8 h-8 rounded-[var(--radius-full)] bg-info/10 flex items-center justify-center">
                    {" "}
                    <span className="text-info text-sm">⚖️</span>{" "}
                  </div>{" "}
                  <div className="flex flex-col">
                    {" "}
                    <span className="text-[11px] text-muted-foreground font-medium uppercase">
                      Peso
                    </span>{" "}
                    <span className="text-sm font-black text-foreground">
                      {item.weight}{" "}
                      <span className="text-[11px] font-normal">kg</span>
                    </span>{" "}
                  </div>{" "}
                </div>
              )}{" "}
              {item.height && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                  {" "}
                  <div className="w-8 h-8 rounded-[var(--radius-full)] bg-teal-500/10 flex items-center justify-center">
                    {" "}
                    <span className="text-teal-600 text-sm">📏</span>{" "}
                  </div>{" "}
                  <div className="flex flex-col">
                    {" "}
                    <span className="text-[11px] text-muted-foreground font-medium uppercase">
                      Altura
                    </span>{" "}
                    <span className="text-sm font-black text-foreground">
                      {item.height}{" "}
                      <span className="text-[11px] font-normal">m</span>
                    </span>{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>{" "}
            {item.description && (
              <div className="p-2 rounded-lg bg-muted/20 border-l-2 border-orange-300">
                {" "}
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  "{item.description}"
                </p>{" "}
              </div>
            )}{" "}
          </div>
        );
      }
      case "milk_production":
        return (
          <div className="space-y-1.5">
            {" "}
            <div className="flex justify-between items-center gap-2">
              {" "}
              <span className="text-sm font-bold text-foreground">
                {" "}
                Ordeño {item.session}{" "}
              </span>{" "}
              <Badge
                variant="outline"
                className="text-[11px] h-5 bg-sky-500/5 text-sky-600 border-sky-200 font-bold"
              >
                {" "}
                {item.liters} L{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {" "}
              <span className="font-semibold text-foreground/60">
                {formatDate(item.date)}
              </span>{" "}
              {item.fat_percentage && (
                <>
                  {" "}
                  <span className="text-muted-foreground/30">•</span>{" "}
                  <span>Grasa: {item.fat_percentage}%</span>{" "}
                </>
              )}{" "}
            </div>{" "}
            {item.notes && (
              <p className="text-[11px] text-muted-foreground/80 italic border-l-2 border-sky-200 pl-2">
                {" "}
                {item.notes}{" "}
              </p>
            )}{" "}
          </div>
        );
      default:
        return null;
    }
  })();
  return (
    <div className="flex gap-3">
      {" "}
      <div className="mt-0.5 shrink-0 bg-background shadow-sm border border-border/40 p-1.5 rounded-lg h-fit">
        {" "}
        {getIcon(type)}{" "}
      </div>{" "}
      <div className="flex-1 min-w-0"> {content} </div>{" "}
    </div>
  );
}
