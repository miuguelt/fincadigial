import React from "react";
import { IconSyringe, IconStethoscope } from "@/shared/ui/icons";
export const TypeBadge = ({ type }: { type: string }) => {
  const isVac = (type || "").toLowerCase().includes("vacun");
  const classes = isVac
    ? "bg-blue-100 text-blue-700"
    : "bg-emerald-100 text-emerald-700";
  const Icon = isVac ? IconSyringe : IconStethoscope;
  const label = type || (isVac ? "Vacunación" : "Tratamiento");
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] text-xs font-medium ${classes}`}
    >
      {" "}
      <Icon size="sm" /> {label}{" "}
    </span>
  );
};
interface InfoFieldProps {
  label: string;
  value: any;
  fullWidth?: boolean;
  badge?: boolean;
  badgeVariant?: "default" | "secondary" | "destructive" | "success";
}
export const InfoField = ({
  label,
  value,
  fullWidth = false,
  badge = false,
  badgeVariant = "default",
}: InfoFieldProps) => {
  const displayValue =
    value !== null && value !== undefined && value !== "" ? String(value) : "—";
  return (
    <div className={`space-y-1.5 ${fullWidth ? "col-span-full" : ""}`}>
      {" "}
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {" "}
        {label}{" "}
      </div>{" "}
      {badge ? (
        <span
          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${badgeVariant === "success" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-100" : badgeVariant === "destructive" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-100" : badgeVariant === "secondary" ? "bg-muted text-foreground" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100"}`}
        >
          {" "}
          {displayValue}{" "}
        </span>
      ) : (
        <div
          className={`text-sm font-medium text-foreground ${fullWidth ? "whitespace-pre-wrap" : ""}`}
        >
          {" "}
          {displayValue}{" "}
        </div>
      )}{" "}
    </div>
  );
};
