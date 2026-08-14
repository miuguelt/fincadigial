import React from "react";
import { cn } from "@/shared/ui/cn";
import * as icons from "@/shared/ui/icons";

export type IconSize = "sm" | "md" | "lg" | number;
const sizeMap: Record<string, number> = { sm: 16, md: 20, lg: 24 };

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name?: string;
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

export function Icon({ name = "bell", size = "md", className, ...props }: IconProps) {
  const pascalName = name ? name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') : 'Bell';
  const IconComp = (icons as any)[`Icon${pascalName}`] || (icons as any)[pascalName] || icons.IconBell;
  return <IconComp size={size} className={className} {...props} />;
}

export default Icon;
