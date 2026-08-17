
import React from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};

const base =
  "inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background select-none min-w-0 max-w-full whitespace-normal break-words";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-primary-foreground border border-primary shadow-sm hover:bg-primary-600 hover:border-primary-600 active:bg-primary-700",
  secondary:
    "bg-surface text-foreground border border-border shadow-sm hover:bg-surface-secondary hover:border-border-strong",
  outline:
    "border border-border text-foreground bg-surface hover:bg-surface-secondary hover:border-primary hover:text-primary",
  ghost:
    "text-foreground border border-transparent bg-surface hover:bg-surface-secondary hover:border-border",
  destructive:
    "bg-destructive text-destructive-foreground border border-destructive shadow-sm hover:bg-danger-600 hover:border-danger-600",
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
