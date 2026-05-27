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
      layout
      initial={false}
      whileHover={hoverable && !selected ? { 
        y: -8, 
        scale: 1.01,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } 
      } : {}}
      className={cn(
        "relative w-full h-full min-h-full overflow-hidden transition-all duration-500 ease-emphasized isolate",
        // Base premium styles with "painted" borders and multi-layered shadows
        premium && [
          "bg-card/40 backdrop-blur-2xl rounded-lg",
          "border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12),0_20px_50px_rgba(0,0,0,0.2)]",
          "ring-1 ring-white/10" // Second "painted" inner border
        ],
        !premium && "bg-card border border-border shadow-md rounded-lg",
        
        // Selection logic: aggressive glow and elevation
        selected ? [
          "m-4 scale-[1.03] z-10",
          "ring-2 ring-primary/50 shadow-[0_0_50px_rgba(var(--primary-rgb),0.25),0_25px_60px_rgba(0,0,0,0.3)]",
          "border-primary/40"
        ] : "m-0",
        
        // Hover effects: lighting up the "painted" edge
        hoverable && !selected && "hover:bg-card/60 hover:border-white/40 hover:ring-white/20 hover:shadow-[0_30px_60px_rgba(0,0,0,0.3)]",
        
        "text-card-foreground",
        className
      )}
      {...props}
    >
      {/* Dynamic Light/Glow Effect */}
      {premium && (
        <>
          {/* Subtle top light highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-80" />
          
          {/* Main glass reflection/light sweep */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" />
            
            {/* Moving light spot for depth */}
            <motion.div 
              className="absolute -inset-[100%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_60%)] pointer-events-none"
              animate={{
                x: [0, 100, 0],
                y: [0, 50, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
          
          {/* Bottom shadow for inner depth */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none opacity-50" />
        </>
      )}
      
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
