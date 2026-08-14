/**
 * FitText — texto que se adapta al ancho de su contenedor.
 *
 * Mantiene el tamaño de las clases CSS mientras quepa; si no cabe, encoge la
 * letra lo justo para no partir ninguna palabra. Sustituye a los títulos con
 * tamaño fijo dentro de tarjetas, botones y encabezados estrechos.
 *
 *   <FitText as="h3" className="text-xl md:text-2xl font-bold">
 *     Reportar Enfermedad
 *   </FitText>
 *
 * El envoltorio debe dar el ancho: dentro de un flex, `flex-1 min-w-0`.
 * Ver docs/estandar-texto-adaptable.md.
 */
import { createElement, forwardRef, type ElementType, type ReactNode } from 'react';
import { useFitText } from '@/shared/hooks/useFitText';
import { mergeRefs, type AnyRef } from '@/shared/lib/mergeRefs';
import { cn } from './cn';

export interface FitTextProps {
  /** Etiqueta a renderizar. Por defecto `span`. */
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Renglones permitidos antes de encoger. 1 = una sola línea. */
  maxLines?: number;
  /** Suelo de reducción respecto al tamaño declarado en CSS. */
  minScale?: number;
  title?: string;
  id?: string;
}

export const FitText = forwardRef<HTMLElement, FitTextProps>(function FitText(
  { as = 'span', children, className, maxLines = 1, minScale = 0.55, ...rest },
  ref,
) {
  // `children` en las dependencias: al cambiar el texto se vuelve a medir.
  const fitRef = useFitText<HTMLElement>({ maxLines, minScale, deps: [children] });

  return createElement(
    as,
    {
      ref: mergeRefs(ref as AnyRef<HTMLElement>, fitRef),
      className: cn('fit-text', className),
      'data-fit-lines': maxLines,
      ...rest,
    },
    children,
  );
});

export default FitText;
