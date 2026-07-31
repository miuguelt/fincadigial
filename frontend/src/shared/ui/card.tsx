import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"
import { cn } from "@/shared/ui/cn.ts"

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
        "relative isolate h-full min-h-full w-full overflow-hidden rounded-lg text-card-foreground",
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
    className={cn("flex flex-col space-y-1.5 p-0 text-card-foreground", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-bold leading-none tracking-tight text-card-foreground/90 transition-colors duration-200",
      className
    )}
    {...props}
  />
))
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
  <div ref={ref} className={cn("p-0 text-card-foreground/90", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-0 border-t border-white/5 text-card-foreground/80", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
