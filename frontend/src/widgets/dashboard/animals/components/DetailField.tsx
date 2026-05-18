import React from "react";
interface DetailFieldProps {
  label: string;
  value: any;
  children?: React.ReactNode;
}
export function DetailField({ label, value, children }: DetailFieldProps) {
  return (
    <div className="space-y-1.5">
      {" "}
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/90">
        {" "}
        {label}{" "}
      </div>{" "}
      {children || (
        <div className="text-sm font-semibold text-foreground">
          {" "}
          {value ?? "-"}{" "}
        </div>
      )}{" "}
    </div>
  );
}
