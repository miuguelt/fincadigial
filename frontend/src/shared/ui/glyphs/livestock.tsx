import React from "react";
import { cn } from "@/shared/ui/cn";
import type { IconProps } from "@/shared/ui/Icon";

const sizeMap: Record<string, number> = { sm: 16, md: 20, lg: 24 };

/**
 * Tabler no incluye iconos de ganado bovino, así que los pictogramas propios de
 * la finca (vaca, ternero, ganado) viven aquí. Siguen el mismo trazo monolineal de
 * Tabler (currentColor, stroke 1.5, viewBox 24) para que combinen en el menú.
 */
function createGlyph(paths: React.ReactNode) {
  const Glyph = React.forwardRef<SVGSVGElement, IconProps>(
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
    ) => {
      const px = typeof size === "number" ? size : (sizeMap[size] ?? 20);
      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={px}
          height={px}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("flex-shrink-0", className)}
          aria-label={ariaLabel}
          aria-hidden={ariaHidden ?? !ariaLabel}
          role={ariaLabel ? "img" : undefined}
          {...props}
        >
          {paths}
        </svg>
      );
    },
  );
  Glyph.displayName = "Glyph";
  return Glyph;
}

/** Cabeza de vaca de frente: el símbolo de la ganadería en toda la app. */
export const IconCow = createGlyph(
  <>
    {/* Cuernos */}
    <path d="M7.2 6.9C6.6 5.2 5.2 4.2 3.8 4.5c-.9.2-1.3.9-1.1 1.6" />
    <path d="M16.8 6.9c.6-1.7 2-2.7 3.4-2.4.9.2 1.3.9 1.1 1.6" />
    {/* Orejas */}
    <path d="M4.6 9.1C3.1 8.5 1.8 8.9 1.6 9.9c-.2 1 .9 2 2.4 2.2" />
    <path d="M19.4 9.1c1.5-.6 2.8-.2 3 .8.2 1-.9 2-2.4 2.2" />
    {/* Cabeza */}
    <path d="M6.8 7h10.4c1.4 0 2.3 1 2.3 2.6v2.2c0 3.4-3.4 6.2-7.5 6.2s-7.5-2.8-7.5-6.2V9.6C4.5 8 5.4 7 6.8 7Z" />
    {/* Hocico */}
    <path d="M12 12.4c1.9 0 3.4 1.1 3.4 2.4s-1.5 2.4-3.4 2.4-3.4-1.1-3.4-2.4 1.5-2.4 3.4-2.4Z" />
    {/* Ojos y fosas nasales */}
    <path d="M9.3 10.4h.01M14.7 10.4h.01M10.6 14.7h.01M13.4 14.7h.01" strokeWidth="2" />
  </>,
);

/** Ternero: cría, reproducción y nacimientos. */
export const IconCalf = createGlyph(
  <>
    {/* Orejas grandes, sin cuernos */}
    <path d="M6.5 8.6C5 7.6 3.3 7.7 2.8 8.8c-.5 1 .5 2.3 2 2.9" />
    <path d="M17.5 8.6c1.5-1 3.2-.9 3.7.2.5 1-.5 2.3-2 2.9" />
    {/* Cabeza */}
    <path d="M8 6.6h8c1.3 0 2.1 1 2.1 2.5v2.5c0 3.2-2.7 5.8-6.1 5.8s-6.1-2.6-6.1-5.8V9.1C5.9 7.6 6.7 6.6 8 6.6Z" />
    {/* Hocico */}
    <path d="M12 12.2c1.6 0 2.9 1 2.9 2.1 0 1.2-1.3 2.1-2.9 2.1s-2.9-1-2.9-2.1c0-1.2 1.3-2.1 2.9-2.1Z" />
    {/* Ojos y fosas nasales */}
    <path d="M9.7 10.2h.01M14.3 10.2h.01M10.9 14h.01M13.1 14h.01" strokeWidth="2" />
    {/* Mechón */}
    <path d="M12 6.6V4.4" />
  </>,
);

/** Ganado: varias reses juntas, para inventario y conteos. */
export const IconHerd = createGlyph(
  <>
    {/* Res del fondo */}
    <path d="M15.5 4.6c.5-1.2 1.6-1.9 2.7-1.6" />
    <path d="M14.6 5.2h4.9c1 0 1.6.7 1.6 1.8v1.6c0 2.4-2.3 4.3-5 4.3" />
    {/* Res principal */}
    <path d="M5.4 8.8C4.9 7.5 3.8 6.8 2.7 7.1" />
    <path d="M12.6 8.8c.5-1.3 1.6-2 2.7-1.7" />
    <path d="M5.8 8.9h6.4c1.1 0 1.8.8 1.8 2v1.7c0 2.6-2.6 4.7-5 4.7s-5-2.1-5-4.7v-1.7c0-1.2.7-2 1.8-2Z" />
    <path d="M9 13.1c1.4 0 2.5.8 2.5 1.8s-1.1 1.8-2.5 1.8-2.5-.8-2.5-1.8 1.1-1.8 2.5-1.8Z" />
    <path d="M7.5 11.6h.01M10.5 11.6h.01" strokeWidth="2" />
  </>,
);
