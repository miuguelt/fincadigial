import React from "react";
import { cn } from "@/shared/ui/cn";
export type IconSize = "sm" | "md" | "lg";
const sizeMap: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };
interface IconProps extends React.SVGAttributes<SVGElement> {
  size?: IconSize;
  strokeWidth?: number;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}
export function createIcon(
  TablerIcon: React.FC<{
    size?: number;
    strokeWidth?: number;
    color?: string;
    className?: string;
  }>,
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
        size={sizeMap[size]}
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
