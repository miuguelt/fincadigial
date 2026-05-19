import React from "react";
import { Plus } from "lucide-react";

/**
 * EmptyState: estado vacío premium con tarjeta central, icono grande y botón prominente.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No hay usuarios"
 *   description="Crea el primero para comenzar"
 *   action={<Button onClick={onCreate}>Nuevo Usuario</Button>}
 * />
 * ```
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, className, icon }: EmptyStateProps) {
  return (
    <div
      className={["flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md mx-auto bg-card rounded-3xl shadow-lg border border-border/30 p-8 sm:p-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            {icon || <Plus className="h-10 w-10 text-primary" />}
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-[#111827] mb-2">{title}</h3>
        {description ? (
          <p className="text-sm text-[#6B7280] max-w-prose mx-auto mb-6">{description}</p>
        ) : null}
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export default EmptyState;