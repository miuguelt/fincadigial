import React from "react";
import { cn } from "@/shared/ui/cn";
export interface PageWrapperProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}
const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  subtitle,
  actions,
  children,
  className,
  headerClassName,
  contentClassName,
}) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {" "}
      <header
        className={cn(
          "flex-shrink-0 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6",
          "border-b border-[var(--border-subtle)]",
          headerClassName,
        )}
      >
        {" "}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          {" "}
          <div className="flex flex-col gap-1 min-w-0">
            {" "}
            <h1 className="text-2xl font-medium tracking-tight text-foreground truncate">
              {" "}
              {title}{" "}
            </h1>{" "}
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {" "}
                {subtitle}{" "}
              </p>
            )}{" "}
          </div>{" "}
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {" "}
              {actions}{" "}
            </div>
          )}{" "}
        </div>{" "}
      </header>{" "}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6",
          contentClassName,
        )}
      >
        {" "}
        {children}{" "}
      </div>{" "}
    </div>
  );
};
export default PageWrapper;
