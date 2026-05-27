import React from "react";
import { cn } from "@/shared/ui/cn";
export type IconSize = "sm" | "md" | "lg" | number;
const sizeMap: Record<string, number> = { sm: 16, md: 20, lg: 24 };
export interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: IconSize;
  strokeWidth?: number;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}
export function createIcon(
  TablerIcon: React.ElementType<any>
) {
  const IconComponent = React.forwardRef<SVGElement, IconProps>(
    (
      {
        size = "md",
        strokeWidth = 1.5,
        className,
        "aria-label": ariaLabel,
        "aria-hidden": ariaHidden,
        ...props
      },
      ref,
    ) => (
      <TablerIcon
        size={typeof size === "number" ? size : (sizeMap[size] ?? 20)}
        strokeWidth={strokeWidth}
        color="currentColor"
        className={cn("flex-shrink-0", className)}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden ?? !ariaLabel}
        ref={ref as never}
        {...props}
      />
    ),
  );
  IconComponent.displayName = "Icon";
  return IconComponent;
}
