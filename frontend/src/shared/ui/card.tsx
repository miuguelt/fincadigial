import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/shared/ui/cn.ts"
import { useFitText } from "@/shared/hooks/useFitText"
import { mergeRefs } from "@/shared/lib/mergeRefs"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  premium?: boolean;
  hoverable?: boolean;
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps & HTMLMotionProps<"div">
>(({ className, selected, premium = true, hoverable = true, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={false}
      className={cn(
        "relative isolate h-full min-h-0 w-full overflow-hidden rounded-lg text-card-foreground",
        premium && [
          "border border-border/70 bg-card shadow-sm",
        ],
        !premium && "border border-border bg-card shadow-sm",
        selected ? [
          "z-10 ring-2 ring-primary/50 shadow-md",
          "border-primary/40"
        ] : "m-0",
        hoverable && !selected && "transition-[border-color,box-shadow] duration-150 hover:border-primary/30 hover:shadow-md",
        className
      )}
      {...props}
    >
      <div className="relative z-10 w-full h-full flex flex-col">{props.children}</div>
    </motion.div>
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 sm:p-6 text-card-foreground", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Renglones antes de encoger la letra. `0` desactiva el ajuste. */
  maxLines?: number;
  /** Suelo de reducción respecto a `text-2xl`. */
  minScale?: number;
}

/**
 * El título es `text-2xl` fijo y vive dentro de tarjetas de ancho variable, así
 * que es el sitio donde más se partían las palabras. Se ajusta solo: mientras
 * quepa conserva su tamaño, y si no cabe encoge en vez de cortar la palabra.
 * `maxLines={0}` lo desactiva para títulos que ya gestionan su propio tamaño.
 */
const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, maxLines = 1, minScale = 0.55, ...props }, ref) => {
    const fitRef = useFitText<HTMLHeadingElement>({
      maxLines: maxLines || 1,
      minScale,
      deps: [props.children],
    });
    const enabled = maxLines !== 0;
    return (
      <h3
        ref={enabled ? mergeRefs(ref, fitRef) : ref}
        className={cn(
          "text-2xl font-bold leading-none tracking-tight text-card-foreground/90 transition-colors duration-200",
          enabled && "fit-text",
          className
        )}
        {...props}
      />
    );
  }
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground/80 font-medium transition-colors duration-200", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // `pt-0` evita duplicar el espacio cuando viene después de un CardHeader;
  // `first:` lo restituye cuando el contenido es el primer hijo de la tarjeta.
  <div
    ref={ref}
    className={cn("p-5 sm:p-6 pt-0 first:pt-5 sm:first:pt-6 text-card-foreground/90", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 sm:p-6 border-t border-border/40 text-card-foreground/80", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
