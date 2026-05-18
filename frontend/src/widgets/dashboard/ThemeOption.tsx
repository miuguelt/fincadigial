import React from "react";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import { IconCheck } from "@/shared/ui/icons";
import { cn } from "@/shared/ui/cn";
export interface ThemeOptionProps {
  name: string;
  displayName: string;
  isCurrent: boolean;
  setTheme: (name: string) => void;
  icon: React.ReactNode;
  description: string;
  previewColors: { bg: string; primary: string; card: string };
}
export const ThemeOption: React.FC<ThemeOptionProps> = ({
  name,
  displayName,
  isCurrent,
  setTheme,
  icon,
  description,
  previewColors,
}) => (
  <DropdownMenuItem
    onClick={() => setTheme(name)}
    className={cn(
      "flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-all duration-150",
      isCurrent ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/50",
    )}
  >
    {" "}
    <div className="flex-shrink-0 w-10 h-8 rounded-md overflow-hidden border border-border/50 flex">
      {" "}
      <div
        className="w-1/2 h-full"
        style={{ backgroundColor: `hsl(${previewColors.bg})` }}
      />{" "}
      <div
        className="w-1/4 h-full"
        style={{ backgroundColor: `hsl(${previewColors.primary})` }}
      />{" "}
      <div
        className="w-1/4 h-full"
        style={{ backgroundColor: `hsl(${previewColors.card})` }}
      />{" "}
    </div>{" "}
    <div
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0",
        isCurrent
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {" "}
      {icon}{" "}
    </div>{" "}
    <div className="flex-1 min-w-0">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <span
          className={cn(
            "text-sm font-medium",
            isCurrent ? "text-primary" : "text-foreground",
          )}
        >
          {" "}
          {displayName}{" "}
        </span>{" "}
        {isCurrent && (
          <IconCheck size="sm" className="text-primary flex-shrink-0" />
        )}{" "}
      </div>{" "}
      <p className="text-xs text-muted-foreground truncate">
        {description}
      </p>{" "}
    </div>{" "}
  </DropdownMenuItem>
);
