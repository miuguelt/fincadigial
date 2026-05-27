/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background select-none relative overflow-hidden min-w-0 max-w-full whitespace-normal break-words";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-transform",
  secondary:
    "bg-card text-card-foreground border border-border/40 shadow-sm hover:-translate-y-0.5 hover:shadow-md rounded-full",
  outline:
    "border border-border/50 text-foreground bg-transparent hover:bg-primary/5 hover:text-primary hover:-translate-y-0.5 rounded-full",
  ghost:
    "text-muted-foreground hover:text-foreground bg-transparent hover:bg-primary/5 rounded-full",
  destructive:
    "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:-translate-y-0.5 rounded-full",
  link:
    "bg-transparent underline-offset-4 hover:underline text-primary hover:text-primary/80",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-6 text-base gap-2",
  icon: "h-9 w-9",
};

// Exported helper for compatibility with existing imports (e.g., buttonVariants in other components)
export function buttonVariants(options?: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string }) {
  const v = options?.variant ?? "primary";
  const s = options?.size ?? "md";
  return cn(base, variants[v], sizes[s], options?.className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", loading = false, children, disabled, ...props }, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], loading && "cursor-progress", className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" className="mr-2 text-current" />
          <span className="opacity-90">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}); Button.displayName = "Button";
export default Button;
